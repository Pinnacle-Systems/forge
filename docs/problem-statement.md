# Problem Statement

Current ERP applications have grown through copy-paste reuse of forms and screens.

This creates predictable failure modes:
- inconsistent UX
- duplicated logic
- dead code kept “just in case”
- fear of changing deployed apps
- slow customer onboarding
- config toggles backed by duplicated code instead of reusable modules

Forge solves this by introducing:
- a two-layer contract (manifest + instance config)
- reusable shells and interaction engines
- module-owned business logic
- safe runtime resolution

## Desired shift
ERP variation should be expressed through stable contracts instead of forks.

Customer-specific differences should become manifest structure, allowed config overrides, module-owned providers, or governed extension points. They should not become conditional branches inside platform UI.
