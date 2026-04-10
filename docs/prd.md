# PRD — Forge ERP UI Platform

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