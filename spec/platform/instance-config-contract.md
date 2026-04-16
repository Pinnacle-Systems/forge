# Instance Config Contract

See also: ADR-002 for the two-layer contract.

## Purpose
Allow safe customer-instance customization.

## Versioning
- config declares `targetManifestVersion`
- config must target a compatible manifest schema/runtime contract version
- merge validates version compatibility before producing resolved output

## Allowed overrides
- visible
- label
- width
- editable
- required
- order
- defaultValue for primitive literals only: string | number | boolean

Only if allowed by overridePermissions.

## Rules
- `overridePermissions` declared in the manifest must be validated against the platform schema
- `order` applies only within the owning section or column collection defined by the manifest
- config may not introduce expressions, async behavior, or calculated defaults

## Not allowed
- calculations
- validation logic
- workflow transitions
- persistence rules
- calculated expressions in `defaultValue`
