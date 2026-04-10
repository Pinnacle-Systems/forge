# Story 004: Lookup Runtime Foundation

## Goal
Implement the platform lookup and autofill orchestration layer used by Sales Invoice customer, product, and barcode flows.

## Source of Truth
- `docs/architecture.md`
- `docs/prd.md`
- `spec/platform/lookup-autofill.md`
- `spec/platform/transaction-grid.md`

## Constraints
- Async work belongs in lookup, enrich, and validate flows, not calculations.
- Lookup selection creates snapshot values in the row.
- Save-time validation rechecks authoritative backend rules.
- Cascade behavior defaults to preserve.
- Preserved manual overrides may be marked stale.
- A generation token per row prevents stale async overwrite.

## Scope
- Define and implement `LookupProvider`.
- Define and implement `LookupRegistry`.
- Define and implement `LookupCache`.
- Define and implement `CascadeEngine`.
- Write snapshot values on selection.
- Implement preserve/reset/prompt cascade modes with preserve as default.
- Mark stale fields when preserved manual overrides survive upstream changes.
- Guard async lookup/enrich responses using per-row generation tokens.

## Out of Scope
- Inventory product provider implementation.
- Sales customer provider implementation.
- Sales Invoice calculation logic.
- Save persistence.

## Dependencies
- Story 003: TransactionGrid Row Engine.

## Tasks
- [ ] Define `LookupProvider` contract for search, resolve, enrich, and validate operations.
- [ ] Implement `LookupRegistry` for provider registration and lookup by provider ID.
- [ ] Implement `LookupCache` for deterministic cache behavior without replacing save-time validation.
- [ ] Define cascade metadata and preserve/reset/prompt behavior.
- [ ] Implement `CascadeEngine` with preserve as the default behavior.
- [ ] Implement snapshot write behavior on lookup selection.
- [ ] Implement stale-field metadata for preserved manual overrides.
- [ ] Implement per-row generation token handling for async lookup and enrich flows.
- [ ] Add tests for provider registration and missing-provider diagnostics.
- [ ] Add tests for selection snapshots and cascade modes.
- [ ] Add tests proving stale async responses cannot overwrite newer row state.

## Implementation Notes
- Keep the platform runtime entity-agnostic.
- Make stale metadata visible to UI consumers without dictating presentation.
- Cache lookup results only as an optimization; never treat cached values as save-authoritative.

## Risks
- Delayed lookup responses overwrite newer row edits.
- Cascade logic becomes product-specific.
- Cache behavior masks stale authoritative backend state.

## Acceptance Criteria
- Lookup selection writes snapshot metadata into the target row or header field.
- Out-of-order async lookup responses are ignored.
- Preserve cascade is the default behavior.
- Preserved manual overrides can be marked stale.
- Tests cover lookup registration, selection snapshots, cache use, cascade modes, and generation-token protection.

## Definition of Done
- Lookup runtime contracts and orchestration are implemented.
- Tests prove stale async overwrites are prevented.
- No product, customer, tax, or invoice business semantics exist in platform lookup runtime.
- No specs are modified.
