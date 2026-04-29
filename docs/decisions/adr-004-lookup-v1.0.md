# ADR-004: Lookup + Autofill v1.0

## Status
Accepted

## Context
ERP lookup fields must support fast search, barcode entry, enrichment, cascade behavior, stale-data handling, and authoritative validation at save time.

Lookup selection is not the same as business calculation. Providers resolve entity data; modules decide how that data affects transaction-specific pricing, tax, validation, and persistence.

## Decision
- lookup uses hybrid provider architecture
- lookup selection writes snapshot values to rows
- save-time validation checks authoritative current state
- per-row generation tokens cancel stale cascades
- barcode is a specialized input path through the same lookup field

## Rationale
Snapshot values keep transaction rows stable after selection while save-time revalidation protects against stale or invalid backend state. Generation tokens prevent late async responses from overwriting newer user intent.

## Consequences
- lookup providers must not own transaction-specific business rules
- cascade behavior defaults to preserve
- preserved manual overrides may be marked stale
- save orchestration must include authoritative lookup revalidation before persistence
