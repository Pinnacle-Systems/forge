import { describe, expect, it } from 'vitest';
import { createTransactionGridEngine } from '../createTransactionGridEngine';
import { resolvedSalesInvoiceGridColumns } from './fixtures/resolvedSalesInvoiceGrid.fixture';

describe('createTransactionGridEngine', () => {
  it('begins in navigation mode with focus on the first visible column', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });
    const snapshot = engine.getSnapshot();

    expect(snapshot.mode).toBe('navigation');
    expect(snapshot.focus).toEqual({
      rowId: snapshot.rows[0].id,
      columnId: 'product',
    });
  });

  it('keeps edit buffer separate from committed values until commit', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });
    const rowId = engine.getSnapshot().focus.rowId;

    engine.beginEdit();
    engine.updateEditBuffer('SKU-002');

    expect(engine.getSnapshot().rows[0].values.product).toBe('SKU-001');
    expect(engine.getSnapshot().rows[0].metadata.editBuffer).toMatchObject({
      columnId: 'product',
      value: 'SKU-002',
      originalValue: 'SKU-001',
    });

    engine.commitEdit();

    const snapshot = engine.getSnapshot();
    expect(snapshot.mode).toBe('navigation');
    expect(snapshot.rows[0]).toMatchObject({
      id: rowId,
      state: 'dirty',
      values: { product: 'SKU-002' },
      metadata: {
        revision: 1,
        generation: 1,
      },
    });
    expect(snapshot.rows[0].metadata.editBuffer).toBeUndefined();
    expect(engine.drainEvents()).toEqual([
      { type: 'cellCommitted', rowId, columnId: 'product', value: 'SKU-002' },
      { type: 'validationRequested', scope: 'cell', rowId, columnId: 'product' },
    ]);
  });

  it('cancels editing without changing committed values', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });

    engine.beginEdit();
    engine.updateEditBuffer('SKU-002');
    engine.cancelEdit();

    const snapshot = engine.getSnapshot();
    expect(snapshot.mode).toBe('navigation');
    expect(snapshot.rows[0].values.product).toBe('SKU-001');
    expect(snapshot.rows[0].metadata.editBuffer).toBeUndefined();
  });

  it('materializes a changed phantom row as new', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      createRowId: () => 'replacement-phantom',
    });
    const phantomId = engine.getSnapshot().focus.rowId;

    engine.beginEdit();
    engine.updateEditBuffer('SKU-001');
    engine.commitEdit();

    const snapshot = engine.getSnapshot();
    expect(snapshot.rows.find((row) => row.id === phantomId)).toMatchObject({
      id: phantomId,
      state: 'new',
      metadata: { isPhantom: false },
      values: { product: 'SKU-001' },
    });
    expect(snapshot.rows.find((row) => row.id === 'replacement-phantom')).toMatchObject({
      metadata: { isPhantom: true },
    });
  });

  it('marks deleted rows and skips them during navigation', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [
        { product: 'SKU-001' },
        { product: 'SKU-002' },
      ],
    });
    const firstRowId = engine.getSnapshot().rows[0].id;
    const secondRowId = engine.getSnapshot().rows[1].id;

    engine.deleteRow(firstRowId);
    engine.dispatchKeyboard({ type: 'arrow', direction: 'up' });

    const snapshot = engine.getSnapshot();
    expect(snapshot.rows[0]).toMatchObject({ id: firstRowId, state: 'deleted' });
    expect(snapshot.focus.rowId).toBe(secondRowId);
  });

  it('clears the phantom row instead of removing it when deleteRow targets it', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
    });
    const phantomId = engine.getSnapshot().focus.rowId;

    engine.applyExternalRowUpdate(phantomId, {
      values: { product: undefined },
      reason: 'external-update',
      generation: 0,
    });
    engine.deleteRow(phantomId);

    const snapshot = engine.getSnapshot();
    expect(snapshot.rows).toHaveLength(1);
    expect(snapshot.rows[0]).toMatchObject({
      id: phantomId,
      metadata: { isPhantom: true },
      values: {},
    });
  });

  it('returns snapshots that cannot mutate internal engine state', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });
    const snapshot = engine.getSnapshot();

    snapshot.rows[0].values.product = 'MUTATED';
    snapshot.rows[0].metadata.validation.row.push({
      severity: 'error',
      message: 'Mutated',
    });
    snapshot.columns[0].label = 'Mutated';

    const nextSnapshot = engine.getSnapshot();
    expect(nextSnapshot.rows[0].values.product).toBe('SKU-001');
    expect(nextSnapshot.rows[0].metadata.validation.row).toEqual([]);
    expect(nextSnapshot.columns[0].label).toBe('Product');
  });
});
