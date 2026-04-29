# Transaction Grid v1.1

See also: ADR-003 for locked grid decisions.

## Purpose
Keyboard-first interaction engine for transaction rows.

## Locked behavior
- exactly one phantom row
- navigation mode and edit mode
- Enter/Tab/Arrow/F2/Esc/Delete/Backspace/Ctrl+S contract
- validation on commit / row exit / save
- concurrent edit protection
- stale indicator for preserved manual overrides

## Validation semantics
- commit means a cell value is accepted into the row buffer by blur or explicit edit-mode commit action
- row exit means focus/navigation leaves the current row for another row context
- validation on save remains blocking for unresolved errors, consistent with ADR-003

## Concurrency
- concurrent edit protection is optimistic and version-aware
- external row updates are queued and surfaced through the grid's existing concurrent edit protection flow rather than silently overwriting local edits
- exact transport/runtime mechanisms may vary, but the grid contract requires deterministic user-visible conflict handling

## Row model
- state: new | dirty | deleted
- snapshot for save-time validation
- metadata for autofill, stale state, buffering
- preserved manual overrides are tracked in row metadata so cascade/update flows can skip protected fields

## Performance
- <100 rows full render
- 100–500 virtual scrolling
- >500 chunking + virtualization
- default row height should remain fixed or measurable enough to preserve virtualization correctness
