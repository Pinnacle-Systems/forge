import { describe, expect, it } from 'vitest';
import { createTransactionGridEngine } from '../createTransactionGridEngine';
import type { GridRow, GridValue } from '../types';
import { resolvedSalesInvoiceGridColumns } from './fixtures/resolvedSalesInvoiceGrid.fixture';

function phantomRows(rows: GridRow[]): GridRow[] {
  return rows.filter((row) => row.metadata.isPhantom && row.state !== 'deleted');
}

function expectSinglePhantom(rows: GridRow[]): GridRow {
  const phantoms = phantomRows(rows);
  expect(phantoms).toHaveLength(1);
  expect(phantoms[0].state).not.toBe('deleted');
  return phantoms[0];
}

function nonEmptyUpdate(generation: number): {
  values: Record<string, GridValue>;
  reason: 'external-update';
  generation: number;
} {
  return {
    values: { product: 'SKU-001' },
    reason: 'external-update',
    generation,
  };
}

describe('TransactionGrid row invariants', () => {
  it('initializes an empty grid with exactly one phantom row', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
    });

    const phantom = expectSinglePhantom(engine.getSnapshot().rows);

    expect(phantom.values).toEqual({});
  });

  it('initializes with committed rows and appends exactly one phantom row', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [
        { product: 'SKU-001', quantity: 1 },
        { product: 'SKU-002', quantity: 2 },
      ],
    });

    const snapshot = engine.getSnapshot();

    expect(snapshot.rows).toHaveLength(3);
    expect(snapshot.rows.filter((row) => !row.metadata.isPhantom)).toHaveLength(2);
    expectSinglePhantom(snapshot.rows);
  });

  it('materializes the phantom row after committing a non-empty value and appends a new phantom row', () => {
    const ids = ['replacement-phantom'];
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      createRowId: () => ids.shift() ?? 'unexpected',
    });
    const originalPhantomId = engine.getSnapshot().focus.rowId;

    engine.beginEdit();
    engine.updateEditBuffer('SKU-001');
    engine.commitEdit();

    const snapshot = engine.getSnapshot();
    const materialized = snapshot.rows.find((row) => row.id === originalPhantomId);
    const phantom = expectSinglePhantom(snapshot.rows);

    expect(materialized).toMatchObject({
      id: originalPhantomId,
      state: 'new',
      metadata: { isPhantom: false },
    });
    expect(phantom.id).toBe('replacement-phantom');
  });

  it('keeps one phantom row after canceling an edit on the phantom row', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
    });

    engine.beginEdit();
    engine.updateEditBuffer('SKU-001');
    engine.cancelEdit();

    const phantom = expectSinglePhantom(engine.getSnapshot().rows);
    expect(phantom.values).toEqual({});
  });

  it('keeps one phantom row after clearing the last value on the phantom row', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
    });

    engine.dispatchKeyboard({ type: 'delete' });

    expectSinglePhantom(engine.getSnapshot().rows);
  });

  it('keeps one phantom row after deleting a non-phantom row', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001', quantity: 1 }],
    });
    const rowId = engine.getSnapshot().rows[0].id;

    engine.deleteRow(rowId);

    expect(engine.getSnapshot().rows[0]).toMatchObject({ state: 'deleted' });
    expectSinglePhantom(engine.getSnapshot().rows);
    expect(engine.getSnapshot().focus.rowId).toBe(expectSinglePhantom(engine.getSnapshot().rows).id);
  });

  it('materializes the phantom row when external update writes non-empty values to it', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      createRowId: () => 'replacement-phantom',
    });
    const phantomId = engine.getSnapshot().focus.rowId;

    engine.applyExternalRowUpdate(phantomId, nonEmptyUpdate(0));

    const snapshot = engine.getSnapshot();
    const materialized = snapshot.rows.find((row) => row.id === phantomId);
    const phantom = expectSinglePhantom(snapshot.rows);

    expect(materialized).toMatchObject({
      state: 'new',
      values: { product: 'SKU-001' },
      metadata: { isPhantom: false },
    });
    expect(phantom.id).toBe('replacement-phantom');
  });

  it('keeps the phantom row phantom when external update writes only empty values to it', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      createRowId: () => 'should-not-be-used',
    });
    const phantomId = engine.getSnapshot().focus.rowId;

    engine.applyExternalRowUpdate(phantomId, {
      values: { product: undefined, quantity: null, reference: '' },
      reason: 'external-update',
      generation: 0,
    });

    const phantom = expectSinglePhantom(engine.getSnapshot().rows);
    expect(phantom.id).toBe(phantomId);
    expect(phantom.state).toBeUndefined();
  });

  it('keeps one phantom row after validation annotations are applied', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
    });
    const phantomId = engine.getSnapshot().focus.rowId;

    engine.applyValidation(phantomId, {
      cells: {
        product: [{ severity: 'error', message: 'Required' }],
      },
      row: [],
    });

    expectSinglePhantom(engine.getSnapshot().rows);
  });
});

