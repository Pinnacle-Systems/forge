# Story 004: Lookup Runtime Foundation

## Status
review

## Goal
Implement the platform-owned lookup, enrich, cache, and cascade orchestration runtime used by Sales Invoice customer, product, and barcode flows while remaining entity-agnostic.

## Source of Truth
- `docs/architecture.md`
- `docs/prd.md`
- `docs/decisions/adr-004-lookup-v1.0.md`
- `spec/platform/lookup-autofill.md`
- `spec/platform/transaction-grid.md`
- `spec/modules/sales/sales-invoice.md`
- `spec/modules/inventory/product-lookup.md`
- `_bmad-output/implementation-artifacts/stories/001-runtime-transaction-definition-contract.md`
- `_bmad-output/implementation-artifacts/stories/003-transaction-grid-row-engine.md`

## Constraints Applied
- Platform lookup runtime may orchestrate provider calls, caching, cascades, snapshots, and stale-response protection, but it must not contain product, customer, tax, invoice, or customer-specific semantics.
- Async work belongs in lookup, enrich, and validate flows, not calculations.
- UI and runtime orchestration consume only resolved definitions and row-engine snapshots; they must not inspect raw manifests or raw instance config.
- Lookup selection writes snapshot values into row metadata and committed row values through the row-engine external update API.
- Save-time validation must call provider validation or expose data needed for save orchestration to do so; cached lookup data is never save-authoritative.
- Cascade behavior supports `preserve`, `reset`, and `prompt`; default behavior is `preserve`.
- Preserved manual overrides may be marked stale in row metadata without dictating UI presentation.
- A per-row generation token prevents stale async lookup, resolve, and enrich responses from overwriting newer row state.
- Barcode is a specialized input path through the same lookup provider contract, not a separate business path.
- No specs, ADRs, or PRD files are modified by this story.

## Scope
- Add a platform `lookup-runtime` module.
- Define `LookupProvider` contract for `search`, `resolve`, `enrich`, and `validate`.
- Define provider request/response types, lookup selection payloads, lookup diagnostics, cascade metadata, cache entries, and orchestration result types.
- Implement `LookupRegistry` for deterministic provider registration, replacement prevention, lookup by provider ID, and missing-provider diagnostics.
- Implement `LookupCache` as a deterministic in-memory optimization for search, resolve, and enrich responses.
- Implement `CascadeEngine` with `preserve` as the default and explicit `reset` and `prompt` behavior.
- Implement lookup selection orchestration that writes snapshot metadata and committed values through `TransactionGridEngine.applyExternalRowUpdate`.
- Implement stale-field metadata for preserved manual overrides using existing `GridRowMetadata.stale`.
- Implement generation-token guards so out-of-order lookup, resolve, and enrich responses are ignored.
- Add focused unit tests for provider registration, missing providers, cache behavior, selection snapshots, cascade modes, stale metadata, and stale async protection.

## Out of Scope
- Inventory product provider implementation.
- Sales customer provider implementation.
- Sales Invoice calculation logic.
- Tax, price, discount, discontinued-item, or customer-credit business semantics.
- Save persistence and save orchestration UI.
- Rendering lookup popovers, stale indicators, prompts, or barcode scanner UI.
- Network transport or backend adapters.
- Modifying platform specs, ADRs, or PRD content.

## Dependencies
- Story 001: Runtime Transaction Definition Contract is complete and exposes `TransactionElementId`, `ResolvedField`, `ResolvedGridColumn`, and `HookRef`.
- Story 003: TransactionGrid Row Engine is complete and exposes `TransactionGridEngine`, `GridRow`, `GridValue`, `LookupSnapshotValue`, `QueuedExternalUpdate`, and row metadata containers.
- Story 005 will implement concrete Sales and Inventory providers against this contract.

## Exact File Structure
Create the lookup runtime under the platform package:

```text
packages/
  platform/
    src/
      lookup-runtime/
        index.ts
        types.ts
        LookupRegistry.ts
        LookupCache.ts
        CascadeEngine.ts
        applyLookupSelection.ts
        runLookupRequest.ts
        __tests__/
          fixtures/
            lookupProviders.fixture.ts
            lookupRows.fixture.ts
          LookupRegistry.test.ts
          LookupCache.test.ts
          CascadeEngine.test.ts
          applyLookupSelection.test.ts
          generationTokenProtection.test.ts
```

