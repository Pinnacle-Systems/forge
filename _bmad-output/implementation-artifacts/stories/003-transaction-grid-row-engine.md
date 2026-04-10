# Story 003: TransactionGrid Row Engine

## Status
review

## Goal
Implement the platform-owned TransactionGrid row interaction engine that supports keyboard-first Sales Invoice entry while remaining entity-agnostic and driven only by `ResolvedTransactionDefinition`.

## Source of Truth
- `docs/architecture.md`
- `docs/prd.md`
- `docs/decisions/adr-003-grid-v1.1.md`
- `spec/platform/transaction-grid.md`
- `spec/platform/transaction-shell.md`
- `spec/platform/lookup-autofill.md`
- `spec/modules/sales/sales-invoice.md`
- `_bmad-output/implementation-artifacts/stories/001-runtime-transaction-definition-contract.md`
- `_bmad-output/implementation-artifacts/stories/002-sales-invoice-manifest-skeleton.md`

## Constraints Applied
- TransactionGrid is an interaction engine, not a business engine.
- UI/grid code consumes only `ResolvedTransactionDefinition`; it must not import or inspect raw manifest or instance config.
- Header and footer behavior belong to TransactionShell; this story owns only grid row state, cell focus, edit buffering, row lifecycle, and grid-originated events.
- Exactly one phantom row exists at all times, including after insert, edit, delete, lookup fill, canceled edit, validation failure, and save failure.
- Grid supports navigation mode and edit mode.
- Validation never blocks navigation; save orchestration may block later on unresolved errors.
- Calculations are synchronous and pure, but calculation implementations are module-owned and out of scope here.
- Async work belongs in lookup, enrich, and validate flows; the grid may store generation tokens and ignore stale updates but must not perform lookup/provider work.
- Lookup snapshots, autofill metadata, stale markers, and generation tokens must be row metadata, not Sales-specific fields.
- No product, tax, customer, invoice, or customer-specific branching in platform code.
- No spec, ADR, or PRD changes.

## Scope
- Add a platform row-engine module for TransactionGrid state and commands.
- Define grid row, cell focus, edit mode, row metadata, validation annotation, and emitted event types.
- Initialize grid state from resolved grid columns and optional initial row values.
- Maintain exactly one phantom row through all row lifecycle commands.
- Track row states: `new`, `dirty`, and `deleted`; represent the phantom row through metadata, not a separate business state.
- Keep committed row values separate from edit buffers.
- Support generic row metadata containers for lookup snapshots, autofill state, stale state, validation results, row generation, row revision, and queued external updates.
- Implement keyboard command handling for Enter, Tab, Arrow keys, F2, Esc, Delete, Backspace, and Ctrl+S.
- Emit validation requests on cell commit, row exit, and save request without blocking movement.
- Emit save-request events for Ctrl+S without bypassing validation aggregation.
- Implement concurrent edit protection so external row updates cannot overwrite an active edit buffer.
- Add focused unit tests for mode transitions, row lifecycle, keyboard commands, phantom-row invariants, validation navigation, and concurrent edit protection.

## Out of Scope
- Rendering a React/Vue/Svelte grid component.
- Sales Invoice calculations, validations, lookup providers, persistence, or save orchestration.
- Product/customer/tax lookup behavior beyond generic metadata write hooks needed by Story 004.
- Save-time backend validation.
- Header/footer validation aggregation beyond emitted grid events.
- Excel paste, undo/redo, bulk edit, multi-row fill, or reporting features.
- Full virtualization implementation; this story may expose state in a shape that does not prevent future virtualization.

## Dependencies
- Story 001: Runtime Transaction Definition Contract must be complete.
- Story 002: Sales Invoice Manifest Skeleton should be available for fixtures or integration-style contract tests.

## Exact File Structure
Create the grid row engine under the platform package:

```text
packages/
  platform/
    src/
      transaction-grid/
        index.ts
        types.ts
        createTransactionGridEngine.ts
        keyboard.ts
        rowInvariants.ts
        __tests__/
          fixtures/
            resolvedSalesInvoiceGrid.fixture.ts
          createTransactionGridEngine.test.ts
          keyboard.test.ts
          rowInvariants.test.ts
          validationNavigation.test.ts
          concurrentEditProtection.test.ts
          columnInteractivity.test.ts
```

