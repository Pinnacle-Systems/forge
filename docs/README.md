# Forge Documentation

Forge is a contract-driven ERP UI platform for transaction-heavy applications.

This documentation describes the system contracts, platform architecture, locked product decisions, and implementation backlog for the current vertical slice.

## Start Here
- [Vision](vision.md): why Forge exists and what success looks like.
- [Problem Statement](problem-statement.md): the ERP development failure mode Forge is designed to replace.
- [Product Requirements](prd.md): v1 scope, users, outcomes, and governance.
- [Architecture](architecture.md): the platform layers, transaction pipeline, ownership boundaries, and enforcement model.

## System Specifications
Platform specifications define contracts that implementation must satisfy:
- [Manifest Contract](spec/platform/manifest-contract.md)
- [Instance Config Contract](spec/platform/instance-config-contract.md)
- [Merge Engine](spec/platform/merge-engine.md)
- [Transaction Shell](spec/platform/transaction-shell.md)
- [Transaction Grid](spec/platform/transaction-grid.md)
- [Lookup + Autofill](spec/platform/lookup-autofill.md)
- [CustomWidget Contract](spec/platform/custom-widget.md)

Module specifications define module-owned behavior behind platform contracts:
- [Sales Invoice](spec/modules/sales/sales-invoice.md)
- [Inventory Product Lookup](spec/modules/inventory/product-lookup.md)

## Architecture Decisions
ADRs record locked decisions and the reasoning behind them:
- [ADR-001: Form Definition Strategy](decisions/adr-001-form-definition-strategy.md)
- [ADR-002: Two-Layer Contract](decisions/adr-002-two-layer-contract.md)
- [ADR-003: Transaction Grid v1.1](decisions/adr-003-grid-v1.1.md)
- [ADR-004: Lookup + Autofill v1.0](decisions/adr-004-lookup-v1.0.md)
- [ADR-005: Platform Expansion & Customization Governance](decisions/adr-005-platform-expansion-customization-governance.md)
- [ADR-006: Design System Adapter Strategy](decisions/adr-006-design-system-adapter.md)

## Delivery Artifacts
Implementation stories and sprint metadata live under [implementation-artifacts](implementation-artifacts/). These are planning artifacts, not system contracts. If a story conflicts with a specification or ADR, the specification or ADR wins.

## Documentation Rules
- Product docs explain intent and scope.
- Architecture docs explain system shape and ownership boundaries.
- Specs define required behavior and validation contracts.
- ADRs capture durable decisions and tradeoffs.
- Implementation artifacts describe delivery sequence.
