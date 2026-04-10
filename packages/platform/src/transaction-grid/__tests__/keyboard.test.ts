import { describe, expect, it } from 'vitest';
import { normalizeGridKeyboardEvent } from '../keyboard';
import { createTransactionGridEngine } from '../createTransactionGridEngine';
import { resolvedSalesInvoiceGridColumns } from './fixtures/resolvedSalesInvoiceGrid.fixture';

describe('TransactionGrid keyboard behavior', () => {
  it('normalizes supported keyboard events', () => {
    expect(normalizeGridKeyboardEvent({ key: 'Enter' })).toEqual({ type: 'enter' });
    expect(normalizeGridKeyboardEvent({ key: 'Tab', shiftKey: true })).toEqual({
      type: 'tab',
      shiftKey: true,
    });
    expect(normalizeGridKeyboardEvent({ key: 'ArrowLeft' })).toEqual({
      type: 'arrow',
      direction: 'left',
    });
    expect(normalizeGridKeyboardEvent({ key: 'F2' })).toEqual({ type: 'f2' });
    expect(normalizeGridKeyboardEvent({ key: 's', ctrlKey: true })).toEqual({ type: 'save' });
    expect(normalizeGridKeyboardEvent({ key: 'x' })).toBeUndefined();
  });

  it('starts edit with Enter and commits downward with Enter', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });
    const firstRowId = engine.getSnapshot().rows[0].id;
    const secondRowId = engine.getSnapshot().rows[1].id;

    engine.dispatchKeyboard({ type: 'enter' });
    expect(engine.getSnapshot().mode).toBe('edit');

    engine.updateEditBuffer('SKU-002');
    engine.dispatchKeyboard({ type: 'enter' });

    expect(engine.getSnapshot().mode).toBe('navigation');
    expect(engine.getSnapshot().focus).toEqual({
      rowId: secondRowId,
      columnId: 'product',
    });
    expect(engine.drainEvents()).toEqual([
      { type: 'cellCommitted', rowId: firstRowId, columnId: 'product', value: 'SKU-002' },
      { type: 'validationRequested', scope: 'cell', rowId: firstRowId, columnId: 'product' },
      { type: 'rowExited', rowId: firstRowId },
      { type: 'validationRequested', scope: 'row', rowId: firstRowId },
    ]);
  });

  it('moves with Tab, Shift+Tab, and Arrow keys through visible active cells', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });

    engine.dispatchKeyboard({ type: 'tab' });
    expect(engine.getSnapshot().focus.columnId).toBe('quantity');

    engine.dispatchKeyboard({ type: 'tab', shiftKey: true });
    expect(engine.getSnapshot().focus.columnId).toBe('product');

    engine.dispatchKeyboard({ type: 'arrow', direction: 'right' });
    expect(engine.getSnapshot().focus.columnId).toBe('quantity');

    engine.dispatchKeyboard({ type: 'arrow', direction: 'left' });
    expect(engine.getSnapshot().focus.columnId).toBe('product');

    engine.dispatchKeyboard({ type: 'arrow', direction: 'down' });
    expect(engine.getSnapshot().rows[1].metadata.isPhantom).toBe(true);
    expect(engine.getSnapshot().focus.rowId).toBe(engine.getSnapshot().rows[1].id);
  });

  it('does not move grid focus with arrow keys while editing', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });
    const initialFocus = engine.getSnapshot().focus;

    engine.beginEdit();
    engine.dispatchKeyboard({ type: 'arrow', direction: 'right' });

    expect(engine.getSnapshot().focus).toEqual(initialFocus);
    expect(engine.getSnapshot().mode).toBe('edit');
  });

  it('starts edit with F2 and cancels edit with Esc', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });

    engine.dispatchKeyboard({ type: 'f2' });
    engine.updateEditBuffer('SKU-002');
    engine.dispatchKeyboard({ type: 'escape' });

    expect(engine.getSnapshot().mode).toBe('navigation');
    expect(engine.getSnapshot().rows[0].values.product).toBe('SKU-001');
  });

  it('clears editable cells with Delete and Backspace in navigation mode', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001', quantity: 2 }],
    });
    const rowId = engine.getSnapshot().focus.rowId;

    engine.dispatchKeyboard({ type: 'delete' });
    engine.moveFocus({ rowId, columnId: 'quantity' });
    engine.dispatchKeyboard({ type: 'backspace' });

    expect(engine.getSnapshot().rows[0].values).toEqual({
      product: undefined,
      quantity: undefined,
    });
  });

  it('does not clear non-editable calculated columns', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ lineTotal: 24 }],
    });
    const rowId = engine.getSnapshot().rows[0].id;

    engine.moveFocus({ rowId, columnId: 'lineTotal' });
    engine.dispatchKeyboard({ type: 'delete' });

    expect(engine.getSnapshot().rows[0].values.lineTotal).toBe(24);
  });

  it('emits grid validation before save request for Ctrl+S without changing rows', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });
    const before = engine.getSnapshot().rows;

    engine.dispatchKeyboard({ type: 'save' });

    expect(engine.getSnapshot().rows).toEqual(before);
    expect(engine.drainEvents()).toEqual([
      { type: 'validationRequested', scope: 'grid' },
      { type: 'saveRequested' },
    ]);
  });
});

