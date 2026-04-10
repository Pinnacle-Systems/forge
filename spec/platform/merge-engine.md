# Merge Engine

## Inputs
- TransactionManifest
- TransactionInstanceConfig

## Output
- ResolvedTransactionDefinition

## Behavior
- invalid manifest => fail hard
- invalid config => ignore invalid override, warn, continue

## Rules
- unknown target IDs are ignored with warnings
- unauthorized overrides are ignored
- resolved output is normalized and sorted before rendering