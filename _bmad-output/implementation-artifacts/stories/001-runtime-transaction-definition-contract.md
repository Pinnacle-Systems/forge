# Story 001: Runtime Transaction Definition Contract

## Status
review

## Goal
Establish the minimal platform runtime contract that turns module-owned `TransactionManifest` plus database-owned `TransactionInstanceConfig` into a UI-safe `ResolvedTransactionDefinition`.

## Source of Truth
- `docs/architecture.md`
- `docs/prd.md`
- `docs/decisions/adr-001-form-definition-strategy.md`
- `docs/decisions/adr-002-two-layer-contract.md`
- `spec/platform/manifest-contract.md`
- `spec/platform/instance-config-contract.md`
- `spec/platform/merge-engine.md`
- `spec/modules/sales/sales-invoice.md`

## Constraints Applied
- UI consumes only `ResolvedTransactionDefinition`, never raw manifest or raw instance config.
- Manifest defines deterministic structure and allowed overrides only.
- Instance config can only change `visible`, `label`, `width`, `editable`, `required`, and `order`.
- Each config change is allowed only when the target manifest element grants that property through `overridePermissions`.
- Instance config cannot alter calculations, validations, lookup providers, workflow transitions, persistence rules, hook references, field IDs, field kinds, or grid behavior.
- Invalid manifest fails fast with a thrown manifest validation error.
- Invalid config degrades gracefully: ignore the invalid override, emit a warning diagnostic, and continue resolution.
- Incompatible manifest/config versions fail hard before resolution.
- Unknown config target IDs are ignored with warning diagnostics.
- Resolved output is normalized and sorted before rendering.
- No customer-specific branching in platform code.

## Scope
- Define runtime types for transaction manifests, instance configs, override permissions, diagnostics, and resolved transaction definitions.
- Implement manifest validation for the minimum transaction surface needed by the Sales Invoice vertical slice.
- Implement merge validation and override enforcement.
- Expose a resolved-definition-only API for UI consumers.
- Add tests for valid resolution, invalid manifest fail-fast behavior, invalid config warning behavior, and disallowed business-logic override attempts.

## Out of Scope
- Sales Invoice manifest implementation beyond test fixtures.
- Sales-specific calculations.
- Lookup runtime search, resolve, enrich, or save-time validation behavior.
- TransactionGrid row, keyboard, phantom-row, validation-navigation, or persistence behavior.
- UI rendering components.
- Database persistence for instance config.

## Dependencies
- None.

## Exact File Structure
Create the platform runtime scaffold if it does not already exist:

```text
packages/
  platform/
    src/
      runtime-definition/
        index.ts
        types.ts
        errors.ts
        validateManifest.ts
        validateInstanceConfig.ts
        mergeTransactionDefinition.ts
        sortResolvedDefinition.ts
        __tests__/
          fixtures/
            salesInvoiceManifest.fixture.ts
            instanceConfigs.fixture.ts
          mergeTransactionDefinition.test.ts
          validateManifest.test.ts
          validateInstanceConfig.test.ts
```

If the repository already has a TypeScript package layout when implementation starts, keep the same module boundary but adapt these paths to the existing platform package. Do not place these files in a Sales module or UI package.

## Public API
Export only the runtime contract and resolver from `packages/platform/src/runtime-definition/index.ts`:

```ts
export type {
  TransactionManifest,
  TransactionInstanceConfig,
  ResolvedTransactionDefinition,
  MergeDiagnostic,
  OverridePermissions,
} from './types';

export {
  ManifestValidationError,
  ConfigValidationWarning,
  ConfigVersionMismatchError,
} from './errors';

export {
  mergeTransactionDefinition,
} from './mergeTransactionDefinition';
```

UI-facing code must import `ResolvedTransactionDefinition` and `mergeTransactionDefinition`. It must not receive or render directly from `TransactionManifest` or `TransactionInstanceConfig`.

## Runtime Types
Implement these minimum types in `types.ts`. Keep names stable unless existing repo conventions require a narrower naming adjustment.

