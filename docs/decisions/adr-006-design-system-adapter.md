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

For TransactionGrid, Forge will prefer a Forge-owned dense grid renderer styled with Blueprint-compatible tokens and primitives over adopting `@blueprintjs/table` as the grid implementation.

Blueprint table components may still be used as references for density, sizing, borders, scrolling affordances, and visual behavior. They may also be reconsidered for non-transactional, read-mostly data tables. They must not own TransactionGrid focus, selection, keyboard dispatch, edit lifecycle, validation timing, row state, or phantom-row behavior.

## Rationale
Blueprint is a better fit for Forge's first-class workflows:
- dense desktop ERP screens
- keyboard-first transaction entry
- complex forms and lookup flows
- operational tables and data-heavy layouts
- neutral enterprise application styling

Atlassian Design System is strong for collaboration and productivity surfaces, but its visual language and ecosystem assumptions are more Atlassian-product-oriented than Forge's ERP-oriented transaction model.

Forge also needs to avoid coupling its manifest contract to any design-system-specific component names, variants, or props.

`@blueprintjs/table` overlaps with platform-owned TransactionGrid responsibilities: spreadsheet selection, focus regions, keyboard behavior, editable cells, and virtualized cell mounting. Adapting it for transaction entry would require suppressing or bridging those behaviors into Forge's row engine, increasing the chance of two competing interaction models.

A custom dense TransactionGrid renderer keeps Blueprint adoption at the presentation layer while preserving Forge's existing grid contract. It can reuse Blueprint inputs, buttons, icons, menus, popovers, and styling conventions inside cells without delegating interaction ownership to a third-party table engine.

## Rules
- Manifests must express Forge primitives such as field, lookup, section, action, and grid intent; they must not name Blueprint or Atlassian components directly.
- Instance config may only alter presentation properties explicitly allowed by `overridePermissions`.
- The UI may consume only resolved definitions produced by the merge engine.
- Blueprint components may render forms, buttons, menus, dialogs, popovers, selects, date inputs, icons, and layout primitives.
- TransactionGrid behavior remains Forge-owned, even if Blueprint styles, tokens, inputs, menus, or table-adjacent components are used inside it.
- TransactionGrid dense rendering should be implemented as a Forge renderer/adapter. It must map resolved rows and columns to visual cells while forwarding all navigation, edit, validation, lookup, and save commands through Forge contracts.
- `@blueprintjs/table` must not be used as the TransactionGrid engine unless a future ADR explicitly accepts how its focus, selection, editing, virtualization, and keyboard model will be reconciled with ADR-003.
- Calculations, validation, lookup providers, enrichment, and persistence remain module-owned or platform-owned according to existing contracts.
- Design-system adapters must not introduce customer-specific branching in platform code.

## Consequences
- Forge gains a mature component foundation without turning manifests into UI-library configuration.
- The platform can replace or supplement Blueprint later by changing adapter implementations rather than manifest contracts.
- TransactionGrid remains an interaction engine, not a wrapped third-party table with business behavior hidden inside it.
- Dense TransactionGrid work will focus on a small Forge-owned renderer first, with sticky headers, fixed or measurable row heights, compact Blueprint-compatible styling, and later virtualization only when row-volume thresholds require it.
- Blueprint Table remains available for separate data-browsing surfaces where its own selection and editing model does not conflict with Forge transaction semantics.
- Design-system evaluation remains practical: new candidates are assessed by adapter fit, density, accessibility, keyboard behavior, licensing, and contract compatibility.

## Open Notes
- Atlassian package licensing should be reviewed before any direct dependency is adopted outside Atlassian-integrated use cases.
- If a future customer or deployment requires a different visual system, that should be implemented as another adapter rather than a forked platform UI.
