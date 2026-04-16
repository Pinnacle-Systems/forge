import type {
  DiagnosticProperty,
  ManifestElementIndex,
  MergeDiagnostic,
  OverrideProperty,
  TransactionInstanceConfig,
  TransactionManifest,
} from './types';

const OVERRIDE_PROPERTIES = new Set<OverrideProperty>([
  'visible',
  'label',
  'width',
  'editable',
  'required',
  'order',
]);

const BUSINESS_LOGIC_PROPERTIES = new Set([
  'calculationRef',
  'validationRefs',
  'lookupProviderRef',
  'cascadeRefs',
  'hooks',
  'persistence',
  'kind',
  'id',
]);

export function validateInstanceConfig(
  config: TransactionInstanceConfig | undefined,
  manifest: TransactionManifest,
): MergeDiagnostic[] {
  if (config === undefined) {
    return [];
  }

  const rawConfig = config as unknown as Record<string, unknown>;

  if (rawConfig.transactionType !== manifest.transactionType) {
    return [
      warning(
        'UNKNOWN_TARGET',
        `Config transactionType "${String(rawConfig.transactionType)}" does not match manifest transactionType "${manifest.transactionType}"`,
      ),
    ];
  }

  const targetManifestVersion = rawConfig.targetManifestVersion;

  if (
    targetManifestVersion !== undefined
    && targetManifestVersion !== manifest.schemaVersion
  ) {
    return [
      warning(
        'MANIFEST_VERSION_MISMATCH',
        `Config targetManifestVersion "${String(targetManifestVersion)}" does not match manifest schemaVersion "${manifest.schemaVersion}"`,
      ),
    ];
  }

  const rawOverrides = rawConfig.overrides;

  if (rawOverrides === undefined) {
    return [];
  }

  if (!isRecord(rawOverrides)) {
    return [
      warning(
        'INVALID_OVERRIDE_VALUE',
        'Config overrides must be an object',
      ),
    ];
  }

  const diagnostics: MergeDiagnostic[] = [];
  const elementIndex = buildManifestElementIndex(manifest);

  for (const [targetId, override] of Object.entries(rawOverrides)) {
    const target = elementIndex[targetId];

    if (!target) {
      diagnostics.push(warning(
        'UNKNOWN_TARGET',
        `Override target "${targetId}" does not exist in manifest`,
        targetId,
      ));
      continue;
    }

    if (!isRecord(override)) {
      diagnostics.push(warning(
        'INVALID_OVERRIDE_VALUE',
        `Override for target "${targetId}" must be an object`,
        targetId,
      ));
      continue;
    }

    for (const [property, value] of Object.entries(override)) {
      if (BUSINESS_LOGIC_PROPERTIES.has(property)) {
        diagnostics.push(warning(
          'BUSINESS_LOGIC_OVERRIDE_IGNORED',
          `Business logic override "${property}" is not permitted for target "${targetId}"`,
          targetId,
          property,
        ));
        continue;
      }

      if (!OVERRIDE_PROPERTIES.has(property as OverrideProperty)) {
        diagnostics.push(warning(
          'UNKNOWN_OVERRIDE_PROPERTY',
          `Override property "${property}" is not supported for target "${targetId}"`,
          targetId,
          property,
        ));
        continue;
      }

      const overrideProperty = property as OverrideProperty;

      if (!isValidOverrideValue(overrideProperty, value)) {
        diagnostics.push(warning(
          'INVALID_OVERRIDE_VALUE',
          `Override property "${property}" has an invalid value for target "${targetId}"`,
          targetId,
          property,
        ));
        continue;
      }

      if (target.overridePermissions?.[overrideProperty] !== true) {
        diagnostics.push(warning(
          'OVERRIDE_NOT_PERMITTED',
          `Override property "${property}" is not permitted for target "${targetId}"`,
          targetId,
          property,
        ));
      }
    }
  }

  return diagnostics;
}

export function buildManifestElementIndex(manifest: TransactionManifest): ManifestElementIndex {
  return [
    ...manifest.header.fields,
    ...manifest.grid.columns,
    ...manifest.footer.fields,
  ].reduce<ManifestElementIndex>((index, element) => {
    index[element.id] = element;
    return index;
  }, {});
}

export function isAllowedPresentationOverride(
  property: string,
  value: unknown,
  targetId: string,
  manifest: TransactionManifest,
): boolean {
  const target = buildManifestElementIndex(manifest)[targetId];

  return Boolean(
    target
      && OVERRIDE_PROPERTIES.has(property as OverrideProperty)
      && target.overridePermissions?.[property as OverrideProperty] === true
      && isValidOverrideValue(property as OverrideProperty, value),
  );
}

function isValidOverrideValue(property: OverrideProperty, value: unknown): boolean {
  switch (property) {
    case 'visible':
    case 'editable':
    case 'required':
      return typeof value === 'boolean';
    case 'label':
      return typeof value === 'string' && value.trim().length > 0;
    case 'width':
      return typeof value === 'number' && Number.isFinite(value) && value > 0;
    case 'order':
      return typeof value === 'number' && Number.isFinite(value);
  }
}

function warning(
  code: MergeDiagnostic['code'],
  message: string,
  targetId?: string,
  property?: DiagnosticProperty,
): MergeDiagnostic {
  return {
    severity: 'warning',
    code,
    targetId,
    property,
    message,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
