# Story 007: Validation and Save Orchestration

## Status

ready-for-dev

## Goal

Implement validation aggregation and save lifecycle behavior for the Sales Invoice vertical slice. This includes a robust validation result model (warnings, errors), transaction shell save orchestration, and implementing the module-owned discontinued items policy.

---

## Source of Truth

- `docs/architecture.md`
- `docs/prd.md`
- `spec/platform/transaction-shell.md`
- `spec/platform/transaction-grid.md`
- `spec/platform/lookup-autofill.md`
- `spec/modules/inventory/product-lookup.md`
- `spec/modules/sales/sales-invoice.md`

---

## Constraints Applied

- **TransactionShell** coordinates dirty state, save lifecycle, and validation aggregation.
- **Navigation Policy**: Validation *never* blocks navigation (e.g., cell exit, row exit).
- **Save Policy**: Save is blocked on unresolved **blocking errors**.
- **Data Authority**: Save-time validation rechecks authoritative provider/backend rules, revalidating lookup snapshots (e.g., product status).
- **Severity Policy**: Save-time validation supports `warn`, `block`, and `ignore` policies.
- **Module Ownership**: Discontinued product handling is an inventory/sales module-owned validation policy, not a platform rule. No customer-specific branching in platform code.

---

## Scope

- Implement validation result model: `error`, `warning`, `info`.
- Implement `TransactionShell` save orchestration lifecycle (`idle`, `validating`, `saving`, `success`, `error`).
- Aggregate cell, row, header, footer, and save-time validation results in TransactionShell.
- Implement async validation during save request (revalidating lookup snapshots against authoritative provider/backend state).
- Implement Sales Invoice **discontinued item** behavior as a module-owned validation policy (returning block or warn).
- Wire `Ctrl+S` from TransactionGrid into shell save orchestration.

---

## Out of Scope

- Real database persistence.
- Full workflow approval logic.
- UI rendering of validation popups/toast notifications (beyond basic state exposure).
- Save-draft functionality.
- Undo/redo.

---

## Dependencies

- Story 003: TransactionGrid Row Engine.
- Story 004: Lookup Runtime Foundation.
- Story 005: Sales Customer and Product Lookup Providers.
- Story 006: Sales Invoice Calculations.

---

## Runtime Contract Check Before Implementation

Before implementing:

Inspect:
- `packages/platform/src/transaction-shell/types.ts`
- `packages/platform/src/transaction-grid/types.ts`
- any existing shell/grid controller files.

Rules:
- Treat **existing runtime types and APIs as authoritative**.
- Do not introduce a new shell event model if an existing one already handles action dispatch.
- Do not modify platform layout contracts to fit this scenario unless required by the missing functionality.
- If mismatch exists → adapt implementation, not platform.
- Use existing test helpers if available.

---

## Exact File Structure

packages/
  platform/
    src/
      transaction-shell/
        types.ts
        validation.ts
        saveState.ts
        index.ts
        __tests__/
          validation.test.ts
          saveState.test.ts
  modules/
    sales/
      src/
        validation/
          types.ts
          discontinuedItem.ts
          index.ts
          __tests__/
            discontinuedItem.test.ts

---

## Public API

### Platform (TransactionShell)
```ts
export * from './types';
export { aggregateValidations } from './validation';
export { createSaveLifecycle } from './saveState';

export interface ValidationContext {
  manifest: ResolvedTransactionDefinition;
  headerValues: Record<string, any>;
}

export interface RowValidationContext extends ValidationContext {
  row: GridRow;
}

export interface SaveValidationContext extends ValidationContext {
  rows: GridRow[];
}

export interface TransactionShellOptions {
  gridEngine: TransactionGridEngine; // From Story 003
  manifest: ResolvedTransactionDefinition; // From Story 001
  getHeaderValues?: () => Record<string, any>;
  validationHooks: {
    header?: Array<(context: ValidationContext) => ValidationIssue[]>;
    row?: Array<(context: RowValidationContext) => ValidationIssue[]>;
    footer?: Array<(context: SaveValidationContext) => ValidationIssue[]>;
    crossField?: Array<(context: SaveValidationContext) => ValidationIssue[]>;
    save?: Array<(context: SaveValidationContext) => Promise<ValidationIssue[]>>;
  };
  saveHandler: (context: SaveValidationContext) => Promise<{ ok: boolean; error?: string }>; // The actual persistence call
}

export type SaveRequestResult = { status: 'blocked' | 'confirming' | 'saved' | 'failed' };

export interface TransactionShell {
  getState(): SaveLifecycleState;
  getValidationSummary(): ValidationSummary;
  requestSave(): Promise<SaveRequestResult>;
  confirmSave(): Promise<SaveRequestResult>; // Valid only in 'confirming'
  cancelSave(): void;         // Clears warnings, returns to 'idle'
  subscribe(callback: (state: SaveLifecycleState) => void): () => void;
}

export function createTransactionShell(options: TransactionShellOptions): TransactionShell;
```

