# Vision

Forge is a modular ERP UI platform for customer-specific deployments.

It replaces copy-paste ERP form development with:
- reusable interaction primitives
- strict manifest/config contracts
- installable modules
- keyboard-first transaction UX

## Success criteria
- New transaction forms are built from platform primitives, not copied from prior customers.
- New modules can be added without platform code forks.
- Common UX changes are made once and applied consistently.
- Transaction entry feels fast and predictable for power users.

## Design posture
Forge is not a generic low-code builder. It is a governed platform for repeatable ERP transaction patterns.

Presentation is configurable where the manifest explicitly allows it. Business logic stays in module code, and platform primitives preserve deterministic interaction contracts.
