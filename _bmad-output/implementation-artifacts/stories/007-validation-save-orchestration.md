# Story 007: Validation and Save Orchestration

## Goal
Implement validation aggregation and save lifecycle behavior for the Sales Invoice vertical slice.

## Source of Truth
- `docs/architecture.md`
- `docs/prd.md`
- `spec/platform/transaction-shell.md`
- `spec/platform/transaction-grid.md`
- `spec/platform/lookup-autofill.md`
- `spec/modules/inventory/product-lookup.md`
- `spec/modules/sales/sales-invoice.md`

## Constraints
- TransactionShell coordinates dirty state, save lifecycle, and validation aggregation.
- Validation never blocks navigation.
- Save is blocked on unresolved blocking errors.
- Save-time validation rechecks authoritative backend rules.
- Save-time validation supports warn/block/ignore policy.
- Discontinued product handling is module/provider-owned.

## Scope
- Implement validation result model with blocking errors, warnings, and ignored outcomes.
- Aggregate cell, row, header, footer, and save-time validation results in TransactionShell.
- Run validation on commit, row exit, and save request.
- Revalidate lookup snapshots against authoritative provider/backend state on save.
- Implement Sales Invoice discontinued item behavior using module-owned validation policy.
- Wire Ctrl+S from TransactionGrid into shell save orchestration.

## Out of Scope
- Real database persistence.
- Full workflow approval logic.
- Undo/redo.

## Dependencies
- Story 003: TransactionGrid Row Engine.
- Story 004: Lookup Runtime Foundation.
- Story 005: Sales Customer and Product Lookup Providers.
- Story 006: Sales Invoice Calculations.

## Tasks
- [ ] Define validation result types for blocking errors, warnings, and ignored outcomes.
- [ ] Define save lifecycle states and events in TransactionShell.
- [ ] Aggregate header, grid, row, cell, footer, and save-time validation results.
- [ ] Run validation on cell commit without blocking navigation.
- [ ] Run validation on row exit without blocking navigation.
- [ ] Run authoritative lookup snapshot revalidation on save.
- [ ] Implement module-owned discontinued product policy as block or warn.
- [ ] Wire Ctrl+S from TransactionGrid into the same save lifecycle as the primary save action.
- [ ] Surface validation and warning results to UI consumers.
- [ ] Add tests for navigation with validation errors.
- [ ] Add tests for blocked save, warning save path, and stale lookup revalidation.
- [ ] Add tests proving cached lookup data is not treated as authoritative at save time.

## Implementation Notes
- Model discontinued item severity explicitly because the Sales Invoice spec says "blocked or warned".
- Keep navigation and save lifecycle separate: invalid rows can be left, but unresolved blocking errors prevent save.
- Save-time validation should use provider validation, not only row snapshots.

## Risks
- Validation blocks keyboard flow.
- Save succeeds from stale lookup snapshots.
- The discontinued item policy remains ambiguous and causes inconsistent tests.
- Warnings are accidentally treated as blocking errors or ignored silently.

## Acceptance Criteria
- Commit and row-exit validation annotate problems without blocking navigation.
- Save runs authoritative validation for customer/product snapshots.
- Blocking errors prevent save.
- Warnings are surfaced and handled according to configured/module policy.
- Discontinued item behavior is covered by tests as block or warn.
- Ctrl+S triggers the same save lifecycle as the visible save action.

## Definition of Done
- Validation result model and save orchestration are implemented.
- Sales Invoice discontinued product behavior is module-owned and tested.
- Tests cover navigation with validation errors, blocked save, warning save path, and stale lookup revalidation.
- No specs are modified.
