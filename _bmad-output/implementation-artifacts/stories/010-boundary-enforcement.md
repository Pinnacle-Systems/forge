# Story 010: Module Boundary Enforcement

## Status
ready-for-dev

## Goal
Add workspace-level enforcement so Forge module boundaries are validated by tooling, not just by convention and review.

## Source of Truth
- `docs/architecture.md`
- `docs/prd.md`
- `docs/decisions/adr-002-two-layer-contract.md`
- `docs/decisions/adr-005-platform-expansion-customization-governance.md`
- `spec/platform/manifest-contract.md`
- `spec/platform/custom-widget.md`

## Constraints Applied
- Platform code must not import module-owned business code.
- Inventory must not import Sales code.
- Sales may depend on Platform and Inventory for the current vertical slice.
- Boundary enforcement must be as small and deterministic as possible.
- Tooling must fail fast when a new cross-module dependency violates the allowed graph.
- Enforcement belongs in repo config and CI-facing scripts, not only in human process docs.

## Scope
- Add Nx workspace metadata for Forge packages.
- Tag projects so dependency rules can distinguish platform and modules.
- Add ESLint configuration with `@nx/enforce-module-boundaries`.
- Add a small backup `no-restricted-imports` rule for obvious forbidden imports.
- Add package scripts for linting boundaries.
- Document the enforcement as an implementation artifact.

## Out of Scope
- Refactoring package structure beyond what is needed for tagging and lint targets.
- Adding UI/application packages.
- Broad style linting unrelated to dependency boundaries.
- CI pipeline authoring beyond the scripts needed locally.

## Dependencies
- Existing package layout under `packages/platform`, `packages/modules/sales`, and `packages/modules/inventory`.

## Project Tags
- `@forge/platform`: `scope:platform`, `type:platform`
- `@forge/sales`: `scope:module`, `domain:sales`, `type:module`
- `@forge/inventory`: `scope:module`, `domain:inventory`, `type:module`

## Dependency Rules
- Platform may import only Platform.
- Inventory may import Platform and Inventory.
- Sales may import Platform, Sales, and Inventory.
- No module may import another module unless explicitly allowed by the dependency rules above.

## Exact File Targets
Add or update:

```text
package.json
nx.json
eslint.config.mjs
packages/platform/project.json
packages/modules/sales/project.json
packages/modules/inventory/project.json
_bmad-output/implementation-artifacts/stories/010-boundary-enforcement.md
```

## Implementation Notes
- Prefer Nx project tags plus `@nx/enforce-module-boundaries` as the primary rule.
- Keep ESLint focused on import boundaries first; do not introduce a large style-lint surface in this story.
- Add a root `lint` script and a boundary-focused script that can be used in CI.
- If dependency installation is required, keep the added toolchain minimal.

## Acceptance Criteria
- The repo contains Nx project metadata for platform, sales, and inventory.
- ESLint can evaluate TypeScript files in `packages/**`.
- A boundary rule exists that rejects forbidden imports across platform and modules.
- Root scripts exist for running lint checks.
- The configured rules allow the current valid graph and reject obvious invalid edges.

## Definition of Done
- Boundary-enforcement config is committed in repo.
- Tooling dependencies are declared.
- Lint command runs successfully on the current codebase.
- Existing tests still pass after tooling changes.
