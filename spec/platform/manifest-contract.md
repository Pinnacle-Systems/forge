# Manifest Contract

See also: ADR-001 for form-definition strategy, ADR-002 for the two-layer contract, and ADR-005 for governed platform expansion.

## Purpose
Define the developer-owned structure for transaction forms.

## Versioning
- manifest declares `schemaVersion`
- manifest schema version is validated at registration/build time
- breaking schema changes require an explicit version increment and merge-compatibility review

## Includes
- sections
- fields
- line item columns
- lookup provider references
- calculation references
- overridePermissions
- optional `CustomWidget` entries governed by `spec/platform/custom-widget.md`

## Rules
- declarative only
- no business logic
- IDs must be stable and unique within the module + manifest namespace
- type-specific required properties must be validated at registration/build time
- invalid manifests must fail schema/contract validation in CI and at registration/build time
- calculation references point to stable module-owned registry identifiers; manifests never embed calculation logic
- manifests should expose a stable schema identifier for tooling and IDE validation

## Error contracts
- validation failures should expose stable error codes such as `ERR_MANIFEST_DUPLICATE_ID`, `ERR_MANIFEST_INVALID_OVERRIDE_PERMISSION`, and `ERR_MANIFEST_SCHEMA_VERSION_UNSUPPORTED`
