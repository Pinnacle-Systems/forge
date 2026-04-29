# Lookup + Autofill v1.0

See also: ADR-004 for locked lookup decisions.

## Purpose
Provide entity resolution, search, enrich, validate, barcode integration, and cascade orchestration.

## Contracts
- LookupProvider
- LookupRegistry
- LookupCache
- CascadeEngine

## Locked behavior
- selection creates snapshot
- save revalidates against current backend state
- preserve/reset/prompt cascade behavior
- preserve is default
- stale fields are visually marked
- generation token per row prevents stale async overwrite

## Save-time validation
- lookup revalidation is part of the blocking save-time validation pass
- save remains blocked while authoritative lookup validation is unresolved
- lookup revalidation timeout target is 2 seconds per save pass
- timeout or provider failure produces a save error that surfaces stale-data retry guidance

## Failure handling
- if a lookup or cascade step fails after a prior value exists, preserve existing values and mark dependent fields stale
- lookup failure must not clear previously preserved values to null unless the user explicitly resets them
- barcode scan targets 300ms end-to-end field population where feasible; slower authoritative validation may continue through the standard async lookup flow

## Error contracts
- lookup validation failures should expose stable error codes such as `ERR_LOOKUP_REVALIDATION_FAILED` and `ERR_LOOKUP_TIMEOUT`
