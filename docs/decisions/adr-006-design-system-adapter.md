# ADR-006: Design System Adapter Strategy

## Status
Accepted

## Context
Forge needs a reusable presentation layer for transaction shells, dense forms, lookup controls, validation messaging, overlays, and operational navigation.

The design system must support Forge's contract-driven architecture without becoming a source of business logic or weakening platform-owned interaction contracts.

The current candidates are:
- Atlassian Design System
- Palantir Blueprint

## Decision
Forge will use Palantir Blueprint as the default visual/component foundation for platform UI.

Forge will keep a design-system adapter boundary between resolved runtime definitions and rendered components:

```txt
ResolvedTransactionDefinition
-> Forge renderer primitives
-> Design system adapter
-> Blueprint components and tokens
```

Atlassian Design System may be used as a product-pattern reference for concepts such as flags, empty states, inline messaging, and drag/drop patterns, but it is not the default component foundation.

## Rationale
Blueprint is a better fit for Forge's first-class workflows:
- dense desktop ERP screens
- keyboard-first transaction entry
- complex forms and lookup flows
- operational tables and data-heavy layouts
- neutral enterprise application styling

Atlassian Design System is strong for collaboration and productivity surfaces, but its visual language and ecosystem assumptions are more Atlassian-product-oriented than Forge's ERP-oriented transaction model.

Forge also needs to avoid coupling its manifest contract to any design-system-specific component names, variants, or props.

## Rules
- Manifests must express Forge primitives such as field, lookup, section, action, and grid intent; they must not name Blueprint or Atlassian components directly.
- Instance config may only alter presentation properties explicitly allowed by `overridePermissions`.
- The UI may consume only resolved definitions produced by the merge engine.
- Blueprint components may render forms, buttons, menus, dialogs, popovers, selects, date inputs, icons, and layout primitives.
- TransactionGrid behavior remains Forge-owned, even if Blueprint styles, tokens, inputs, menus, or table-adjacent components are used inside it.
- Calculations, validation, lookup providers, enrichment, and persistence remain module-owned or platform-owned according to existing contracts.
- Design-system adapters must not introduce customer-specific branching in platform code.

## Consequences
- Forge gains a mature component foundation without turning manifests into UI-library configuration.
- The platform can replace or supplement Blueprint later by changing adapter implementations rather than manifest contracts.
- TransactionGrid remains an interaction engine, not a wrapped third-party table with business behavior hidden inside it.
- Design-system evaluation remains practical: new candidates are assessed by adapter fit, density, accessibility, keyboard behavior, licensing, and contract compatibility.

## Open Notes
- Atlassian package licensing should be reviewed before any direct dependency is adopted outside Atlassian-integrated use cases.
- If a future customer or deployment requires a different visual system, that should be implemented as another adapter rather than a forked platform UI.