### Module (Sales Validation)
```ts
export * from './types';
export { validateDiscontinuedProduct } from './discontinuedItem';
```

---

## Core Types

### Platform Types
```ts
export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationPolicy = 'block' | 'warn' | 'ignore'; // Module-level policy configuration

export interface ValidationIssue {
  id: string;
  fieldId?: string; // Optional field reference
  rowId?: string;   // Optional row reference
  severity: ValidationSeverity; // 'error' implies block
  message: string;
}

export interface ValidationSummary {
  isValid: boolean;
  hasWarnings: boolean;
  issues: ValidationIssue[];
}

export type SaveLifecycleState = 
  | 'idle' 
  | 'validating' 
  | 'confirming'
  | 'saving' 
  | 'success' 
  | 'error';

export interface SaveLifecycle {
  state: SaveLifecycleState;
  warnings: ValidationIssue[];
  confirmSave(): void; // transitions confirming -> saving when only warnings present
  cancelSave(): void;  // transitions confirming -> idle
}
```

### Module Types
```ts
export interface ProductValidationContext {
  productId: string;
  isDiscontinued: boolean;
  policy: ValidationPolicy;
}

// In discontinuedItem.ts - module-owned policy configuration
export const discontinuedItemPolicy: ValidationPolicy = 'block';
```

---

## Validation Engine Rules

### Aggregation
- Combine issues from Header, Rows, Footer, and Cross-field checks.
- Signature:
```ts
export function aggregateValidations(input: {
  headerIssues: ValidationIssue[];
  rowIssues: Record<string, ValidationIssue[]>; // rowId -> issues
  footerIssues: ValidationIssue[];
  crossFieldIssues: ValidationIssue[];
}): ValidationSummary;
```
- **Severity Normalization**: `ValidationIssue` only contains `severity`. The module's assembly logic and `ValidationPolicy` configuration dictates this severity (`block` policy -> `severity: 'error'`, `warn` policy -> `severity: 'warning'`). Invalid combinations are impossible by design.
- If *any* issue has `error` severity, `ValidationSummary.isValid` = `false`. Save is blocked and shell returns to `idle` state exposing the issues.
- If *any* issue has `warning` severity (and no errors exist), `ValidationSummary.hasWarnings` = `true`. Save enters `confirming` state.
- **Failure Semantics**: The `error` state in `SaveLifecycleState` is strictly reserved for `saveHandler` failure (e.g., network error). Validation blocks simply return to `idle`.

### Interaction Validations (Sync)
- Run on `cell exit`.
- Run on `row exit`.
- Annotate UI problems. *Never* block navigation.

### Save-time Validations (Async)
- Triggered by Save Action or `Ctrl+S`.
- Platform executes injected `validationHooks.save` validators. Module assembly constructs these validators to call `LookupProvider.validate` if needed.

---

## Save Orchestration Rules

1. **Triggered**: Shell enters `validating` state.
2. **Execute sync validations**: Aggregate all local field errors. If any issue has an `error` severity, abort to `idle` state and return `{ status: 'blocked' }`.
3. **Execute async validations**: Platform orchestration accepts injected validators. It passes `SaveValidationContext` to the module hooks.
4. **Evaluate Policies**:
   - If `error` severity is encountered → abort to `idle` state and return `{ status: 'blocked' }`.
   - If only `warning` severity is encountered → transition to `confirming` state, expose warnings, and return `{ status: 'confirming' }`.
