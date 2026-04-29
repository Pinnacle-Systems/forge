# System Specifications

Specifications define required Forge behavior. They are implementation contracts, not planning notes.

## Platform Contracts
- [Manifest Contract](platform/manifest-contract.md): developer-owned transaction structure and allowed overrides.
- [Instance Config Contract](platform/instance-config-contract.md): safe customer-instance customization.
- [Merge Engine](platform/merge-engine.md): validation and deterministic resolution into runtime-safe definitions.
- [Transaction Shell](platform/transaction-shell.md): fixed header/body/footer layout, dirty state, validation aggregation, and save orchestration.
- [Transaction Grid](platform/transaction-grid.md): keyboard-first row interaction, phantom row behavior, validation timing, and concurrency handling.
- [Lookup + Autofill](platform/lookup-autofill.md): entity resolution, enrichment, cascade behavior, stale handling, and save-time revalidation.
- [CustomWidget Contract](platform/custom-widget.md): governed module-owned UI escape hatch.

## Module Contracts
- [Sales Invoice](modules/sales/sales-invoice.md): vertical slice used to validate the platform.
- [Inventory Product Lookup](modules/inventory/product-lookup.md): product-master lookup provider contract.

## Precedence
If documents conflict, use this order:
1. Accepted ADRs
2. Platform specifications
3. Module specifications
4. Product requirements
5. Implementation stories
