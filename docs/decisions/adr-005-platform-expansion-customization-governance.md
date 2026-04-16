# ADR-005: Platform Expansion & Customization Governance

## Status
Accepted

## Problem
Platform interaction primitives naturally experience pressure to absorb edge cases.

If every exception becomes a new flag on an existing primitive, the platform accumulates branching behavior and drifts toward unmaintainable "God Components."

If unrestricted custom UI is allowed, the platform loses its contract-driven value and regresses into copy-paste divergence.

Forge must protect core primitives, preserve module velocity, and avoid making Platform Core a bottleneck.

## Decision
Forge will handle conflicting UI requirements through governed platform expansion or isolated custom widgets.

Existing primitives remain locked to their interaction paradigm. New behavior is introduced by:
- using existing contracts correctly
- creating a new primitive when the requirement represents a distinct reusable paradigm
- using a governed `CustomWidget` when the requirement is specific and not yet a platform concern

## Core Primitive Integrity
- Core primitives must not accept manifest flags that fundamentally alter their interaction model
- Core primitives must not contain business-specific conditional UI logic
- Visual deviations must be data-driven through resolved definition metadata, not hard-coded UI rules
- If a module needs row-level styling or similar presentation variance, the module provides metadata and the primitive renders it without interpreting business meaning

## New Primitive Justification
A new interaction primitive is created by Platform Core only when all of the following are true:
- the requirement cannot be met by existing primitives and extension points
- the requirement represents a distinct UX paradigm rather than a minor variation
- the need is proven by at least 3 distinct modules or by 1 safety/compliance-critical mandate

This is the Rule of Three.

## CustomWidget Governance
For specific or emerging requirements, module authors may build a `CustomWidget`.

CustomWidgets are governed by the following rules:
- they are isolated black boxes owned at the module boundary
- they must declare explicit input and output contracts in the manifest
- they must emit standard change payloads back into the transaction buffer
- they may not bypass platform lookup/autofill flows for data access patterns already governed by ADR-004
- they do not weaken merge-engine, manifest, or instance-config contracts

## CustomWidget Pollution Limits
- CI/CD should track CustomWidget usage by module
- if CustomWidgets exceed 20% of a module's UI surface area, the module triggers mandatory architectural review
- any CustomWidget exceeding 200 lines of implementation requires Platform Engineer review

## Primitive Lifecycle
- primitives and CustomWidgets are reviewed annually
- primitives used by fewer than 2 modules for 18 months should be evaluated for deprecation
- CustomWidgets adopted across multiple modules should be candidates for graduation into supported platform primitives

## Graduation Model
- when a requirement is not yet a proven platform concern, the default path is a governed CustomWidget rather than immediate primitive expansion
- module authors proposing a new primitive must provide a short RFC showing why current primitives and extension points are insufficient
- Platform Core harvests repeated patterns from successful CustomWidgets and promotes them into official primitives when justified

## Consequences
- protects core primitives from accumulating technical debt and business-specific branching
- gives module teams a fast path for one-off needs without weakening platform contracts
- shifts the burden of proof for platform expansion toward demonstrated reuse
- protects senior platform bandwidth by making primitive creation intentional and evidence-based