```ts
export type TransactionElementId = string;
export type HookRef = string;
export type SchemaVersion = string;

export type OverrideProperty =
  | 'visible'
  | 'label'
  | 'width'
  | 'editable'
  | 'required'
  | 'order';

export type OverridePermissions = Partial<Record<OverrideProperty, boolean>>;

export type BusinessLogicOverrideProperty =
  | 'calculationRef'
  | 'validationRefs'
  | 'lookupProviderRef'
  | 'cascadeRefs'
  | 'hooks'
  | 'persistence'
  | 'kind'
  | 'id';

export type DiagnosticProperty =
  | OverrideProperty
  | BusinessLogicOverrideProperty
  | (string & {});

export type FieldKind =
  | 'text'
  | 'date'
  | 'number'
  | 'currency'
  | 'lookup';

export type MergeDiagnosticSeverity = 'warning';

export interface MergeDiagnostic {
  severity: MergeDiagnosticSeverity;
  code:
    | 'UNKNOWN_TARGET'
    | 'UNKNOWN_OVERRIDE_PROPERTY'
    | 'OVERRIDE_NOT_PERMITTED'
    | 'BUSINESS_LOGIC_OVERRIDE_IGNORED'
    | 'INVALID_OVERRIDE_VALUE'
    | 'MANIFEST_VERSION_MISMATCH';
  targetId?: TransactionElementId;
  property?: DiagnosticProperty;
  message: string;
}

export interface BaseManifestElement {
  id: TransactionElementId;
  label: string;
  visible?: boolean;
  editable?: boolean;
  required?: boolean;
  order?: number;
  overridePermissions?: OverridePermissions;
}

export interface ManifestField extends BaseManifestElement {
  kind: FieldKind;
  width?: number;
  lookupProviderRef?: HookRef;
  calculationRef?: HookRef;
  validationRefs?: HookRef[];
}

export interface ManifestGridColumn extends ManifestField {
  cascadeRefs?: HookRef[];
}

export interface ManifestFooterField extends BaseManifestElement {
  kind: 'currency' | 'number';
  calculationRef?: HookRef;
}

export type ManifestElementIndex = Record<
  TransactionElementId,
  ManifestField | ManifestGridColumn | ManifestFooterField
>;

export interface TransactionManifest {
  transactionType: string;
  schemaVersion: SchemaVersion;
  title: string;
  header: {
    fields: ManifestField[];
  };
  grid: {
    columns: ManifestGridColumn[];
  };
  footer: {
    fields: ManifestFooterField[];
  };
  hooks?: {
    calculations?: HookRef[];
    validations?: HookRef[];
    lookupProviders?: HookRef[];
    persistence?: HookRef;
  };
}

export interface InstanceOverride {
  visible?: boolean;
  label?: string;
  width?: number;
  editable?: boolean;
  required?: boolean;
  order?: number;
}

export interface TransactionInstanceConfig {
  transactionType: string;
  targetManifestVersion?: SchemaVersion;
  overrides?: Record<TransactionElementId, InstanceOverride>;
}

export interface ResolvedField {
  id: TransactionElementId;
  label: string;
  kind: FieldKind;
  visible: boolean;
  editable: boolean;
  required: boolean;
  order: number;
  width?: number;
  lookupProviderRef?: HookRef;
  calculationRef?: HookRef;
  validationRefs: HookRef[];
}

export interface ResolvedGridColumn extends ResolvedField {
  cascadeRefs: HookRef[];
}

export interface ResolvedFooterField {
  id: TransactionElementId;
  label: string;
  kind: 'currency' | 'number';
  visible: boolean;
  editable: boolean;
  required: boolean;
  order: number;
  calculationRef?: HookRef;
}

export interface ResolvedTransactionDefinition {
  transactionType: string;
  schemaVersion: SchemaVersion;
  title: string;
  header: {
    fields: ResolvedField[];
  };
  grid: {
    columns: ResolvedGridColumn[];
  };
  footer: {
    fields: ResolvedFooterField[];
  };
  hooks: {
    calculations: HookRef[];
    validations: HookRef[];
    lookupProviders: HookRef[];
    persistence?: HookRef;
  };
  diagnostics: MergeDiagnostic[];
}
```

Implementation note: persisted/database config is still untrusted at runtime. Validators must tolerate wider raw input at the boundary when necessary, but the committed application contract exposes only `InstanceOverride` as the valid override shape.

