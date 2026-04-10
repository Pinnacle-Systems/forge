import { describe, expect, it } from 'vitest';
import { createTransactionGridEngine } from '../createTransactionGridEngine';
import { resolvedSalesInvoiceGridColumns } from './fixtures/resolvedSalesInvoiceGrid.fixture';

describe('TransactionGrid concurrent edit protection', () => {
  it('applies external update immediately when target row is not editing', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });
    const rowId = engine.getSnapshot().focus.rowId;

    engine.applyExternalRowUpdate(rowId, {
      values: { quantity: 3 },
      reason: 'external-update',
      generation: 0,
    });

    expect(engine.getSnapshot().rows[0].values.quantity).toBe(3);
  });

  it('queues external update while target row is editing and keeps edit buffer untouched', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });
    const rowId = engine.getSnapshot().focus.rowId;

    engine.beginEdit();
    engine.updateEditBuffer('SKU-LOCAL');
    engine.applyExternalRowUpdate(rowId, {
      values: { product: 'SKU-REMOTE' },
      reason: 'external-update',
      generation: 0,
    });

    const snapshot = engine.getSnapshot();
    expect(snapshot.rows[0].values.product).toBe('SKU-001');
    expect(snapshot.rows[0].metadata.editBuffer?.value).toBe('SKU-LOCAL');
    expect(snapshot.rows[0].metadata.queuedExternalUpdates).toEqual([
      {
        values: { product: 'SKU-REMOTE' },
        reason: 'external-update',
        generation: 0,
      },
    ]);
    expect(engine.drainEvents()).toEqual([
      { type: 'externalUpdateQueued', rowId },
    ]);
  });

  it('applies current queued update after cancel when generation still matches', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });
    const rowId = engine.getSnapshot().focus.rowId;

    engine.beginEdit();
    engine.applyExternalRowUpdate(rowId, {
      values: { product: 'SKU-REMOTE' },
      reason: 'external-update',
      generation: 0,
    });
    engine.drainEvents();
    engine.cancelEdit();

    expect(engine.getSnapshot().rows[0].values.product).toBe('SKU-REMOTE');
  });

  it('ignores stale queued update after commit changes generation', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });
    const rowId = engine.getSnapshot().focus.rowId;

    engine.beginEdit();
    engine.updateEditBuffer('SKU-LOCAL');
    engine.applyExternalRowUpdate(rowId, {
      values: { product: 'SKU-REMOTE' },
      reason: 'external-update',
      generation: 0,
    });
    engine.drainEvents();
    engine.commitEdit();

    expect(engine.getSnapshot().rows[0].values.product).toBe('SKU-LOCAL');
    expect(engine.drainEvents()).toEqual([
      { type: 'cellCommitted', rowId, columnId: 'product', value: 'SKU-LOCAL' },
      { type: 'validationRequested', scope: 'cell', rowId, columnId: 'product' },
      { type: 'staleExternalUpdateIgnored', rowId },
    ]);
  });

  it('never creates duplicate phantom rows from queued or stale updates', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      createRowId: () => 'replacement-phantom',
    });
    const phantomId = engine.getSnapshot().focus.rowId;

    engine.beginEdit();
    engine.updateEditBuffer('SKU-LOCAL');
    engine.applyExternalRowUpdate(phantomId, {
      values: { product: 'SKU-REMOTE' },
      reason: 'lookup-enrich',
      generation: 0,
    });
    engine.drainEvents();
    engine.commitEdit();

    const snapshot = engine.getSnapshot();
    expect(snapshot.rows.filter((row) => row.metadata.isPhantom && row.state !== 'deleted')).toHaveLength(1);
    expect(snapshot.rows.find((row) => row.id === phantomId)?.values.product).toBe('SKU-LOCAL');
  });
});

