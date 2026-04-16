import { ManifestValidationError } from './errors';
import type {
  BaseManifestElement,
  FieldKind,
  HookRef,
  ManifestField,
  ManifestFooterField,
  ManifestGridColumn,
  OverrideProperty,
  TransactionManifest,
} from './types';

const FIELD_KINDS = new Set<FieldKind>([
  'text',
  'date',
  'number',
  'currency',
  'lookup',
]);

const FOOTER_KINDS = new Set(['currency', 'number']);

const OVERRIDE_PROPERTIES = new Set<OverrideProperty>([
  'visible',
  'label',
  'width',
  'editable',
  'required',
  'order',
]);

export function validateManifest(manifest: TransactionManifest): void {
  const issues: string[] = [];
  const rawManifest = manifest as unknown as Record<string, unknown>;

  if (!isNonEmptyString(rawManifest.transactionType)) {
    issues.push('transactionType is required');
  }

  if (!isNonEmptyString(rawManifest.schemaVersion)) {
    issues.push('schemaVersion is required');
  }

  if (!isNonEmptyString(rawManifest.title)) {
    issues.push('title is required');
  }

  const headerFields = getArrayAtPath<ManifestField>(rawManifest, ['header', 'fields']);
  const gridColumns = getArrayAtPath<ManifestGridColumn>(rawManifest, ['grid', 'columns']);
  const footerFields = getArrayAtPath<ManifestFooterField>(rawManifest, ['footer', 'fields']);

  if (!headerFields) {
    issues.push('header.fields must be an array');
  }

  if (!gridColumns) {
    issues.push('grid.columns must be an array');
  }

  if (!footerFields) {
    issues.push('footer.fields must be an array');
  }

  const hooks = manifest?.hooks ?? {};
  const calculationRefs = new Set(hooks.calculations ?? []);
  const validationRefs = new Set(hooks.validations ?? []);
  const lookupProviderRefs = new Set(hooks.lookupProviders ?? []);
  const seenIds = new Set<string>();

  for (const field of headerFields ?? []) {
    validateElement(field, 'header field', issues, seenIds);
    validateFieldKind(field, 'header field', issues);
    validateHookRefs(field, issues, calculationRefs, validationRefs, lookupProviderRefs);
  }

  for (const column of gridColumns ?? []) {
    validateElement(column, 'grid column', issues, seenIds);
    validateFieldKind(column, 'grid column', issues);
    validateHookRefs(column, issues, calculationRefs, validationRefs, lookupProviderRefs);
  }

  for (const footerField of footerFields ?? []) {
    validateElement(footerField, 'footer field', issues, seenIds);
    validateFooterKind(footerField, issues);
    validateCalculationRef(footerField.id, footerField.calculationRef, issues, calculationRefs);
  }

  if (issues.length > 0) {
    throw new ManifestValidationError(issues);
  }
}

function validateElement(
  element: BaseManifestElement,
  elementType: string,
  issues: string[],
  seenIds: Set<string>,
): void {
  const id = element.id;

  if (!isNonEmptyString(id)) {
    issues.push(`${elementType} id is required`);
  } else if (seenIds.has(id)) {
    issues.push(`duplicate element id "${id}"`);
  } else {
    seenIds.add(id);
  }

  if (!isNonEmptyString(element.label)) {
    issues.push(`${elementType} "${id ?? '(unknown)'}" label is required`);
  }

  if (!Number.isFinite(element.order)) {
    issues.push(`${elementType} "${id ?? '(unknown)'}" order must be a finite number`);
  }

  const overridePermissions = element.overridePermissions as Record<string, unknown> | undefined;

  if (overridePermissions === undefined) {
    return;
  }

  for (const [key, value] of Object.entries(overridePermissions)) {
    if (!OVERRIDE_PROPERTIES.has(key as OverrideProperty)) {
      issues.push(`${elementType} "${id ?? '(unknown)'}" has unsupported override permission "${key}"`);
    }

    if (typeof value !== 'boolean') {
      issues.push(`${elementType} "${id ?? '(unknown)'}" override permission "${key}" must be boolean`);
    }
  }
}

function validateFieldKind(
  field: ManifestField | ManifestGridColumn,
  elementType: string,
  issues: string[],
): void {
  if (!FIELD_KINDS.has(field.kind)) {
    issues.push(`${elementType} "${field.id ?? '(unknown)'}" has unsupported kind "${String(field.kind)}"`);
  }
}

function validateFooterKind(field: ManifestFooterField, issues: string[]): void {
  if (!FOOTER_KINDS.has(field.kind)) {
    issues.push(`footer field "${field.id ?? '(unknown)'}" has unsupported kind "${String(field.kind)}"`);
  }
}

function validateHookRefs(
  field: ManifestField | ManifestGridColumn,
  issues: string[],
  calculationRefs: Set<HookRef>,
  validationRefs: Set<HookRef>,
  lookupProviderRefs: Set<HookRef>,
): void {
  if (field.lookupProviderRef && !lookupProviderRefs.has(field.lookupProviderRef)) {
    issues.push(`element "${field.id}" references undeclared lookup provider "${field.lookupProviderRef}"`);
  }

  validateCalculationRef(field.id, field.calculationRef, issues, calculationRefs);

  for (const validationRef of field.validationRefs ?? []) {
    if (!validationRefs.has(validationRef)) {
      issues.push(`element "${field.id}" references undeclared validation "${validationRef}"`);
    }
  }
}

function validateCalculationRef(
  id: string,
  calculationRef: HookRef | undefined,
  issues: string[],
  calculationRefs: Set<HookRef>,
): void {
  if (calculationRef && !calculationRefs.has(calculationRef)) {
    issues.push(`element "${id}" references undeclared calculation "${calculationRef}"`);
  }
}

function getArrayAtPath<T>(
  source: Record<string, unknown>,
  path: [string, string],
): T[] | undefined {
  const parent = source[path[0]] as Record<string, unknown> | undefined;
  const value = parent?.[path[1]];

  return Array.isArray(value) ? value as T[] : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
