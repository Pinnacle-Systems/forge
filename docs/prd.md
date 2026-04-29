# Product Requirements

## Objective
Create a reusable ERP UI platform for transaction-heavy applications.

## Users
- Internal developers building customer-specific ERP apps
- Business users entering sales, purchase, and inventory transactions

## Primary outcomes
- Keyboard-first data entry
- Zero copy-paste transaction forms
- Safe module reuse
- Configurable presentation without business logic drift

## Product principles
- Deterministic structure, configurable presentation, module-owned logic.
- UI consumes resolved definitions, never raw manifests or raw instance config.
- TransactionGrid is an interaction engine, not a business engine.
- Validation never blocks navigation; save is blocked by unresolved errors.
- Async work belongs in lookup, enrichment, and authoritative validation flows.

## In scope
- TransactionShell
- TransactionGrid
- Lookup + Autofill
- Manifest + Config + Merge system
- Sales Invoice vertical slice

## Out of scope for v1
- Excel paste
- Undo/redo
- Bulk edit
- Full reporting framework
- Multi-currency edge cases

## Functional requirements
- Forms use fixed header/footer and scrollable body
- Grid supports phantom row and keyboard navigation
- Lookup supports search, resolve, enrich, validate
- Save-time validation supports warn/block/ignore policy
- Modules own business calculations and validation

## Non-functional requirements
- Responsive under 100 rows with no virtualization
- Virtualization beyond 100 rows
- Barcode flow under 300ms target where feasible
- Contracts must fail fast on invalid manifests and degrade gracefully on invalid config

## Delivery model
- Platform core ownership is senior-led
- One senior engineer owns Platform Core, Merge Engine, and TransactionShell
- Five to six junior engineers primarily extend the platform through module manifests and instance configs for specific verticals
- Work that requires new platform escape hatches or contract exceptions requires senior review before implementation

## Governance rules
- If it needs async business logic, it is a module concern rather than a manifest, config, merge, or shell concern
- If it needs custom UI beyond config-driven presentation, it must be treated as an explicit platform extension rather than ad hoc branching
- Customer-specific needs should first be framed as reusable platform or module extensions, not one-off exceptions

## Related documents
- [Architecture](architecture.md)
- [ADR-005: Platform Expansion & Customization Governance](decisions/adr-005-platform-expansion-customization-governance.md)
- [CustomWidget Contract](spec/platform/custom-widget.md)
