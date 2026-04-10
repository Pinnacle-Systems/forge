# ADR-003: Transaction Grid v1.1

## Locked decisions
- grid is keyboard-first
- exactly one phantom row
- row states: new, dirty, deleted
- buffer sync tracked via metadata
- validation does not block navigation
- save blocks on unresolved errors
- concurrent edit protection queues external updates