If implementation discovers an existing platform UI/core split, keep the same public contract and adapt the physical paths to that split. Do not place the row engine in the Sales module.

## Public API
Export the row-engine contract from `packages/platform/src/transaction-grid/index.ts`:

```ts
export type {
  AutofillAnnotation,
  CellPosition,
  CellValidationAnnotation,
  EditBuffer,
  GridEditMode,
  GridKeyboardCommand,
  GridRow,
  GridRowMetadata,
  GridRowState,
  GridSnapshot,
  GridValue,
  LookupSnapshotValue,
  QueuedExternalUpdate,
  ResolvedGridColumn,
  RowValidationState,
  StaleAnnotation,
  TransactionElementId,
  TransactionGridEngine,
  TransactionGridEngineEvent,
  TransactionGridEngineOptions,
} from './types';

export {
  createTransactionGridEngine,
} from './createTransactionGridEngine';

export {
  normalizeGridKeyboardEvent,
} from './keyboard';
```

Also export the same symbols from `packages/platform/src/index.ts` so application code can import the platform API from the package root. The row-engine implementation must import resolved-definition types from `packages/platform/src/runtime-definition/types.ts`; it must not expose manifest/config types as row-engine inputs.

## Runtime Types
Implement the minimum row engine types in `types.ts`. Names may be adjusted to match final repo conventions, but preserve the contract meaning.

```ts
import type {
  ResolvedGridColumn,
  TransactionElementId,
} from '../runtime-definition/types';

export type {
  ResolvedGridColumn,
  TransactionElementId,
} from '../runtime-definition/types';

export type GridValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | Record<string, unknown>;

export type GridRowState = 'new' | 'dirty' | 'deleted';
export type GridEditMode = 'navigation' | 'edit';

export interface CellPosition {
  rowId: string;
  columnId: TransactionElementId;
}

export interface LookupSnapshotValue {
  providerRef: string;
  entityId: string;
  label?: string;
  values: Record<string, GridValue>;
  capturedAtRevision: number;
}

export interface AutofillAnnotation {
  sourceColumnId: TransactionElementId;
  mode: 'lookup' | 'cascade' | 'external';
  preservedManualOverride?: boolean;
}

export interface StaleAnnotation {
  sourceColumnId?: TransactionElementId;
  reason: 'preserved-manual-override' | 'stale-async-response' | 'external-update-conflict';
}

export interface CellValidationAnnotation {
  severity: 'error' | 'warning';
  message: string;
  validationRef?: string;
}

export interface RowValidationState {
  cells: Partial<Record<TransactionElementId, CellValidationAnnotation[]>>;
  row: CellValidationAnnotation[];
}

export interface EditBuffer {
  columnId: TransactionElementId;
  value: GridValue;
  originalValue: GridValue;
  capturedRevision: number;
}

export interface QueuedExternalUpdate {
  values: Record<TransactionElementId, GridValue>;
  reason: 'external-update' | 'lookup-enrich';
  generation: number;
}

export interface GridRowMetadata {
  isPhantom: boolean;
  revision: number;
  generation: number;
  lookupSnapshots: Partial<Record<TransactionElementId, LookupSnapshotValue>>;
  autofill: Partial<Record<TransactionElementId, AutofillAnnotation>>;
  stale: Partial<Record<TransactionElementId, StaleAnnotation>>;
  validation: RowValidationState;
  editBuffer?: EditBuffer;
  queuedExternalUpdates: QueuedExternalUpdate[];
}

export interface GridRow {
  id: string;
  state?: GridRowState;
  values: Record<TransactionElementId, GridValue>;
  metadata: GridRowMetadata;
}

export interface GridSnapshot {
  columns: ResolvedGridColumn[];
  rows: GridRow[];
  mode: GridEditMode;
  focus: CellPosition;
}

export type GridKeyboardCommand =
  | { type: 'enter' }
  | { type: 'tab'; shiftKey?: boolean }
  | { type: 'arrow'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'f2' }
  | { type: 'escape' }
  | { type: 'delete' }
  | { type: 'backspace' }
  | { type: 'save' };

export type TransactionGridEngineEvent =
  | { type: 'cellCommitted'; rowId: string; columnId: TransactionElementId; value: GridValue }
  | { type: 'rowExited'; rowId: string }
  | { type: 'validationRequested'; scope: 'cell' | 'row' | 'grid'; rowId?: string; columnId?: TransactionElementId }
  | { type: 'saveRequested' }
  | { type: 'externalUpdateQueued'; rowId: string }
  | { type: 'staleExternalUpdateIgnored'; rowId: string };

export interface TransactionGridEngineOptions {
  columns: ResolvedGridColumn[];
  rows?: Array<Record<TransactionElementId, GridValue>>;
  createRowId?: () => string;
}

export interface TransactionGridEngine {
  getSnapshot(): GridSnapshot;
  drainEvents(): TransactionGridEngineEvent[];
  dispatchKeyboard(command: GridKeyboardCommand): void;
  beginEdit(position?: CellPosition): void;
  updateEditBuffer(value: GridValue): void;
  commitEdit(): void;
  cancelEdit(): void;
  moveFocus(position: CellPosition): void;
  deleteRow(rowId: string): void;
  applyExternalRowUpdate(rowId: string, update: QueuedExternalUpdate): void;
  applyValidation(rowId: string, validation: RowValidationState): void;
}
```

