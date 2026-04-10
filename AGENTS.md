# Forge Working Agreement

Forge is a contract-driven ERP UI platform.

## Core principles
- Deterministic structure, configurable presentation, module-owned logic.
- No business logic in manifests or instance config.
- UI consumes only resolved definitions, never raw manifest or raw config.
- No customer-specific branching in platform code.
- TransactionGrid is an interaction engine, not a business engine.

## Architecture boundaries
- Manifest defines structure and allowed overrides.
- Instance config only changes properties explicitly allowed by overridePermissions.
- Merge engine validates and resolves manifest + config into runtime-safe definitions.
- Module code owns calculations, validation, lookup providers, and persistence rules.

## Transaction form rules
- Header/footer are fixed; body scrolls.
- Grid is keyboard-first.
- Exactly one phantom row exists at all times.
- Calculations are synchronous and pure.
- Async work belongs in lookup/enrich flows, not calculations.
- Validation never blocks navigation; save is blocked on unresolved errors.

## Lookup rules
- Lookup selection creates snapshot values in the row.
- Save-time validation rechecks authoritative backend rules.
- Cascade behavior defaults to preserve.
- Preserved manual overrides may be marked stale.

## Before coding
1. Read `docs/architecture.md`
2. Read the relevant `spec/platform/*.md`
3. Read the relevant `spec/modules/**`
4. Summarize constraints being applied
5. Make the smallest valid change
6. Add or update tests

## When implementing
- Prefer extension through manifests, providers, and hooks over custom UI branching.
- Do not weaken contracts to satisfy one customer-specific case.
- If a request does not fit the contract, propose a platform extension first.

## Definition of done
- Behavior matches spec
- No contract violations
- Tests added or updated
- Notes added if a spec gap was found