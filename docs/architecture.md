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