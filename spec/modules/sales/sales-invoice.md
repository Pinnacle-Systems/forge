# Sales Invoice Vertical Slice

See also: ADR-001, ADR-003, ADR-004, and ADR-005.

## Goal
Validate the platform end-to-end with one realistic transaction.

## Header fields
- customer lookup
- invoice date
- reference

## Grid columns
- product lookup
- quantity
- unit price
- tax code
- line total

## Footer
- subtotal
- tax total
- grand total

## Module-owned calculations
- customer pricing is applied by Sales Invoice module calculations after product lookup resolution
- tax cascade is referenced from the manifest through stable calculation identifiers
- calculations remain synchronous and pure and update the transaction buffer, not the lookup provider

## Provider usage
- product lookup uses `inventory.product` for search, resolve, and product-master enrichment
- lookup does not apply customer-specific pricing, quantity breaks, or promotional pricing

## Validation policy
- discontinued item validation may be declared with severity `block` or `warn`
- `block` prevents save until resolved
- `warn` requires explicit user acknowledgment through the shell save flow before save proceeds

## Preservation rules
- manual unit price edits mark the field as preserved in row metadata
- later product lookup cascades must not overwrite preserved fields
- preserved values may be marked stale when upstream lookup data changes

## Scenarios
1. Fast keyboard entry
2. Barcode scan to row fill
3. Manual price override preserved on product change
4. Tax cascade updates totals
5. Save blocked or warned for discontinued items