## Function Signatures
Implement these functions with deterministic behavior:

```ts
// errors.ts
export class ManifestValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]);
}

export class ConfigValidationWarning extends Error {
  readonly diagnostics: MergeDiagnostic[];

  constructor(diagnostics: MergeDiagnostic[]);
}
```

```ts
// validateManifest.ts
export function validateManifest(manifest: TransactionManifest): void;
```

Rules:
- Throw `ManifestValidationError` for any manifest issue.
- Require `transactionType`, `schemaVersion`, `title`, `header.fields`, `grid.columns`, and `footer.fields`.
- Require every field/column/footer element to have `id`, `label`, `kind`, and stable numeric `order`.
- Require IDs to be unique across header fields, grid columns, and footer fields.
- Require lookup fields with `lookupProviderRef` to list that provider in `hooks.lookupProviders`.
- Require elements with `calculationRef` to list that calculation in `hooks.calculations`.
- Require each `validationRefs` entry to be listed in `hooks.validations`.
- Reject unsupported `kind` values.
- Reject unsupported `overridePermissions` keys.
- Reject non-boolean `overridePermissions` values.

```ts
// validateInstanceConfig.ts
export function validateInstanceConfig(
  config: TransactionInstanceConfig | undefined,
  manifest: TransactionManifest,
): MergeDiagnostic[];
```

Rules:
- Never throw for invalid config.
- Treat persisted config as untrusted even though the application-level type is `TransactionInstanceConfig`.
- Return warning diagnostics for stale, unknown, unauthorized, or invalid override entries.
- Include `property` on diagnostics caused by a specific override key; omit it only for whole-config or target-level diagnostics.
- Warn and ignore config when `config.transactionType` does not equal `manifest.transactionType`.
- Warn and ignore unknown target IDs.
- Warn and ignore override keys outside the allowed set: `visible`, `label`, `width`, `editable`, `required`, `order`.
- Warn and ignore allowed keys unless the target element has `overridePermissions[key] === true`.
- Warn and ignore attempts to override business behavior, including `calculationRef`, `validationRefs`, `lookupProviderRef`, `cascadeRefs`, `hooks`, `persistence`, `kind`, or `id`.
- Warn and ignore invalid values:
  - `visible`, `editable`, `required`: must be boolean.
  - `label`: must be a non-empty string.
  - `width`: must be a positive finite number.
  - `order`: must be a finite number.

```ts
// mergeTransactionDefinition.ts
export function mergeTransactionDefinition(
  manifest: TransactionManifest,
  config?: TransactionInstanceConfig,
): ResolvedTransactionDefinition;
```

Rules:
- Call `validateManifest` first and fail fast on manifest errors.
- Call `validateInstanceConfig` and collect warning diagnostics.
- Fail hard when `targetManifestVersion` is incompatible with manifest `schemaVersion`.
- Build a flat manifest element index by `id` before applying overrides.
- Deep clone manifest-derived structures before applying overrides; never mutate manifest or config inputs.
- Apply only valid, authorized presentation overrides.
- Preserve all business hook references from the manifest.
- Normalize defaults:
  - `visible`: default `true`.
  - `editable`: default `true`.
  - `required`: default `false`.
  - `validationRefs`: default `[]`.
  - `cascadeRefs`: default `[]`.
  - `hooks.calculations`: default `[]`.
  - `hooks.validations`: default `[]`.
  - `hooks.lookupProviders`: default `[]`.
- Sort header fields, grid columns, and footer fields by ascending `order`; use `id` as deterministic tie breaker.
- Return a resolved definition that does not expose `overridePermissions`, raw config values, or raw manifest-only metadata.

Execution order:
1. `validateManifest(manifest)`.
2. `validateInstanceConfig(config, manifest)`.
3. Initialize the resolved definition from manifest-derived structures.
4. Apply only valid, authorized overrides using the flat element index.
5. Normalize defaults.
6. Call `sortResolvedDefinition`.
7. Attach diagnostics to the returned resolved definition.

```ts
// sortResolvedDefinition.ts
export function sortResolvedDefinition(
  definition: ResolvedTransactionDefinition,
): ResolvedTransactionDefinition;
```

