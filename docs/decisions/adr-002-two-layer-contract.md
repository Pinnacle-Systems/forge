# ADR-002: Two-Layer Contract

## Decision
Separate:
- Module Manifest (developer-owned)
- Instance Config (database-owned)

## Rules
- Manifest declares the full possible surface
- Config may only override explicitly allowed properties
- Merge engine validates and resolves final runtime definitions

## Consequences
- safe customization
- graceful handling of stale config
- reduced risk of configuration becoming logic