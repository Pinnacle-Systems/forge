# Story 005: Sales Customer and Product Lookup Providers

## Goal
Implement the module/provider lookup behavior needed for Sales Invoice customer selection, product selection, barcode fill, and save-time product validation.

## Source of Truth
- `docs/architecture.md`
- `docs/prd.md`
- `spec/platform/lookup-autofill.md`
- `spec/modules/inventory/product-lookup.md`
- `spec/modules/sales/sales-invoice.md`

## Constraints
- Module code owns lookup providers and backend-authoritative validation rules.
- Product lookup provider ID is `inventory.product`.
- Product lookup supports SKU, product name, and barcode search.
- Product resolve supports exact ID lookup.
- Enrich may apply customer pricing or quantity-based pricing.
- Product validation covers discontinued product rules and validity date rules.
- Barcode flow must enter through lookup/enrich, not grid-specific business logic.

## Scope
- Implement a Sales customer lookup provider for header selection.
- Implement or register the Inventory product lookup provider for row selection.
- Support barcode resolution into the same product selection/enrich pipeline.
- Populate product row snapshots needed by Sales Invoice: product identity, display values, unit price, default tax code, and discontinued/validity metadata.
- Provide deterministic in-memory fixtures or a test backend for the vertical slice.

## Out of Scope
- Full inventory module.
- Real external backend integration.
- Persistence beyond what save validation needs for the slice.

## Dependencies
- Story 004: Lookup Runtime Foundation.

## Tasks
- [ ] Create deterministic fixture data for customers and products.
- [ ] Implement Sales customer lookup provider search and resolve behavior.
- [ ] Implement Inventory product lookup provider with provider ID `inventory.product`.
- [ ] Support product search by SKU, product name, and barcode.
- [ ] Implement exact product ID resolve behavior.
- [ ] Implement product enrich output for unit price, tax code, and display snapshot values.
- [ ] Implement barcode resolution through the product provider pipeline.
- [ ] Implement product validation output for discontinued and validity-date conditions.
- [ ] Register customer and product providers with the lookup registry.
- [ ] Add tests for customer search, resolve, and snapshot output.
- [ ] Add tests for product search, resolve, enrich, barcode resolve, and validation output.
- [ ] Add tests proving barcode flow uses lookup/enrich rather than grid business logic.

## Implementation Notes
- Keep provider APIs shaped like backend-authoritative services even if fixtures are local.
- Preserve the boundary between Sales and Inventory by registering the product provider through the lookup registry.
- Customer-specific pricing may be modeled as enrich output, not as grid logic or manifest logic.

## Risks
- Inventory concerns become embedded in Sales platform code.
- Barcode scan bypasses lookup snapshot semantics.
- Discontinued status is treated as final at lookup time instead of rechecked at save.

## Acceptance Criteria
- Customer lookup fills header snapshot values.
- Product lookup fills row snapshot values.
- Barcode scan fills a row through the lookup/enrich pipeline.
- Product provider supports SKU, name, and barcode search.
- Product save-time validation can return discontinued or validity-date results.
- Tests cover search, resolve, enrich, barcode resolve, snapshots, and discontinued metadata.

## Definition of Done
- Customer and product providers are registered through lookup runtime.
- Sales Invoice can select customer and product values using provider contracts.
- Barcode-to-row-fill scenario works in tests.
- No platform code branches on product, customer, tax, or invoice semantics.
- No specs are modified.
