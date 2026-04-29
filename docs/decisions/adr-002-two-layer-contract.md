# ADR-002: Two-Layer Contract

## Status
Accepted

## Context
Forge needs customer-instance customization without allowing configuration to become a hidden business-logic layer.

The platform separates developer-owned structure from database-owned instance overrides so variation can be validated, resolved, cached, and rendered safely.

## Decision
Separate:
- Module Manifest (developer-owned)
- Instance Config (database-owned)

## Rules
- Manifest declares the full possible surface
- Config may only override explicitly allowed properties
- Merge engine validates and resolves final runtime definitions
- UI consumes only resolved definitions
- invalid manifests fail hard
- invalid config overrides are ignored with warnings unless the runtime explicitly escalates them in development tooling

## Rationale
The manifest/config split gives module authors a stable contract while allowing customer deployments to change presentation within known limits.

## Consequences
- safe customization
- graceful handling of stale config
- reduced risk of configuration becoming logic
- merge output becomes the only supported runtime input for UI infrastructure