Rules:
- Sort each renderable collection by `order`, then `id`.
- Sorting must be deterministic and stable across runs for identical inputs.
- Do not mutate the input object.

## Step-by-Step Implementation Tasks
- [x] Create the `packages/platform/src/runtime-definition/` folder and barrel export.
- [x] Add `types.ts` with the minimum manifest, config, diagnostics, and resolved definition types listed above.
- [x] Add `errors.ts` with `ManifestValidationError` and `ConfigValidationWarning`.
- [x] Implement `validateManifest.ts`.
- [x] Implement `validateInstanceConfig.ts`.
- [x] Implement `sortResolvedDefinition.ts`.
- [x] Implement `mergeTransactionDefinition.ts`.
- [x] Add test fixtures:
   - `salesInvoiceManifest.fixture.ts`: a valid Sales Invoice-like manifest with header `customer`, `invoiceDate`, `reference`; grid `product`, `quantity`, `unitPrice`, `taxCode`, `lineTotal`; footer `subtotal`, `taxTotal`, `grandTotal`.
   - `instanceConfigs.fixture.ts`: empty config, valid presentation config, unknown target config, unauthorized override config, business-logic override config, and invalid value config.
- [x] Add unit tests for valid merge behavior.
- [x] Add unit tests for invalid manifest fail-fast behavior.
- [x] Add unit tests for invalid config warning and ignore behavior.
- [x] Add unit tests proving business logic cannot be changed through instance config.
- [x] Verify the platform exports only resolved-definition APIs from the runtime-definition barrel.
- [x] Run the repository test command. A minimal pnpm TypeScript/Vitest scaffold was added because the repo did not yet have one.

## Explicit Test Cases

### `mergeTransactionDefinition.test.ts`
- Resolves a valid Sales Invoice manifest with no config.
  - Expects resolved `transactionType`, `schemaVersion`, and `title` to match manifest.
  - Expects header fields, grid columns, and footer fields to be sorted by `order`.
  - Expects default `visible: true`, `editable: true`, `required: false`.
  - Expects `diagnostics` to be empty.
- Applies authorized presentation overrides.
  - Config changes `label`, `visible`, `width`, `editable`, `required`, and `order` only where permitted.
  - Expects those values to appear in the resolved definition.
  - Expects unrelated fields and business hook references to remain unchanged.
- Does not mutate manifest or config inputs.
- Does not expose `overridePermissions` on any resolved field, column, or footer field.
- Preserves module hook references.
  - Expects calculation refs, validation refs, lookup provider refs, and persistence hook to equal manifest-defined values after resolution.
- Sorts deterministically when two elements have the same `order`.
  - Expects ID lexical ordering as the tie breaker.

### `validateManifest.test.ts`
- Throws `ManifestValidationError` when `transactionType` is missing.
- Throws when `header.fields`, `grid.columns`, or `footer.fields` are missing or not arrays.
- Throws when any element is missing `id`, `label`, `kind`, or numeric `order`.
- Throws when duplicate IDs appear across header, grid, and footer.
- Throws when an unsupported field `kind` is used.
- Throws when `overridePermissions` includes an unsupported key such as `calculationRef`.
- Throws when an `overridePermissions` value is not boolean.
- Throws when a lookup field references a provider not declared in `hooks.lookupProviders`.
- Throws when a calculated field references a calculation not declared in `hooks.calculations`.
- Throws when a field references a validation not declared in `hooks.validations`.

### `validateInstanceConfig.test.ts`
- Returns no diagnostics for `undefined` config.
- Returns no diagnostics for empty config with matching `transactionType`.
- Warns and ignores config with mismatched `transactionType`.
- Warns with `UNKNOWN_TARGET` for an override target ID not present in the manifest.
- Warns with `UNKNOWN_OVERRIDE_PROPERTY` for a non-contract key such as `placeholder`.
- Warns with `OVERRIDE_NOT_PERMITTED` when config changes an allowed property that the target did not grant through `overridePermissions`.
- Warns with `INVALID_OVERRIDE_VALUE` for invalid values:
  - `visible: 'yes'`
  - `editable: 'false'`
  - `required: 1`
  - `label: ''`
  - `width: -10`
  - `order: Number.NaN`
