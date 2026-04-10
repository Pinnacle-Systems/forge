# Lookup + Autofill v1.0

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