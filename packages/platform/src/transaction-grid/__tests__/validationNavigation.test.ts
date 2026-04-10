import { describe, expect, it } from 'vitest';
import { createTransactionGridEngine } from '../createTransactionGridEngine';
import { resolvedSalesInvoiceGridColumns } from './fixtures/resolvedSalesInvoiceGrid.fixture';

describe('TransactionGrid validation navigation', () => {
  it('does not block arrow movement when the focused cell has an error', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: '' }],
    });
    const rowId = engine.getSnapshot().focus.rowId;

    engine.applyValidation(rowId, {
      cells: {
        product: [{ severity: 'error', message: 'Required' }],
      },
      row: [],
    });
    engine.dispatchKeyboard({ type: 'arrow', direction: 'right' });

    expect(engine.getSnapshot().focus.columnId).toBe('quantity');
  });

  it('does not block Tab wrapping when the current row has validation errors', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: '' }],
    });
    const rowId = engine.getSnapshot().focus.rowId;

    engine.applyValidation(rowId, {
      cells: {},
      row: [{ severity: 'error', message: 'Row invalid' }],
    });
    engine.moveFocus({ rowId, columnId: 'lineTotal' });
    engine.dispatchKeyboard({ type: 'tab' });

    expect(engine.getSnapshot().focus.rowId).not.toBe(rowId);
  });

  it('emits row exit and row validation even when validation annotations exist', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: 'SKU-001' }],
    });
    const rowId = engine.getSnapshot().focus.rowId;

    engine.applyValidation(rowId, {
      cells: {
        product: [{ severity: 'warning', message: 'Check product' }],
      },
      row: [],
    });
    engine.dispatchKeyboard({ type: 'arrow', direction: 'down' });

    expect(engine.drainEvents()).toEqual([
      { type: 'rowExited', rowId },
      { type: 'validationRequested', scope: 'row', rowId },
    ]);
  });

  it('preserves validation annotations when save is requested', () => {
    const engine = createTransactionGridEngine({
      columns: resolvedSalesInvoiceGridColumns,
      rows: [{ product: '' }],
    });
    const rowId = engine.getSnapshot().focus.rowId;

    engine.applyValidation(rowId, {
      cells: {
        product: [{ severity: 'error', message: 'Required' }],
      },
      row: [],
    });
    engine.dispatchKeyboard({ type: 'save' });

    expect(engine.getSnapshot().rows[0].metadata.validation.cells.product).toEqual([
      { severity: 'error', message: 'Required' },
    ]);
  });
});

