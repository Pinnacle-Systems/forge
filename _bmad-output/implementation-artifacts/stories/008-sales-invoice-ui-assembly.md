# Story 008: Sales Invoice UI Assembly

## Goal
Compose the runtime definition, TransactionShell, TransactionGrid, lookup runtime, calculations, validation, and save orchestration into a usable Sales Invoice screen.

## Source of Truth
- `docs/architecture.md`
- `docs/prd.md`
- `spec/platform/transaction-shell.md`
- `spec/platform/transaction-grid.md`
- `spec/platform/lookup-autofill.md`
- `spec/modules/sales/sales-invoice.md`

## Constraints
- UI consumes only resolved definitions.
- Header and footer are fixed.
- Body scrolls.
- Grid is keyboard-first.
- TransactionGrid remains an interaction engine.
- TransactionShell coordinates header, body, footer, dirty state, save lifecycle, and validation aggregation.

## Scope
- Render Sales Invoice from `ResolvedTransactionDefinition`.
- Host header fields: customer lookup, invoice date, reference.
- Host grid columns: product lookup, quantity, unit price, tax code, line total.
- Host footer summary: subtotal, tax total, grand total.
- Display validation and stale field states.
- Wire lookup selection, barcode fill, calculation updates, and save lifecycle.
- Preserve fixed header/footer with scrollable body layout.

## Out of Scope
- Marketing or landing page UI.
- Customer-specific UI branching.
- Full reporting or print/export behavior.

## Dependencies
- Story 001: Runtime Transaction Definition Contract.
- Story 002: Sales Invoice Manifest Skeleton.
- Story 003: TransactionGrid Row Engine.
- Story 004: Lookup Runtime Foundation.
- Story 005: Sales Customer and Product Lookup Providers.
- Story 006: Sales Invoice Calculations.
- Story 007: Validation and Save Orchestration.

## Tasks
- [ ] Create the Sales Invoice screen route or entry point.
- [ ] Resolve the Sales Invoice transaction definition before rendering.
- [ ] Render header fields from the resolved definition.
- [ ] Render TransactionGrid columns from the resolved definition.
- [ ] Render footer totals from resolved footer definitions and calculation state.
- [ ] Wire customer lookup selection into header snapshot state.
- [ ] Wire product lookup selection into row snapshot state.
- [ ] Wire barcode input into the product lookup/enrich flow.
- [ ] Display validation states and stale-field indicators generically.
- [ ] Implement fixed header, scrollable body, and fixed footer layout.
- [ ] Wire save action and Ctrl+S to TransactionShell save lifecycle.
- [ ] Add component or integration tests for layout, resolved-definition rendering, keyboard entry, lookup fill, stale state display, totals, and save behavior.

## Implementation Notes
- Do not read raw manifest or raw instance config from UI components.
- Keep stale indicators and validation display generic.
- Ensure footer totals do not include phantom or deleted rows.
- Use the Sales Invoice screen as a contract proof, not a one-off custom form.

## Risks
- UI reaches around the resolved-definition contract for convenience.
- Header/footer layout regresses when grid body scrolls.
- Buffered edits cause footer totals to flicker or calculate from inconsistent state.
- Business logic leaks into presentation handlers.

## Acceptance Criteria
- Sales Invoice renders from `ResolvedTransactionDefinition`.
- Header and footer remain fixed while the body scrolls.
- Fast keyboard entry works end to end.
- Barcode scan fills a row through lookup runtime.
- Manual price override survives product change and shows stale state when appropriate.
- Tax cascade updates footer totals.
- Save blocks or enters an explicit warning-confirmation flow for discontinued items according to module validation policy.

## Definition of Done
- Sales Invoice UI is assembled and usable.
- Component or integration tests cover fixed shell layout, resolved-definition rendering, keyboard entry, lookup fill, stale state display, totals, and save behavior.
- No raw manifest/config access exists in UI code.
- No specs are modified.