- Warns with `BUSINESS_LOGIC_OVERRIDE_IGNORED` for attempted changes to:
  - `calculationRef`
  - `validationRefs`
  - `lookupProviderRef`
  - `cascadeRefs`
  - `hooks`
  - `persistence`
  - `kind`
  - `id`

### Business Logic Protection Tests
- Config cannot change `lineTotal.calculationRef`.
- Config cannot change footer total calculation refs.
- Config cannot add or remove `validationRefs`.
- Config cannot change `customer.lookupProviderRef` or `product.lookupProviderRef`.
- Config cannot change persistence hook references.
- Config cannot change a field from `lookup` to `text`.
- Config cannot retarget an override by changing an element `id`.
- All disallowed attempts produce warning diagnostics and the resolved definition remains equal to the manifest-defined business hooks.

## Fixture Shape
The Sales Invoice fixture must include only hook references, not hook implementations:

```ts
export const salesInvoiceManifest: TransactionManifest = {
  transactionType: 'sales.invoice',
  schemaVersion: '1.0.0',
  title: 'Sales Invoice',
  hooks: {
    calculations: [
      'sales.invoice.calculateLineTotal',
      'sales.invoice.calculateSubtotal',
      'sales.invoice.calculateTaxTotal',
      'sales.invoice.calculateGrandTotal',
    ],
    validations: [
      'sales.invoice.validateCustomer',
      'sales.invoice.validateProduct',
      'sales.invoice.validateDiscontinuedItems',
    ],
    lookupProviders: [
      'sales.customer',
      'inventory.product',
    ],
    persistence: 'sales.invoice.save',
  },
  header: {
    fields: [
      {
        id: 'customer',
        label: 'Customer',
        kind: 'lookup',
        order: 10,
        lookupProviderRef: 'sales.customer',
        validationRefs: ['sales.invoice.validateCustomer'],
        overridePermissions: { label: true, visible: true, required: true, order: true },
      },
      {
        id: 'invoiceDate',
        label: 'Invoice Date',
        kind: 'date',
        order: 20,
        required: true,
        overridePermissions: { label: true, required: true, order: true },
      },
      {
        id: 'reference',
        label: 'Reference',
        kind: 'text',
        order: 30,
        overridePermissions: { label: true, visible: true, order: true },
      },
    ],
  },
  grid: {
    columns: [
      {
        id: 'product',
        label: 'Product',
        kind: 'lookup',
        order: 10,
        lookupProviderRef: 'inventory.product',
        validationRefs: ['sales.invoice.validateProduct'],
        overridePermissions: { label: true, width: true, order: true },
      },
      {
        id: 'quantity',
        label: 'Quantity',
        kind: 'number',
        order: 20,
        overridePermissions: { label: true, width: true, editable: true, required: true, order: true },
      },
      {
        id: 'unitPrice',
        label: 'Unit Price',
        kind: 'currency',
        order: 30,
        overridePermissions: { label: true, width: true, editable: true, order: true },
      },
      {
        id: 'taxCode',
        label: 'Tax Code',
        kind: 'lookup',
        order: 40,
        overridePermissions: { label: true, width: true, order: true },
      },
      {
        id: 'lineTotal',
        label: 'Line Total',
        kind: 'currency',
        order: 50,
        editable: false,
        calculationRef: 'sales.invoice.calculateLineTotal',
        overridePermissions: { label: true, width: true, visible: true, order: true },
      },
    ],
  },
  footer: {
    fields: [
      {
        id: 'subtotal',
        label: 'Subtotal',
        kind: 'currency',
        order: 10,
        calculationRef: 'sales.invoice.calculateSubtotal',
        overridePermissions: { label: true, visible: true, order: true },
      },
      {
        id: 'taxTotal',
        label: 'Tax Total',
        kind: 'currency',
        order: 20,
        calculationRef: 'sales.invoice.calculateTaxTotal',
        overridePermissions: { label: true, visible: true, order: true },
      },
      {
        id: 'grandTotal',
        label: 'Grand Total',
        kind: 'currency',
        order: 30,
        calculationRef: 'sales.invoice.calculateGrandTotal',
        overridePermissions: { label: true, visible: true, order: true },
      },
    ],
  },
};
```