Also update:
- `packages/platform/src/index.ts`
- `packages/platform/package.json`

Do not place lookup runtime files in a Sales, Inventory, or UI package.

## Public API
Export the lookup runtime from `packages/platform/src/lookup-runtime/index.ts`:

```ts
export type {
  CascadeDecision,
  CascadeFieldRule,
  CascadeMode,
  CascadePlan,
  CascadeResult,
  LookupCacheKey,
  LookupCacheOptions,
  LookupDiagnostic,
  LookupEnrichRequest,
  LookupOperationContext,
  LookupProvider,
  LookupProviderId,
  LookupResolveRequest,
  LookupResult,
  LookupRuntimeSelection,
  LookupSearchRequest,
  LookupSelectionResult,
  LookupValidationIssue,
  LookupValidationRequest,
  LookupValidationResult,
} from './types';

export { LookupRegistry } from './LookupRegistry';
export { LookupCache } from './LookupCache';
export { CascadeEngine } from './CascadeEngine';
export { applyLookupSelection } from './applyLookupSelection';
export { runLookupRequest } from './runLookupRequest';
```

Export the same symbols from `packages/platform/src/index.ts`.

Add an export path to `packages/platform/package.json`:

```json
"./lookup-runtime": "./src/lookup-runtime/index.ts"
```

## Runtime Types
Implement the minimum contracts in `types.ts`. Names may be adjusted only to fit established repo conventions; preserve the contract meaning.

```ts
import type {
  GridValue,
  TransactionElementId,
} from '../transaction-grid';

export type LookupProviderId = string;
export type CascadeMode = 'preserve' | 'reset' | 'prompt';

export interface LookupOperationContext {
  rowId?: string;
  fieldId: TransactionElementId;
  rowValues?: Record<TransactionElementId, GridValue>;
  headerValues?: Record<TransactionElementId, GridValue>;
  generation: number;
  signal?: AbortSignal;
}

export interface LookupSearchRequest {
  query: string;
  context: LookupOperationContext;
}

export interface LookupResolveRequest {
  entityId: string;
  context: LookupOperationContext;
}

export interface LookupEnrichRequest {
  entityId: string;
  snapshotValues: Record<TransactionElementId, GridValue>;
  context: LookupOperationContext;
}

export interface LookupValidationRequest {
  entityId: string;
  snapshotValues: Record<TransactionElementId, GridValue>;
  context: Omit<LookupOperationContext, 'generation'>;
}

export interface LookupResult {
  entityId: string;
  label?: string;
  values: Record<TransactionElementId, GridValue>;
  metadata?: Record<string, unknown>;
}

export interface LookupValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  code?: string;
}

export interface LookupValidationResult {
  valid: boolean;
  issues: LookupValidationIssue[];
}

export type LookupCacheOperation = 'search' | 'resolve' | 'enrich';

export interface LookupCacheKey {
  providerId: LookupProviderId;
  operation: LookupCacheOperation;
  fieldId: TransactionElementId;
  query?: string;
  entityId?: string;
  context?: Record<string, GridValue>;
}

export interface LookupCacheOptions {
  ttlMs?: number;
  now?: () => number;
}

export interface LookupProvider {
  id: LookupProviderId;
  search(request: LookupSearchRequest): Promise<LookupResult[]>;
  resolve(request: LookupResolveRequest): Promise<LookupResult | undefined>;
  enrich?(request: LookupEnrichRequest): Promise<Record<TransactionElementId, GridValue>>;
  validate(request: LookupValidationRequest): Promise<LookupValidationResult>;
}

export interface LookupDiagnostic {
  severity: 'warning' | 'error';
  code:
    | 'PROVIDER_ALREADY_REGISTERED'
    | 'PROVIDER_NOT_FOUND'
    | 'STALE_LOOKUP_RESPONSE_IGNORED';
  providerId?: LookupProviderId;
  message: string;
}

export interface CascadeFieldRule {
  targetFieldId: TransactionElementId;
  mode?: CascadeMode;
}

export interface CascadePlan {
  sourceFieldId: TransactionElementId;
  rules: CascadeFieldRule[];
}

export interface CascadeDecision {
  targetFieldId: TransactionElementId;
  mode: CascadeMode;
  currentValue: GridValue;
  incomingValue: GridValue;
  action: 'write' | 'clear' | 'preserve' | 'prompt';
  markStale: boolean;
}

export interface CascadeResult {
  valuesToWrite: Record<TransactionElementId, GridValue>;
  valuesToClear: TransactionElementId[];
  preservedStaleFields: TransactionElementId[];
  prompts: CascadeDecision[];
}

export interface LookupRuntimeSelection {
  providerId: LookupProviderId;
  fieldId: TransactionElementId;
  rowId: string;
  result: LookupResult;
  cascadePlan?: CascadePlan;
}

export interface LookupSelectionResult {
  applied: boolean;
  diagnostics: LookupDiagnostic[];
  cascade: CascadeResult;
}
```

