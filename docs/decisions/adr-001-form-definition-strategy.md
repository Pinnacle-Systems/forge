# ADR-001: Form Definition Strategy

## Decision
Use a hybrid approach:
- master data forms are schema-driven
- transaction forms are shell-driven with configurable field/column manifests

## Why
- fully schema-driven transaction UX becomes a pseudo low-code engine
- fully hand-coded forms regress into copy-paste divergence

## Consequences
- platform must provide strong transaction primitives
- module authors supply manifests and logic hooks
- config remains bounded by override permissions