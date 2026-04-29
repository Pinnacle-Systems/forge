# ADR-001: Form Definition Strategy

## Status
Accepted

## Context
Forge must support repeatable ERP screens without turning transaction UX into either copied hand-coded forms or an unbounded low-code runtime.

Master data screens and transaction screens have different interaction needs. Master data screens are usually record-oriented. Transaction screens require shell orchestration, keyboard-first line entry, lookup enrichment, validation timing, and save lifecycle control.

## Decision
Use a hybrid approach:
- master data forms are schema-driven
- transaction forms are shell-driven with configurable field/column manifests

## Rationale
- fully schema-driven transaction UX becomes a pseudo low-code engine
- fully hand-coded forms regress into copy-paste divergence
- shell-driven transaction forms preserve deterministic interaction behavior while allowing bounded structure and presentation changes
- schema-driven master data forms provide enough reuse without overfitting the transaction engine

## Consequences
- platform must provide strong transaction primitives
- module authors supply manifests and logic hooks
- config remains bounded by override permissions
- TransactionShell and TransactionGrid remain first-class platform primitives rather than generic form renderers
