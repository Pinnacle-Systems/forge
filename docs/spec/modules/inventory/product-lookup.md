# Product Lookup Provider

See also: ADR-004 for lookup/runtime boundaries.

## Provider ID
inventory.product

## Search fields
- SKU
- product name
- barcode

## Resolve behavior
- exact ID lookup
- enrich returns product master data only: description, base unit price, tax code, unit of measure, stock status

## Boundary rules
- customer-specific pricing is not owned by the lookup provider
- quantity breaks, promotional pricing, and customer price lists are transaction-level calculations owned by the consuming module
- the provider must not require transaction header context to resolve product master data

## Registration
- declared in the module manifest through a stable lookup provider reference
- validated at build/registration time against the platform lookup provider contract

## Validation behavior
- discontinued product rules
- validity date rules
