import { CascadeEngine } from './CascadeEngine';
import type {
  ApplyLookupSelectionOptions,
  CascadeResult,
  LookupDiagnostic,
  LookupMetadataPatch,
  LookupSelectionResult,
} from './types';
import type {
  GridRow,
  GridValue,
  TransactionElementId,
} from '../transaction-grid';

const emptyCascadeResult: CascadeResult = {
  valuesToWrite: {},
  valuesToClear: [],
  preservedStaleFields: [],
  prompts: [],
};

export function applyLookupSelection(
  options: ApplyLookupSelectionOptions,
): LookupSelectionResult {
  const { engine, selection } = options;
  const snapshot = engine.getSnapshot();
  const row = snapshot.rows.find((candidate) => candidate.id === selection.rowId);

  if (!row) {
    return {
      applied: false,
      diagnostics: [rowNotFound(selection.rowId)],
      cascade: clone(emptyCascadeResult),
    };
  }

  if (
    selection.capturedGeneration !== undefined
    && selection.capturedGeneration !== row.metadata.generation
  ) {
    return {
      applied: false,
      diagnostics: [stale(selection.providerId, selection.rowId)],
      cascade: clone(emptyCascadeResult),
    };
  }

  const cascade = new CascadeEngine().apply(
    selection.cascadePlan,
    row.values,
    selection.result.values,
  );
  const values = buildValuesToApply(selection.fieldId, selection.result.entityId, selection.result.values, cascade);
  const metadata = buildMetadataPatch(row, selection.fieldId, selection.providerId, values, cascade, {
    entityId: selection.result.entityId,
    label: selection.result.label,
    values: selection.result.values,
  });

  engine.applyExternalRowUpdate(selection.rowId, {
    values,
    metadata,
    reason: 'lookup-enrich',
    generation: row.metadata.generation,
  });

  return {
    applied: true,
    diagnostics: [],
    cascade,
  };
}

function buildValuesToApply(
  fieldId: TransactionElementId,
  entityId: string,
  resultValues: Record<TransactionElementId, GridValue>,
  cascade: CascadeResult,
): Record<TransactionElementId, GridValue> {
  const cascadeTargets = new Set([
    ...Object.keys(cascade.valuesToWrite),
    ...cascade.valuesToClear,
    ...cascade.preservedStaleFields,
    ...cascade.prompts.map((prompt) => prompt.targetFieldId),
  ]);
  const values: Record<TransactionElementId, GridValue> = {};

  for (const [targetFieldId, value] of Object.entries(resultValues)) {
    if (!cascadeTargets.has(targetFieldId)) {
      values[targetFieldId] = clone(value);
    }
  }

  if (!Object.hasOwn(values, fieldId)) {
    values[fieldId] = entityId;
  }

  for (const [targetFieldId, value] of Object.entries(cascade.valuesToWrite)) {
    values[targetFieldId] = clone(value);
  }

  for (const targetFieldId of cascade.valuesToClear) {
    values[targetFieldId] = undefined;
  }

  return values;
}

function buildMetadataPatch(
  row: GridRow,
  fieldId: TransactionElementId,
  providerId: string,
  values: Record<TransactionElementId, GridValue>,
  cascade: CascadeResult,
  snapshot: {
    entityId: string;
    label?: string;
    values: Record<TransactionElementId, GridValue>;
  },
): LookupMetadataPatch {
  const cascadeTargets = new Set([
    ...Object.keys(cascade.valuesToWrite),
    ...cascade.valuesToClear,
  ]);
  const autofill: LookupMetadataPatch['autofill'] = {};
  const stale: LookupMetadataPatch['stale'] = {};

  for (const targetFieldId of Object.keys(values)) {
    autofill[targetFieldId] = {
      sourceColumnId: fieldId,
      mode: cascadeTargets.has(targetFieldId) ? 'cascade' : 'lookup',
    };
    stale[targetFieldId] = undefined;
  }

  for (const targetFieldId of cascade.preservedStaleFields) {
    autofill[targetFieldId] = {
      sourceColumnId: fieldId,
      mode: 'cascade',
      preservedManualOverride: true,
    };
    stale[targetFieldId] = {
      sourceColumnId: fieldId,
      reason: 'preserved-manual-override',
    };
  }

  return {
    lookupSnapshots: {
      [fieldId]: {
        providerRef: providerId,
        entityId: snapshot.entityId,
        label: snapshot.label,
        values: clone(snapshot.values),
        capturedAtRevision: row.metadata.revision,
      },
    },
    autofill,
    stale,
  };
}

function rowNotFound(rowId: string): LookupDiagnostic {
  return {
    severity: 'error',
    code: 'ROW_NOT_FOUND',
    rowId,
    message: `Lookup target row not found: ${rowId}`,
  };
}

function stale(providerId: string, rowId: string): LookupDiagnostic {
  return {
    severity: 'warning',
    code: 'STALE_LOOKUP_RESPONSE_IGNORED',
    providerId,
    rowId,
    message: `Stale lookup response ignored for row: ${rowId}`,
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