5. **Commit**: Shell enters `saving` state (either directly from `validating` if no warnings, or via `confirmSave()`). Saving invokes `saveHandler()`.
6. **Completion**: If `saveHandler` returns `{ ok: true }`, enter `success` state and return `{ status: 'saved' }`. If `{ ok: false }`, enter `error` state and return `{ status: 'failed' }`.

---

## Hook Wiring

- `Ctrl+S` must bubble up from the grid action dispatcher. The shell subscribes to `TransactionGridEngineEvent` type `saveRequested` emitted on Ctrl+S (Story 003).
- **Module Save-Time Validation**: Module-owned assembly is responsible for constructing save validators that may call `LookupProvider.validate`. `TransactionShell` only executes injected validators and aggregates their results. The platform does not directly know about `inventory.product` or provider IDs.
- **Provider Output Adapter**: The sales module implements an adapter `validateDiscontinuedProduct(providerResult, policy)` that transforms the specific provider's `PRODUCT_DISCONTINUED` result into a generic `ValidationIssue` mapping to the correct severity based on configured policy.

---

## Required Tests

### Platform Validation Tests
- Aggregates header, row, and footer errors correctly.
- Correctly maps `error` vs `warning`.
- Navigation (row exit) does not fail or block due to invalid cell.
- Blocked save on unresolved validation errors (`isValid: false`).
- Save pipeline transitions correctly (`idle` -> `validating` -> `saving` -> `success`).
- Warning-only save correctly transitions to `confirming` state.
- `confirmSave()` properly proceeds from `confirming` to `saving`.
- `cancelSave()` properly clears warnings and returns to `idle`.
- Injected `saveHandler` failure correctly transitions shell to `error` state.
- `Ctrl+S` keyboard event from grid and explicit shell save action both trigger the identical save pathway.
- Duplicate or repeated save requests while already `validating` or `saving` are deterministically ignored.

### Module Sales Validation Tests
- `validateDiscontinuedProduct` returns `error` if policy configures block.
- `validateDiscontinuedProduct` returns `warning` if policy configures warn.
- Stale lookup revalidation on save catches if a previously valid item was later discontinued by verifying the `generation` token is checked (from Story 004) and injecting a save validator that returns a discontinued issue warning or error based on policy configuration.

---

## Implementation Tasks

- [ ] Define platform ValidationResult and SaveLifecycle types.
- [ ] Implement Validation Aggregator in `TransactionShell`.
- [ ] Implement Save Lifecycle state machine.
- [ ] Wire `Ctrl+S` shortcut propagation in TransactionGrid.
- [ ] Implement Sales module discontinued product logic (`validateDiscontinuedProduct`).
- [ ] Implement lookup revalidation hook for save using module provider.
- [ ] Write unit tests for aggregate and navigation policies.
- [ ] Write unit tests for blocked save, warn save, and stale lookup handling.
- [ ] Run `pnpm test` and `pnpm typecheck`.

---

## Risks

- Validation blocks keyboard flow (e.g. grid blur events fail).
- Save accidentally succeeds from stale lookup snapshots instead of rechecking authoritative status.
- The discontinued item policy remains ambiguous and causes inconsistent tests (ensure the policy object dictates the behavior explicitly).
- Warnings are accidentally treated as blocking errors or ignored silently.

---

## Acceptance Criteria

- Commit and row-exit validation annotate problems without blocking navigation.
- Save runs authoritative validation for customer/product snapshots (async re-check).
- Blocking errors prevent the `saving` state entirely.
- Warnings are surfaced and handled accurately without halting save unless specified.
- Discontinued item behavior is configured and tested as block and warn variations.
- `Ctrl+S` triggers the same save lifecycle as a generic save action button.

---

## Definition of Done

- Validation result types and save orchestration state machine are implemented.
- Sales Invoice discontinued product behavior is module-owned and tested.
- Tests cover navigation with validation errors, blocked save, warning save path, and stale lookup revalidation.
- No Specs or Manifests are arbitrarily modified unless required for hooks definition.
- Tests pass.
- Typecheck passes.
