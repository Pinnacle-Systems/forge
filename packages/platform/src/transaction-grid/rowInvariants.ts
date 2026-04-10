import type {
  GridRow,
  GridRowMetadata,
  GridValue,
  RowValidationState,
} from './types';

export function createEmptyValidationState(): RowValidationState {
  return {
    cells: {},
    row: [],
  };
}

export function createRowMetadata(isPhantom: boolean): GridRowMetadata {
  return {
    isPhantom,
    revision: 0,
    generation: 0,
    lookupSnapshots: {},
    autofill: {},
    stale: {},
    validation: createEmptyValidationState(),
    queuedExternalUpdates: [],
  };
}

export function createCommittedRow(
  id: string,
  values: Record<string, GridValue>,
): GridRow {
  return {
    id,
    values: cloneRecord(values),
    metadata: createRowMetadata(false),
  };
}

export function createPhantomRow(id: string): GridRow {
  return {
    id,
    values: {},
    metadata: createRowMetadata(true),
  };
}

export function ensureExactlyOnePhantomRow(
  rows: GridRow[],
  createPhantomId: () => string,
): GridRow[] {
  const activePhantoms = rows.filter((row) => row.metadata.isPhantom && row.state !== 'deleted');

  if (activePhantoms.length === 1) {
    return rows;
  }

  if (activePhantoms.length === 0) {
    rows.push(createPhantomRow(createPhantomId()));
    return rows;
  }

  let firstActivePhantomSeen = false;

  return rows.filter((row) => {
    if (!row.metadata.isPhantom || row.state === 'deleted') {
      return true;
    }

    if (!firstActivePhantomSeen) {
      firstActivePhantomSeen = true;
      return true;
    }

    return rowHasNonEmptyValues(row);
  }).map((row) => {
    if (!row.metadata.isPhantom || row.state === 'deleted') {
      return row;
    }

    if (row === activePhantoms[0]) {
      return row;
    }

    row.metadata.isPhantom = false;
    row.state = 'new';
    return row;
  });
}

export function rowHasNonEmptyValues(row: GridRow): boolean {
  return Object.values(row.values).some((value) => !isEmptyGridValue(value));
}

export function isEmptyGridValue(value: GridValue): boolean {
  return value === undefined || value === null || value === '';
}

export function clearEmptyValues(values: Record<string, GridValue>): Record<string, GridValue> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => !isEmptyGridValue(value)),
  );
}

function cloneRecord(values: Record<string, GridValue>): Record<string, GridValue> {
  return structuredClone(values);
}

