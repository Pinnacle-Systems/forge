# Merge Engine

See also: ADR-002 for the two-layer contract.

## Inputs
- TransactionManifest
- TransactionInstanceConfig

## Output
- ResolvedTransactionDefinition

## Behavior
- invalid manifest => fail hard
- invalid config => ignore invalid override, warn, continue
- incompatible manifest/config versions => fail hard before resolution

## Rules
- unknown target IDs are ignored with warnings
- unauthorized overrides are ignored
- resolved output is normalized and sorted before rendering
- same manifest + config inputs must produce deterministic resolved output
- development tooling may escalate unknown target IDs to hard errors to surface config rot earlier

## Observability
- warnings should expose stable error codes such as `ERR_MERGE_UNKNOWN_TARGET` and `ERR_CONFIG_UNAUTHORIZED_OVERRIDE`
- development environments should surface warnings locally; production environments should emit them to platform monitoring/telemetry

## Caching
- resolved output may be cached by manifest identity, schema version, and config hash
- cache invalidation occurs on manifest redeploy or config change
