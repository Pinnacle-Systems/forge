# Transaction Shell

See also: ADR-001 for the shell-driven transaction form strategy.

## Purpose
Coordinate header, body, footer, dirty state, save lifecycle, and validation aggregation.

## Layout
- fixed header
- scrollable body
- fixed footer

## Responsibilities
- host header-positioned fields from the resolved manifest definition
- host grid
- host summary footer
- aggregate save-time validation from header, grid, and shell-level cross-field rules
- expose save lifecycle to module hooks and platform observers

## Save lifecycle
- shell owns save orchestration
- shell exposes pending `isSaving` state and blocks conflicting interaction during save
- shell remains the only component allowed to initiate final persistence
- validation severities may include `block` and `warn`
- `block` stops save until resolved
- `warn` requires explicit user acknowledgment in the shell save flow before persistence continues
