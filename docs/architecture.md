# Architecture Overview

## Four-layer model
1. Platform Core
2. UI Infrastructure
3. Module Layer
4. Instance Configuration

## Transaction pipeline
Module Code
→ TransactionManifest
→ InstanceConfig
→ Merge Engine
→ ResolvedTransactionDefinition
→ TransactionShell / TransactionGrid / Lookup Runtime

## Hard rules
- UI never consumes raw config
- Config cannot alter business logic
- Calculations are synchronous and pure
- Async work is isolated to lookup/enrich/validate
- No customer-specific branching in platform code
- If a requirement needs async business logic, it belongs in a module

## Module boundaries
Modules own:
- manifests
- providers
- calculations
- validations
- schema/migrations

Platform owns:
- runtime resolution
- interaction engines
- layout contracts
- caching/orchestration

## Enforcement
- Nx dependency rules must prevent cross-module imports except through approved platform extension points
- CI must validate manifests against platform schema/contracts and fail the build on invalid manifests
- Escape hatches that move behavior out of the standard manifest/config contract require senior review before adoption

See also: ADR-005 for platform expansion, `CustomWidget` governance, and primitive graduation rules.