If this implementation needs a small wrapper around `TransactionGridEngine` because metadata writes are not currently expressive enough, extend the row-engine API minimally and test that extension. Do not bypass row-engine invariants by mutating snapshots returned from `getSnapshot()`.

## Required Behavior

### Lookup Registry
- `register(provider)` stores providers by `provider.id`.
- Registering the same provider ID twice must fail deterministically by throwing an error or returning a diagnostic. Pick one behavior and test it.
- `get(providerId)` returns the provider when registered.
- `require(providerId)` returns the provider or produces a missing-provider diagnostic with code `PROVIDER_NOT_FOUND`.
- Registry iteration, if exposed, must be deterministic by provider ID insertion order.
- Registry must not special-case Sales, Inventory, product, customer, barcode, or tax provider IDs.

### Lookup Cache
- Cache is an optimization for lookup calls only.
- Cache keys must include provider ID, operation, field ID, query or entity ID, and deterministic context data that affects provider output.
- Cache must clone returned values so callers cannot mutate cached state.
- Cache must support explicit `get`, `set`, `delete`, and `clear`.
- Cache may support TTL, but tests must not rely on real clock timing. If TTL is implemented, inject a `now` function.
- Cache must not be used as proof that save-time validation passed.

### Cascade Engine
- `preserve` is the default when a rule does not specify a mode.
- `preserve` keeps a non-empty current value when the incoming value differs and marks the target field stale.
- `preserve` writes the incoming value when the current value is empty.
- `reset` replaces the target field with the incoming value, including clearing when incoming value is empty.
- `prompt` does not write immediately when a non-empty current value conflicts; it returns a prompt decision for UI/save orchestration.
- Cascade rules operate only on field IDs and values. They must not infer business meaning from IDs such as `price`, `taxCode`, or `product`.
- Stale metadata uses `reason: 'preserved-manual-override'` and references the source lookup field.

### Selection Snapshot Writes
- Applying a selection writes:
  - selected lookup field value from `result.values[fieldId]` when present, otherwise `result.entityId`;
  - additional snapshot values from `result.values`;
  - `metadata.lookupSnapshots[fieldId]` with provider ID, entity ID, label, values, and captured row revision;
  - `metadata.autofill` entries for values written by lookup or cascade.
- Selection must use `TransactionGridEngine.applyExternalRowUpdate` so phantom-row creation, dirty state, queued external updates, and generation checks stay centralized.
- Applying a lookup selection to the phantom row may materialize it exactly as any other external update would; the one-phantom-row invariant must still hold.
- Selection must return diagnostics rather than silently ignoring missing rows or stale generations.

### Generation Token Protection
- Lookup orchestration captures the row generation before starting async `search`, `resolve`, or `enrich`.
- Before applying async results, compare the captured generation with the current row generation.
- If generation changed, do not apply values or snapshots; return or emit `STALE_LOOKUP_RESPONSE_IGNORED`.
- Queued updates during an active grid edit must still use the captured generation so Story 003 concurrent edit protection can ignore stale queued updates after local commit.
- Tests must prove a slow first lookup cannot overwrite a newer lookup or manual row edit.

