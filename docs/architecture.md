# Architecture

Forge is a contract-driven ERP UI platform. The architecture keeps structure, presentation, and business behavior separated so customer variation does not become platform branching.

## Layers
Forge is organized into four ownership layers:

1. Platform Core
2. UI Infrastructure
3. Module Layer
4. Instance Configuration

## Layer responsibilities
Platform Core owns runtime-safe contracts:
- manifest validation
- instance-config validation
- merge and resolution
- shell orchestration
- grid interaction contracts
- lookup runtime contracts

UI Infrastructure owns rendering of resolved definitions:
- design-system adapters
- shared visual primitives
- layout implementation
- accessibility and keyboard affordances

Module Layer owns business behavior:
- manifests
- lookup providers
- calculations
- validation rules
- persistence rules
- schema and migrations

Instance Configuration owns allowed presentation changes:
- labels
- visibility
- ordering
- widths
- primitive defaults
- other properties explicitly allowed by `overridePermissions`

## Transaction pipeline
```txt
Module Code
-> TransactionManifest
-> InstanceConfig
-> Merge Engine
-> ResolvedTransactionDefinition
-> TransactionShell / TransactionGrid / Lookup Runtime
```

## Hard rules
- UI never consumes raw config
- UI never consumes raw manifests
- Config cannot alter business logic
- Calculations are synchronous and pure
- Async work is isolated to lookup/enrich/validate
- No customer-specific branching in platform code
- If a requirement needs async business logic, it belongs in a module

## Boundary rules
- Manifest defines structure and allowed overrides.
- Instance config only changes properties explicitly allowed by `overridePermissions`.
- Merge engine validates and resolves manifest + config into runtime-safe definitions.
- Module code owns calculations, validation, lookup providers, and persistence rules.
- TransactionShell owns save orchestration.
- TransactionGrid owns keyboard-first row interaction, not business behavior.

## Enforcement
- Nx dependency rules must prevent cross-module imports except through approved platform extension points
- CI must validate manifests against platform schema/contracts and fail the build on invalid manifests
- Escape hatches that move behavior out of the standard manifest/config contract require senior review before adoption

## Related decisions
- [ADR-001: Form Definition Strategy](decisions/adr-001-form-definition-strategy.md)
- [ADR-002: Two-Layer Contract](decisions/adr-002-two-layer-contract.md)
- [ADR-005: Platform Expansion & Customization Governance](decisions/adr-005-platform-expansion-customization-governance.md)
- [ADR-006: Design System Adapter Strategy](decisions/adr-006-design-system-adapter.md)