## Acceptance Criteria
- A valid Sales Invoice-like manifest plus no config resolves into a `ResolvedTransactionDefinition`.
- A valid Sales Invoice-like manifest plus authorized presentation config resolves with those presentation overrides applied.
- Invalid manifests throw `ManifestValidationError` before any merge output is returned.
- Invalid config entries are ignored with warning diagnostics while valid config entries continue to apply.
- Unknown target IDs are ignored with warnings.
- Unauthorized overrides are ignored with warnings.
- Business logic override attempts are ignored with warnings.
- Resolved definitions never expose raw config or `overridePermissions`.
- Tests prove instance config cannot alter calculations, validations, lookup provider refs, persistence refs, IDs, or field kinds.
- No specs or ADRs are modified.

## Definition of Done
- Runtime definition contract files exist in the platform package.
- Merge validation and override enforcement are implemented.
- Public runtime-definition exports are limited to types, resolver, and errors needed by platform/UI integration.
- Tests cover valid resolution, invalid manifest failure, invalid config handling, unknown targets, unauthorized overrides, business-logic override attempts, sorting, defaults, and immutability.
- Any implementation gap caused by missing repo build/test scaffold is documented in this story or implementation notes.
- No customer-specific branching is introduced.

## Dev Agent Record

### Constraints Summary
- UI-facing consumers receive `ResolvedTransactionDefinition`, not raw manifest or raw instance config.
- Manifest validation fails hard through `ManifestValidationError`.
- Instance config validation warns and continues through merge diagnostics.
- Only `visible`, `label`, `width`, `editable`, `required`, and `order` can be applied, and only when granted by `overridePermissions`.
- Business hook references, element IDs, and field kinds are preserved from the manifest.

### Implementation Plan
- Added a minimal pnpm monorepo with TypeScript and Vitest.
- Implemented platform runtime-definition types, errors, manifest validation, config validation, deterministic sorting, and merge resolution.
- Used the real Sales module manifest as the Sales Invoice fixture source to prevent fixture drift with Story 002.
- Covered merge behavior, validation failures, config warnings, business-logic protection, default normalization, deterministic sorting, immutability, and resolved-output shape.

### Debug Log
- `pnpm test` initially failed before dependencies were installed because `vitest` was missing.
- `pnpm install` required elevated permissions because pnpm writes to the user-level store outside the workspace sandbox.
- First test run exposed that authorized `width` overrides were not applied when the resolved field did not already have a `width` property. Fixed merge override application to allow field/grid widths to be introduced by config.

### Completion Notes
- Runtime definition contract is implemented under `packages/platform/src/runtime-definition`.
- Invalid manifests throw `ManifestValidationError`; invalid config entries emit warning diagnostics and valid entries still apply.
- Resolved output does not expose raw config or `overridePermissions`.
- Story 001 tests pass with the Story 002 canonical Sales Invoice manifest fixture.

### File List
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `vitest.config.ts`
- `packages/platform/package.json`
- `packages/platform/src/index.ts`
- `packages/platform/src/runtime-definition/index.ts`
- `packages/platform/src/runtime-definition/types.ts`
- `packages/platform/src/runtime-definition/errors.ts`
- `packages/platform/src/runtime-definition/validateManifest.ts`
- `packages/platform/src/runtime-definition/validateInstanceConfig.ts`
- `packages/platform/src/runtime-definition/sortResolvedDefinition.ts`
- `packages/platform/src/runtime-definition/mergeTransactionDefinition.ts`
- `packages/platform/src/runtime-definition/__tests__/fixtures/salesInvoiceManifest.fixture.ts`
- `packages/platform/src/runtime-definition/__tests__/fixtures/instanceConfigs.fixture.ts`
- `packages/platform/src/runtime-definition/__tests__/mergeTransactionDefinition.test.ts`
- `packages/platform/src/runtime-definition/__tests__/validateManifest.test.ts`
- `packages/platform/src/runtime-definition/__tests__/validateInstanceConfig.test.ts`
- `_bmad-output/implementation-artifacts/stories/001-runtime-transaction-definition-contract.md`

### Change Log
- 2026-04-10: Implemented runtime definition contract, merge engine, validation, pnpm TypeScript/Vitest scaffold, and platform tests. Status moved to review.
