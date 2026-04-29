# ADR-003: Transaction Grid v1.1

## Status
Accepted

## Context
ERP transaction entry is a power-user workflow. The grid must be predictable under keyboard navigation, lookup enrichment, validation, row creation, row deletion, and concurrent updates.

The grid is a platform interaction primitive. It must not become a business engine or a wrapper around customer-specific behavior.

## Decision
- grid is keyboard-first
- exactly one phantom row
- row states: new, dirty, deleted
- buffer sync tracked via metadata
- validation does not block navigation
- save blocks on unresolved errors
- concurrent edit protection queues external updates

## Rationale
These decisions keep row interaction deterministic and make validation timing explicit. The phantom row model allows continuous data entry without mixing empty persisted rows into the transaction buffer.

## Consequences
- modules provide calculations and validation rules, but the grid owns navigation, buffering, row state, and edit-mode transitions
- async lookup and enrichment flows must re-enter the grid through platform contracts
- save-time validation remains the final blocking gate for unresolved row errors