Implementation notes:
- If `Date` values complicate deterministic tests, use `unknown` internally and keep test fixtures to primitives.
- `getSnapshot()` must deep clone rows, row values, metadata objects, metadata arrays, nested annotation records, and columns so external mutation cannot affect engine state.
- `drainEvents()` must return cloned event payloads and clear the internal event queue after returning them.
- `createRowId` must be called only when a phantom row is materialized into a new row and a replacement phantom row needs an ID.
- `metadata.isPhantom` is the only way to identify the phantom row; do not add a `phantom` row state.
- Deleted rows may remain in internal state for persistence diffing, but focus/navigation should skip them.

## Required Behavior

### Initialization
- Accept only resolved grid columns.
- Use the `TransactionGridEngineOptions.columns` array in the order provided by the caller; do not re-read raw manifest order or override permissions.
- Normalize missing initial rows to an empty committed row set plus one phantom row.
- Normalize provided initial rows to `dirty`-free active rows plus one phantom row.
- Set initial focus to the first visible grid column on the first active row, or the phantom row if there are no committed rows.
- Exclude invisible columns from focus movement and keyboard traversal.
- If every non-phantom row is deleted, move focus to the phantom row and the first visible column.

### Column Interactivity Rules
- Visibility is determined only by `ResolvedGridColumn.visible === true`.
- Editability is determined only by `ResolvedGridColumn.editable === true` and `ResolvedGridColumn.visible === true`.
- Hidden columns cannot be reached through keyboard traversal or `moveFocus`; invalid programmatic focus requests must resolve to the nearest active visible cell without throwing.
- Columns with `calculationRef` are not automatically treated as non-editable by the row engine; Story 001/manifest resolution is the source of truth and should set calculated output columns to `editable: false`.
- Requiredness does not affect keyboard navigation or edit entry.

### Phantom Row Invariant
- Exactly one active row must have `metadata.isPhantom === true`.
- The phantom row must not be `deleted`.
- Editing the phantom row and committing any non-empty value materializes that row as `state: 'new'`, `metadata.isPhantom: false`, and appends a new phantom row.
- Clearing or canceling an empty phantom row must keep a single phantom row.
- Deleting a non-phantom row must not delete the phantom row and must preserve exactly one phantom row.
- Save failure or validation annotations must not create or remove phantom rows.
- External update and lookup-fill APIs must call the same invariant enforcement path.
- A non-empty external update applied to the phantom row materializes that row as `state: 'new'`, clears `metadata.isPhantom`, and appends a replacement phantom row.
- An empty external update applied to the phantom row keeps it phantom and preserves the single-phantom invariant.
- Materializing a phantom row must preserve that row's existing ID and call `createRowId` only for the replacement phantom row.

### Row State Rules
- Existing initialized rows start as clean committed rows with `state` omitted; `new`, `dirty`, and `deleted` are the tracked transition states required by the grid contract.
- A materialized phantom row starts as `state: 'new'`.
- Changing a non-phantom row value marks it `dirty` unless it is already `new`.
- Deleting a non-phantom row marks it `deleted` and removes it from navigation.
- Deleting the phantom row clears its values and keeps it as the sole phantom row.