### Validation Contract
- Provider `validate` is part of the contract because save-time validation rechecks authoritative backend rules.
- This story does not implement save orchestration, but tests must verify cached `resolve` or `enrich` values are not treated as validation success.
- Validation request types must include entity ID, snapshot values, and operation context but must not require Sales-specific fields.

## Required Tests
- `LookupRegistry.test.ts`
  - registers and retrieves providers by ID.
  - prevents or diagnoses duplicate provider registration.
  - reports missing providers with `PROVIDER_NOT_FOUND`.
- `LookupCache.test.ts`
  - returns cloned cached lookup data.
  - keys entries by provider, operation, field, query/entity, and relevant context.
  - clears and deletes entries deterministically.
  - does not expose validation-success state.
- `CascadeEngine.test.ts`
  - defaults unspecified rules to `preserve`.
  - preserve writes into empty targets.
  - preserve keeps conflicting non-empty targets and marks stale.
  - reset replaces existing values.
  - prompt returns prompt decisions without writing conflicting values.
- `applyLookupSelection.test.ts`
  - writes lookup field values and additional snapshot values through the grid engine.
  - writes `metadata.lookupSnapshots`, `metadata.autofill`, and `metadata.stale` as needed.
  - preserves the one-phantom-row invariant after selection on the phantom row.
  - stays entity-agnostic by using neutral fixture IDs and fields.
- `generationTokenProtection.test.ts`
  - ignores out-of-order async resolve/enrich response after row generation changes.
  - ignores stale queued external update after an active edit commits.
  - allows current-generation response to apply.

## Suggested Fixtures
- Use neutral provider IDs such as `fixture.entity` and neutral fields such as `lookupField`, `description`, `dependentValue`, and `manualOverride`.
- Reuse `resolvedSalesInvoiceGridColumns` only when testing integration with existing grid shape. Do not assert Sales business behavior.
- Use controllable promises for stale async tests so test order is deterministic.

## Implementation Notes
- Prefer pure functions for cascade decisions; this makes preserve/reset/prompt behavior easy to test without a grid engine.
- Keep metadata presentation-neutral. The UI can decide how to render stale or prompt indicators later.
- Use `structuredClone` or existing clone patterns when returning cached values, diagnostics, selections, and grid-facing updates.
- If adding row-engine metadata update capability, keep it generic, for example applying a row metadata patch for lookup snapshots/autofill/stale annotations. Do not add lookup-provider code inside `transaction-grid`.
- Keep thrown errors and diagnostic messages stable enough for tests, but assert primarily on diagnostic codes and provider IDs.

## Risks
- Delayed lookup responses overwrite newer row edits.
- Cascade logic becomes product-specific through field ID assumptions.
- Cache behavior accidentally masks stale authoritative backend state.
- Snapshot metadata is written outside the row engine and breaks phantom-row or dirty-state invariants.
- Prompt cascade mode is implemented as UI behavior instead of returning a platform-neutral decision.

## Acceptance Criteria
- `LookupProvider`, `LookupRegistry`, `LookupCache`, and `CascadeEngine` are implemented and exported from the platform package.
- Lookup selection writes committed values and lookup snapshot metadata into the target row through the row-engine integration.
- Preserve cascade is the default behavior.
- Preserved manual overrides can be marked stale using generic row metadata.
- Out-of-order async lookup, resolve, or enrich responses cannot overwrite newer row state.
- Cached lookup data remains an optimization and cannot satisfy save-time validation.
- Tests cover provider registration, missing-provider diagnostics, cache behavior, selection snapshots, cascade modes, stale metadata, and generation-token protection.
- No product, customer, tax, invoice, or customer-specific business semantics exist in platform lookup runtime.
- No specs, ADRs, or PRD files are modified.

## Definition of Done
- Behavior matches `lookup-autofill.md`, `transaction-grid.md`, and ADR-004.
- Lookup runtime contracts and orchestration are implemented in `packages/platform/src/lookup-runtime`.
- Platform root exports and package export map include lookup runtime.
- Unit tests pass with `pnpm test`.
- Type checking passes with `pnpm typecheck`.
- No contract violations are introduced.
- Notes are added to the story or follow-up backlog only if implementation discovers a real spec gap.
