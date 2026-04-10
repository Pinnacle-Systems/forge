# Story 006: Sales Invoice Calculations

## Goal
Implement pure synchronous Sales Invoice calculations for line totals and footer totals.

## Source of Truth
- `docs/architecture.md`
- `docs/prd.md`
- `spec/modules/sales/sales-invoice.md`
- `spec/platform/transaction-grid.md`
- `spec/platform/lookup-autofill.md`

## Constraints
- Calculations are synchronous and pure.
- Module code owns calculations.
- Async work belongs in lookup/enrich/validate, not calculations.
- Manual price override is preserved on product change.
- Tax cascade updates totals.

## Scope
- Implement module-owned line total calculation.
- Implement subtotal calculation.
- Implement tax total calculation.
- Implement grand total calculation.
- Trigger recalculation from committed row/header changes.
- Preserve manually overridden unit price on product change.
- Mark preserved manual price overrides stale when product/tax context changes and cascade behavior preserves the value.

## Out of Scope
- Fetching product, customer, or tax data asynchronously.
- Save-time authoritative validation.
- Complex tax jurisdiction rules not present in the slice spec.
- Multi-currency behavior.

## Dependencies
- Story 002: Sales Invoice Manifest Skeleton.
- Story 003: TransactionGrid Row Engine.
- Story 004: Lookup Runtime Foundation.
- Story 005: Sales Customer and Product Lookup Providers.

## Tasks
- [ ] Define Sales Invoice calculation input and output types.
- [ ] Implement pure line total calculation.
- [ ] Implement pure subtotal calculation excluding deleted and phantom rows.
- [ ] Implement pure tax total calculation excluding deleted and phantom rows.
- [ ] Implement pure grand total calculation.
- [ ] Wire calculation hook references from the Sales Invoice manifest to module-owned functions.
- [ ] Trigger recalculation from committed row/header changes.
- [ ] Implement manual unit price override detection.
- [ ] Preserve manual unit price override on product change by default.
- [ ] Mark preserved price overrides stale when product or tax context changes.
- [ ] Add tests for each calculation function.
- [ ] Add tests for recalculation ordering, deleted-row exclusion, phantom-row exclusion, manual override preservation, and stale marking.

## Implementation Notes
- Treat rounding rules as a spec gap if not already defined in implementation context.
- If a deterministic rounding rule is required to pass tests, document the chosen rule in code comments or implementation notes without modifying specs.
- Calculate from committed row values unless the UI contract explicitly supports previewing buffered edits.

## Risks
- Async enrichment sneaks into calculation functions.
- Manual unit price override is overwritten by product enrich.
- Tax math ambiguity causes unstable tests.
- Footer totals include phantom or deleted rows.

## Acceptance Criteria
- Line totals update from quantity, unit price, and tax-relevant committed values.
- Subtotal, tax total, and grand total update deterministically.
- Product changes preserve manually overridden unit price by default.
- Preserved manual override is marked stale when appropriate.
- Deleted rows and phantom rows are excluded from totals.
- Tests cover line total, subtotal, tax total, grand total, manual override preservation, stale marking, and recalculation ordering.

## Definition of Done
- Sales Invoice calculation functions are implemented in module-owned code.
- Calculation tests prove functions are pure and deterministic.
- No calculation performs async work.
- No specs are modified.