### Edit Buffer Rules
- Edit mode stores edits in `metadata.editBuffer`; it must not mutate committed `row.values` until commit.
- `Esc` cancels edit mode and restores navigation mode without changing committed values.
- Commit compares buffered value against the committed value before changing row state or revision.
- Every successful value commit increments row `revision` and `generation`.
- Commit emits `cellCommitted` and `validationRequested` with `scope: 'cell'`.
- Leaving a row emits `rowExited` and `validationRequested` with `scope: 'row'`.

### Event Ordering
- `commitEdit()` must emit `cellCommitted` before `validationRequested(scope: 'cell')`.
- A keyboard command that commits a cell and exits the current row must emit events in this order: `cellCommitted`, `validationRequested(scope: 'cell')`, `rowExited`, `validationRequested(scope: 'row')`.
- Focus changes happen after commit and row-exit events have been queued.
- `Enter` in edit mode follows the commit/row-exit order when moving to a different row.
- `Tab` or `Shift+Tab` in edit mode follows the commit/row-exit order only when traversal crosses to a different row.
- `Tab` or `Shift+Tab` within the same row emits cell commit events only.
- `Ctrl+S` must emit `validationRequested(scope: 'grid')` before `saveRequested`.
- `drainEvents()` must preserve FIFO order.

### Keyboard Rules
- `Enter` in navigation mode begins edit for the focused editable, visible column.
- `Enter` in edit mode commits the buffer and moves focus down one active row in the same column.
- `Tab` in navigation mode moves horizontally across visible columns; `Shift+Tab` moves backward. Wrapping across rows is allowed and must preserve the phantom invariant.
- `Tab` in edit mode commits the buffer, then performs the same movement as navigation mode.
- Arrow keys in navigation mode move focus by one visible cell/active row and skip deleted rows.
- Arrow keys in edit mode do not change grid focus; leave in-cell cursor behavior to the UI input.
- `F2` toggles from navigation mode into edit mode for editable cells and leaves existing buffer content intact when already editing.
- `Esc` cancels edit mode; in navigation mode it is a no-op.
- `Delete` or `Backspace` in navigation mode clears the focused editable cell, commits the clear immediately, and keeps navigation mode.
- `Delete` or `Backspace` in edit mode edits the buffer only through `updateEditBuffer`; keyboard normalization must not directly mutate committed values.
- `Ctrl+S` emits `validationRequested` with `scope: 'grid'` and `saveRequested`; it must not mutate rows or clear validation annotations.
- Non-editable or invisible columns must not enter edit mode or be cleared by key commands.

### Validation Behavior
- Validation annotations are stored on row metadata.
- Validation errors and warnings never block focus movement, row exit, phantom row creation, or edit cancellation.
- `applyValidation` replaces validation annotations for the target row without changing committed values or row state.
- Save requests are events only; TransactionShell remains responsible for validation aggregation and save lifecycle.

### Concurrent Edit Protection
- `applyExternalRowUpdate` must apply immediately when the target row is not actively editing.
- If the target row is actively editing, the update must be queued in `metadata.queuedExternalUpdates`, emit `externalUpdateQueued`, and leave the edit buffer untouched.
- Queued external updates may be applied after commit/cancel only when their `generation` is still current.
- Stale external updates must be ignored and emit `staleExternalUpdateIgnored`.
- External updates must not remove or duplicate the phantom row.
- `applyValidation` is the only API for validation annotations; validation results must not be routed through `applyExternalRowUpdate`.

## Step-by-Step Implementation Tasks
- [x] Create `packages/platform/src/transaction-grid/` and barrel exports.
- [x] Add `types.ts` with row state, metadata, focus, keyboard command, event, and engine API types.
- [x] Implement `rowInvariants.ts` with a single `ensureExactlyOnePhantomRow` path used by initialization and every mutating command.
- [x] Implement `createTransactionGridEngine.ts` with immutable snapshots, event draining, row lifecycle commands, edit buffer handling, and focus movement.
- [x] Implement `keyboard.ts` with `normalizeGridKeyboardEvent` and command dispatch support for Enter, Tab, Arrow keys, F2, Esc, Delete, Backspace, and Ctrl+S.
- [x] Add the TransactionGrid exports to `packages/platform/src/index.ts`.
- [x] Add a resolved Sales Invoice grid fixture by resolving `salesInvoiceManifest` through `mergeTransactionDefinition(...)` and passing the resolved grid column array into `TransactionGridEngineOptions.columns`.
- [x] Add tests for initialization with no rows, initial rows, invisible columns, and deterministic focus.
- [x] Add tests for exact event ordering on commit, row exit, Tab row wrap, Enter row movement, and Ctrl+S.
- [x] Add tests for visibility/editability source-of-truth behavior.
- [x] Add tests for navigation mode and edit mode transitions.
- [x] Add tests for Enter, Tab, Shift+Tab, Arrow keys, F2, Esc, Delete, Backspace, and Ctrl+S behavior.
- [x] Add tests for row state transitions: new phantom materialization, dirty existing row, deleted row, and phantom delete/clear.
- [x] Add tests proving exactly one phantom row after insert, edit, delete, canceled edit, lookup/external fill, validation save failure, and save request.
- [x] Add tests proving validation annotations do not prevent navigation or row exit.
- [x] Add tests proving active edit buffers are not overwritten by external updates and stale generations are ignored.
- [x] Run `pnpm test` and `pnpm typecheck`.

