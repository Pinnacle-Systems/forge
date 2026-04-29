# CustomWidget Contract

See also: ADR-005 Section 3 for escape-hatch governance.

## Purpose
Provide a governed escape hatch for module-specific UI that cannot be expressed through existing platform primitives or config-driven presentation.

## Position in the architecture
- `CustomWidget` is a module-owned extension point
- it is not a replacement for TransactionShell, TransactionGrid, Lookup Runtime, or the merge engine
- it must compose with platform contracts rather than bypass them
- implementation must live in the owning module and must not import runtime code from sibling modules

## When allowed
- the requirement cannot be met by existing primitives, resolved-definition metadata, or allowed instance-config overrides
- the requirement is specific to a module or is still unproven as a reusable platform primitive
- the module can express a clear input/output contract for the widget

## Manifest requirements
A manifest entry for a `CustomWidget` must declare:
- stable widget identifier
- widget component reference owned by the module
- input shape consumed from the resolved transaction definition and transaction buffer
- output events emitted back to the platform runtime
- any required lookup/runtime dependencies provided through platform contracts

## Runtime contract
- the platform passes only resolved inputs into the widget
- the widget emits standard change events back into the transaction buffer
- the widget must not mutate platform state except through declared output events
- the widget must preserve shell-level save, dirty-state, and validation lifecycle contracts
- widget change events use the standard payload shape `{ fieldId, value, rowId? }`
- widgets must not trigger final `save()` directly; save remains shell-orchestrated

## Allowed responsibilities
- render module-specific presentation that is not achievable through standard primitives
- transform user interaction into standard change payloads
- consume platform-provided lookup/autofill services where applicable
- render visual state from resolved metadata without embedding business-specific branching into platform primitives

## Forbidden responsibilities
- direct access to raw manifest or raw instance config
- bypassing merge-engine resolution
- direct persistence or save orchestration
- customer-specific branching in platform-owned code
- introducing async business logic into shell, grid, or merge-engine flows
- replacing standard lookup/autofill flows when the requirement fits ADR-004

## Validation and review
- every `CustomWidget` must declare explicit input/output contracts that can be validated at registration/build time
- invalid widget registration must fail build/registration
- `CustomWidget` adoption remains governed by ADR-005, including architectural review and graduation rules
- widgets exceeding 300 lines of implementation or more than 3 nested component layers require explicit senior/platform review

## Graduation path
- repeated successful `CustomWidget` patterns should be evaluated for promotion into official platform primitives
- once a platform primitive exists for the same paradigm, new module work should prefer the primitive over additional `CustomWidget` proliferation
