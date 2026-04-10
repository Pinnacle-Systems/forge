import { sortResolvedDefinition } from './sortResolvedDefinition';
import type {
  InstanceOverride,
  ManifestField,
  ManifestFooterField,
  ManifestGridColumn,
  ResolvedField,
  ResolvedFooterField,
  ResolvedGridColumn,
  ResolvedTransactionDefinition,
  TransactionInstanceConfig,
  TransactionManifest,
} from './types';
import {
  buildManifestElementIndex,
  isAllowedPresentationOverride,
  validateInstanceConfig,
} from './validateInstanceConfig';
import { validateManifest } from './validateManifest';

export function mergeTransactionDefinition(
  manifest: TransactionManifest,
  config?: TransactionInstanceConfig,
): ResolvedTransactionDefinition {
  validateManifest(manifest);

  const diagnostics = validateInstanceConfig(config, manifest);
  const resolved: ResolvedTransactionDefinition = {
    transactionType: manifest.transactionType,
    version: manifest.version,
    title: manifest.title,
    header: {
      fields: manifest.header.fields.map(resolveField),
    },
    grid: {
      columns: manifest.grid.columns.map(resolveGridColumn),
    },
    footer: {
      fields: manifest.footer.fields.map(resolveFooterField),
    },
    hooks: {
      calculations: [...(manifest.hooks?.calculations ?? [])],
      validations: [...(manifest.hooks?.validations ?? [])],
      lookupProviders: [...(manifest.hooks?.lookupProviders ?? [])],
      ...(manifest.hooks?.persistence ? { persistence: manifest.hooks.persistence } : {}),
    },
    diagnostics,
  };

  applyValidOverrides(resolved, manifest, config);

  return {
    ...sortResolvedDefinition(resolved),
    diagnostics,
  };
}

function resolveField(field: ManifestField): ResolvedField {
  return {
    id: field.id,
    label: field.label,
    kind: field.kind,
    visible: field.visible ?? true,
    editable: field.editable ?? true,
    required: field.required ?? false,
    order: field.order ?? 0,
    ...(field.width !== undefined ? { width: field.width } : {}),
    ...(field.lookupProviderRef ? { lookupProviderRef: field.lookupProviderRef } : {}),
    ...(field.calculationRef ? { calculationRef: field.calculationRef } : {}),
    validationRefs: [...(field.validationRefs ?? [])],
  };
}

function resolveGridColumn(column: ManifestGridColumn): ResolvedGridColumn {
  return {
    ...resolveField(column),
    cascadeRefs: [...(column.cascadeRefs ?? [])],
  };
}

function resolveFooterField(field: ManifestFooterField): ResolvedFooterField {
  return {
    id: field.id,
    label: field.label,
    kind: field.kind,
    visible: field.visible ?? true,
    editable: field.editable ?? true,
    required: field.required ?? false,
    order: field.order ?? 0,
    ...(field.calculationRef ? { calculationRef: field.calculationRef } : {}),
  };
}

function applyValidOverrides(
  resolved: ResolvedTransactionDefinition,
  manifest: TransactionManifest,
  config?: TransactionInstanceConfig,
): void {
  if (!config || config.transactionType !== manifest.transactionType || !config.overrides) {
    return;
  }

  const manifestIndex = buildManifestElementIndex(manifest);
  const resolvedIndex = buildResolvedElementIndex(resolved);

  for (const [targetId, override] of Object.entries(config.overrides)) {
    if (!manifestIndex[targetId] || !isObjectRecord(override)) {
      continue;
    }

    const resolvedTarget = resolvedIndex[targetId];

    if (!resolvedTarget) {
      continue;
    }

    for (const [property, value] of Object.entries(override)) {
      if (isAllowedPresentationOverride(property, value, targetId, manifest)) {
        applyPresentationOverride(resolvedTarget, property as keyof InstanceOverride, value);
      }
    }
  }
}

function buildResolvedElementIndex(
  resolved: ResolvedTransactionDefinition,
): Record<string, ResolvedField | ResolvedGridColumn | ResolvedFooterField> {
  return [
    ...resolved.header.fields,
    ...resolved.grid.columns,
    ...resolved.footer.fields,
  ].reduce<Record<string, ResolvedField | ResolvedGridColumn | ResolvedFooterField>>(
    (index, element) => {
      index[element.id] = element;
      return index;
    },
    {},
  );
}

function applyPresentationOverride(
  target: ResolvedField | ResolvedGridColumn | ResolvedFooterField,
  property: keyof InstanceOverride,
  value: unknown,
): void {
  switch (property) {
    case 'visible':
    case 'editable':
    case 'required':
      target[property] = value as boolean;
      break;
    case 'label':
      target.label = value as string;
      break;
    case 'width':
      if ('validationRefs' in target) {
        target.width = value as number;
      }
      break;
    case 'order':
      target.order = value as number;
      break;
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