## Explicit Test Cases

### `rowInvariants.test.ts`
- Initializes an empty grid with exactly one phantom row.
- Initializes with two committed rows and appends exactly one phantom row.
- Materializes the phantom row after committing a non-empty value and appends a new phantom row.
- Keeps one phantom row after canceling an edit on the phantom row.
- Keeps one phantom row after clearing the last value on the phantom row.
- Keeps one phantom row after deleting a non-phantom row.
- Keeps one phantom row after `applyExternalRowUpdate` writes values to the phantom row.
- Materializes the phantom row when `applyExternalRowUpdate` writes non-empty values to it.
- Keeps the phantom row phantom when `applyExternalRowUpdate` writes only empty values to it.
- Keeps one phantom row after validation annotations are applied.

### `createTransactionGridEngine.test.ts`
- Begins in navigation mode with focus on the first visible column.
- `beginEdit` creates an edit buffer without mutating committed values.
- `updateEditBuffer` changes only the buffer.
- `commitEdit` writes the buffered value, increments revision/generation, emits `cellCommitted`, and requests cell validation.
- `cancelEdit` discards the buffer and keeps committed values unchanged.
- Committing a changed existing row marks it `dirty`.
- Committing a changed phantom row marks it `new` and creates a replacement phantom.
- `deleteRow` marks non-phantom rows `deleted` and skips them during navigation.
- `deleteRow` on the phantom row clears it instead of removing it.

### `keyboard.test.ts`
- `Enter` starts edit in navigation mode.
- `Enter` commits edit mode and moves down.
- `Tab` moves to the next visible column.
- `Shift+Tab` moves to the previous visible column.
- Arrow keys move through visible columns and active rows in navigation mode.
- Arrow keys do not move grid focus while editing.
- `F2` starts editing the focused cell.
- `Esc` cancels editing.
- `Delete` and `Backspace` clear editable focused cells in navigation mode.
- `Delete` and `Backspace` do not clear non-editable calculated columns.
- `Ctrl+S` emits grid validation and save request events without changing row values.
- Event ordering is FIFO: cell commit, cell validation, row exit, row validation when a key commits and leaves the row.
- `Ctrl+S` emits grid validation before save request.

### `validationNavigation.test.ts`
- Applying an error annotation to the focused cell does not prevent Arrow movement.
- Applying an error annotation to a row does not prevent Tab wrapping to the next row.
- Leaving a row with validation annotations still emits `rowExited` and row validation request events.
- Save request preserves validation annotations for TransactionShell aggregation.

### `concurrentEditProtection.test.ts`
- External update applies immediately when the target row is not editing.
- External update queues when the target row is editing.
- Queued external update does not overwrite the active edit buffer.
- Current queued update may apply after commit or cancel when generation still matches.
- Stale queued update is ignored and emits `staleExternalUpdateIgnored`.
- Queued or stale external updates never create duplicate phantom rows.

### `columnInteractivity.test.ts`
- Visible editable columns can receive focus and enter edit mode.
- Visible non-editable columns can receive focus but cannot enter edit mode or be cleared.
- Invisible columns cannot receive focus through keyboard traversal.
- Programmatic focus to an invisible column resolves to the nearest active visible cell.
- A calculated column follows its resolved `editable` flag; no calculation-specific branching exists in the row engine.

