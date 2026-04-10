# Story 003: TransactionGrid Row Engine

## Goal
Implement the platform row interaction engine needed for keyboard-first Sales Invoice entry.

## Source of Truth
- `docs/architecture.md`
- `docs/prd.md`
- `spec/platform/transaction-grid.md`
- `spec/modules/sales/sales-invoice.md`

## Constraints
- TransactionGrid is an interaction engine, not a business engine.
- Exactly one phantom row exists at all times.
- Grid supports navigation mode and edit mode.
- Validation never blocks navigation.
- Calculations are synchronous and pure, but calculation logic is module-owned.

## Scope
- Implement row states: `new`, `dirty`, `deleted`.
- Maintain exactly one phantom row after insert, edit, delete, lookup fill, and save attempts.
- Support keyboard contract for Enter, Tab, Arrow keys, F2, Esc, Delete, Backspace, and Ctrl+S.
- Add metadata containers for snapshots, autofill state, stale state, buffering, and validation results.
- Trigger validation on commit, row exit, and save request without blocking movement.
- Add concurrent edit protection.

## Out of Scope
- Sales Invoice calculations.
- Product/customer lookup behavior.
- Save-time backend validation.
- Virtualization beyond the minimum needed by tests.

## Dependencies
- Story 001: Runtime Transaction Definition Contract.

## Tasks
- [ ] Define grid row state model for `new`, `dirty`, `deleted`, committed values, and buffered edit values.
- [ ] Define row metadata for lookup snapshots, autofill state, stale state, validation results, and generation tokens.
- [ ] Implement phantom-row creation and invariant enforcement.
- [ ] Implement navigation mode and edit mode state transitions.
- [ ] Implement Enter, Tab, Arrow keys, F2, Esc, Delete, Backspace, and Ctrl+S handling.
- [ ] Implement commit and row-exit events without blocking navigation.
- [ ] Implement save-request event emission for Ctrl+S.
- [ ] Implement concurrent edit protection.
- [ ] Add tests for mode transitions and keyboard behavior.
- [ ] Add tests for phantom-row invariants after insert, edit, delete, canceled edit, lookup fill, and save failure.
- [ ] Add tests proving validation annotations do not prevent navigation.

## Implementation Notes
- Keep row behavior generic and definition-driven.
- Treat buffered edit values separately from committed row values.
- Do not special-case product, tax, customer, or invoice semantics.
- Add direct invariant tests for phantom-row behavior.

## Risks
- Business behavior leaking into grid event handling.
- Phantom row edge cases after delete, canceled edit, or async lookup fill.
- Validation accidentally preventing keyboard navigation.

## Acceptance Criteria
- Grid supports keyboard-first row entry using resolved column definitions.
- Exactly one phantom row exists in all covered row lifecycle cases.
- Navigation continues when validation errors are present.
- Ctrl+S emits a save request without bypassing validation aggregation.
- Tests cover mode transitions, key handling, row states, concurrent edit protection, and phantom-row invariants.

## Definition of Done
- TransactionGrid row engine implemented.
- Unit/component tests cover the locked row and keyboard contracts.
- No Sales Invoice business rules exist inside TransactionGrid.
- No specs are modified.
