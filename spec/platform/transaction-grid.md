# Transaction Grid v1.1

## Purpose
Keyboard-first interaction engine for transaction rows.

## Locked behavior
- exactly one phantom row
- navigation mode and edit mode
- Enter/Tab/Arrow/F2/Esc/Delete/Backspace/Ctrl+S contract
- validation on commit / row exit / save
- concurrent edit protection
- stale indicator for preserved manual overrides

## Row model
- state: new | dirty | deleted
- snapshot for save-time validation
- metadata for autofill, stale state, buffering

## Performance
- <100 rows full render
- 100–500 virtual scrolling
- >500 chunking + virtualization