# Story 009: End-to-End Acceptance Harness

## Goal
Add acceptance coverage proving the Sales Invoice vertical slice validates the Forge platform contracts end to end.

## Source of Truth
- `docs/architecture.md`
- `docs/prd.md`
- `spec/platform/transaction-shell.md`
- `spec/platform/transaction-grid.md`
- `spec/platform/lookup-autofill.md`
- `spec/modules/inventory/product-lookup.md`
- `spec/modules/sales/sales-invoice.md`

## Constraints
- Acceptance tests should verify platform contracts through the Sales Invoice slice.
- Tests must not depend on raw manifest/config access from UI.
- Lookup, enrich, and validation async behavior must be deterministic in tests.
- Barcode flow should target under 300ms where feasible, but correctness comes first for the slice.

## Scope
- Cover Sales Invoice scenario 1: fast keyboard entry.
- Cover Sales Invoice scenario 2: barcode scan to row fill.
- Cover Sales Invoice scenario 3: manual price override preserved on product change.
- Cover Sales Invoice scenario 4: tax cascade updates totals.
- Cover Sales Invoice scenario 5: save blocked or warned for discontinued items.
- Assert cross-cutting invariants: one phantom row, lookup snapshots, stale indicators, save-time revalidation, and non-blocking navigation validation.

## Out of Scope
- Excel paste.
- Undo/redo.
- Bulk edit.
- Full reporting framework.
- Multi-currency edge cases.

## Dependencies
- Story 008: Sales Invoice UI Assembly.

## Tasks
- [ ] Select the E2E test runner and establish deterministic fixture loading.
- [ ] Add stable selectors or semantic interaction hooks for the Sales Invoice screen.
- [ ] Write E2E coverage for fast keyboard entry.
- [ ] Write E2E coverage for barcode scan to row fill.
- [ ] Write E2E coverage for manual price override preserved on product change.
- [ ] Write E2E coverage for tax cascade updating totals.
- [ ] Write E2E coverage for discontinued product block or warning behavior.
- [ ] Add invariant assertions for exactly one phantom row.
- [ ] Add invariant assertions for lookup snapshots and stale indicators.
- [ ] Add save-time revalidation test using changed backend/provider fixture state.
- [ ] Add delayed lookup response test proving generation-token protection.
- [ ] Add validation navigation test proving invalid data does not block movement.
- [ ] Document how to run the acceptance suite.

## Implementation Notes
- Draft acceptance criteria early, but wire executable E2E tests after the UI assembly exists.
- Prefer stable selectors based on semantic roles or stable test IDs.
- Include one delayed lookup response test to prove generation-token protection.
- Keep fixtures small and deterministic.

## Risks
- E2E tests become brittle by asserting implementation details.
- Missing lower-level tests make failures hard to diagnose.
- Async lookup timing creates flaky acceptance runs.
- Performance targets are treated as hard guarantees before infrastructure exists.

## Acceptance Criteria
- E2E suite covers all five Sales Invoice scenarios.
- Tests prove exactly one phantom row exists during normal entry and after save failure.
- Tests prove navigation continues despite validation errors.
- Tests prove save-time validation rechecks provider/backend state.
- Tests prove stale async lookup responses do not overwrite newer row state.

## Definition of Done
- Acceptance harness is implemented.
- All Sales Invoice vertical-slice E2E tests pass.
- E2E tests are deterministic and do not require external services.
- Test coverage maps clearly to the PRD and source specs.
- No specs are modified.