## Implementation Notes
- Keep the row engine generic and definition-driven.
- Prefer pure helper functions for row cloning, focus traversal, visibility/editability checks, and phantom-row enforcement.
- Do not import Sales module code into the transaction-grid implementation; Sales fixtures are acceptable in tests only if they flow through the resolved-definition API.
- Treat an empty value as `undefined`, `null`, or an empty string for phantom materialization checks; do not treat `0` or `false` as empty.
- For this story, clearing a cell writes `undefined`.
- Avoid building a virtualization layer now, but do not tie engine behavior to rendered DOM indices.
- Add direct invariant tests around the row engine instead of relying only on keyboard tests.

## Risks
- Business behavior leaking into grid event handling.
- Phantom row edge cases after delete, canceled edit, lookup fill, or validation/save failure.
- Validation accidentally preventing keyboard navigation.
- External async updates overwriting active keyboard edits.
- Keyboard behavior becoming tied to a future UI framework too early.

## Acceptance Criteria
- TransactionGrid row engine consumes resolved grid columns only.
- Grid supports keyboard-first row entry using visible/editable resolved column definitions.
- Exactly one phantom row exists in every covered row lifecycle case.
- Navigation continues when validation errors are present.
- Ctrl+S emits validation and save-request events without mutating grid rows.
- Active edit buffers are protected from external updates.
- No Sales Invoice business rules exist inside TransactionGrid.
- Tests cover mode transitions, key handling, row states, concurrent edit protection, validation navigation, and phantom-row invariants.

## Definition of Done
- TransactionGrid row engine contract and implementation are complete.
- Unit tests cover the locked row, keyboard, validation-navigation, and concurrent-edit contracts.
- The platform package exports the row-engine API.
- `pnpm test` passes.
- `pnpm typecheck` passes.
- No specs are modified.
- No product, customer, tax, invoice, or customer-specific branching exists in platform row-engine code.

## Dev Agent Record

### Implementation Plan
- Added a platform-owned `transaction-grid` module with public types, keyboard normalization, row invariant helpers, and a stateful engine factory.
- Kept the engine resolved-column-driven and event-based so validation, save, lookup, enrich, calculations, and persistence stay outside TransactionGrid.
- Covered the story contract with focused Vitest suites for row invariants, mode transitions, keyboard behavior, validation navigation, concurrent edit protection, and column interactivity.

### Debug Log
- Confirmed the initial red run failed because the transaction-grid module did not exist.
- Adjusted the test fixture to use the existing platform Sales Invoice-like manifest fixture to avoid adding a platform-package dependency on the Sales module.
- Refined focus fallback after deleting the focused row so the engine prefers an active non-phantom row before falling back to the phantom row.

### Completion Notes
- Implemented TransactionGrid row engine state, snapshots, events, keyboard dispatch, edit buffering, row lifecycle, phantom materialization, validation annotation storage, and external update generation checks.
- Added root and subpath platform exports for `transaction-grid`.
- Verified no Sales Invoice business rules were added to platform row-engine code.
- Verification passed: `pnpm test packages/platform/src/transaction-grid`, `pnpm test`, and `pnpm typecheck`.

## File List
- `packages/platform/package.json`
- `packages/platform/src/index.ts`
- `packages/platform/src/transaction-grid/index.ts`
- `packages/platform/src/transaction-grid/types.ts`
- `packages/platform/src/transaction-grid/createTransactionGridEngine.ts`
- `packages/platform/src/transaction-grid/keyboard.ts`
- `packages/platform/src/transaction-grid/rowInvariants.ts`
- `packages/platform/src/transaction-grid/__tests__/fixtures/resolvedSalesInvoiceGrid.fixture.ts`
- `packages/platform/src/transaction-grid/__tests__/createTransactionGridEngine.test.ts`
- `packages/platform/src/transaction-grid/__tests__/keyboard.test.ts`
- `packages/platform/src/transaction-grid/__tests__/rowInvariants.test.ts`
- `packages/platform/src/transaction-grid/__tests__/validationNavigation.test.ts`
- `packages/platform/src/transaction-grid/__tests__/concurrentEditProtection.test.ts`
- `packages/platform/src/transaction-grid/__tests__/columnInteractivity.test.ts`
- `_bmad-output/implementation-artifacts/stories/003-transaction-grid-row-engine.md`

## Change Log
- 2026-04-10: Implemented TransactionGrid row engine and test coverage for Story 003.
