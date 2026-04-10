import { describe, expect, it } from 'vitest';
import type { ResolvedGridColumn } from '../types';
import { createTransactionGridEngine } from '../createTransactionGridEngine';
import { resolvedSalesInvoiceGridColumns } from './fixtures/resolvedSalesInvoiceGrid.fixture';

function withHiddenQuantity(): ResolvedGridColumn[] {
  return resolvedSalesInvoiceGridColumns.map((column) => (
    column.id === 'quantity' ? { ...column, visible: false } : column
  ));
}

describe('TransactionGrid column interactivity', () => {
  it('allows visible editable columns to receive focus and enter edit mode', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });

    engine.beginEdit();

    expect(engine.getSnapshot().mode).toBe('edit');
  });

  it('allows visible non-editable columns to receive focus but not enter edit mode or clear', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ lineTotal: 10 }],
    });
    const rowId = engine.getSnapshot().rows[0].id;

    engine.moveFocus({ rowId, columnId: 'lineTotal' });
    engine.beginEdit();
    engine.dispatchKeyboard({ type: 'delete' });

    expect(engine.getSnapshot().focus).toEqual({ rowId, columnId: 'lineTotal' });
    expect(engine.getSnapshot().mode).toBe('navigation');
    expect(engine.getSnapshot().rows[0].values.lineTotal).toBe(10);
  });

  it('skips invisible columns during keyboard traversal', () => {
    const engine = createTransactionGridEngine({
      columns: withHiddenQuantity(),
      rows: [{ product: 'SKU-001' }],
    });

    engine.dispatchKeyboard({ type: 'tab' });

    expect(engine.getSnapshot().focus.columnId).toBe('unitPrice');
  });

  it('resolves programmatic focus to an invisible column to the nearest active visible cell', () => {
    const engine = createTransactionGridEngine({
      columns: withHiddenQuantity(),
      rows: [{ product: 'SKU-001' }],
    });
    const rowId = engine.getSnapshot().rows[0].id;

    engine.moveFocus({ rowId, columnId: 'quantity' });

    expect(engine.getSnapshot().focus).toEqual({ rowId, columnId: 'product' });
  });

  it('follows resolved editable flag for calculated columns without calculation-specific branching', () => {
    const editableCalculatedColumns = resolvedSalesInvoiceGridColumns.map((column) => (
      column.id === 'lineTotal' ? { ...column, editable: true } : column
    ));
    const engine = createTransactionGridEngine({
      columns: editableCalculatedColumns,
      rows: [{ lineTotal: 10 }],
    });
    const rowId = engine.getSnapshot().rows[0].id;

    engine.moveFocus({ rowId, columnId: 'lineTotal' });
    engine.beginEdit();
    engine.updateEditBuffer(12);
    engine.commitEdit();

    expect(engine.getSnapshot().rows[0].values.lineTotal).toBe(12);
  });
});

