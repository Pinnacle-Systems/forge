import { describe, expect, it } from 'vitest';
import { createSalesInvoiceCalculationHooks } from '../hooks';
import { recalculateSalesInvoice } from '../recalculation';

describe('recalculateSalesInvoice', () => {
  it('recalculates on quantity change and updates footer totals', () => {
    const result = recalculateSalesInvoice({
      headerValues: { invoiceDate: '2026-04-10' },
      rows: [
        { rowId: 'row-1', values: { quantity: 3, unitPrice: 10, taxCode: 'STANDARD' } },
      ],
    });

    expect(result.rows[0].values).toMatchObject({
      quantity: 3,
      unitPrice: 10,
      lineSubtotal: 30,
      lineTax: 3,
      lineTotal: 33,
    });
    expect(result.footer).toEqual({
      subtotal: 30,
      taxTotal: 3,
      grandTotal: 33,
    });
  });

  it('recalculates on unit price change', () => {
    const result = recalculateSalesInvoice({
      rows: [
        { rowId: 'row-1', values: { quantity: 2, unitPrice: 12, taxCode: 'STANDARD' } },
      ],
    });

    expect(result.rows[0].values).toMatchObject({
      lineSubtotal: 24,
      lineTax: 2.4,
      lineTotal: 26.4,
    });
  });

  it('recalculates on taxCode change', () => {
    const result = recalculateSalesInvoice({
      rows: [
        { rowId: 'row-1', values: { quantity: 2, unitPrice: 10, taxCode: 'ZERO' } },
      ],
    });

    expect(result.rows[0].values).toMatchObject({
      lineSubtotal: 20,
      lineTax: 0,
      lineTotal: 20,
    });
  });

  it('preserves deterministic row ordering', () => {
    const result = recalculateSalesInvoice({
      rows: [
        { rowId: 'row-b', values: { quantity: 1, unitPrice: 2, taxCode: 'ZERO' } },
        { rowId: 'row-a', values: { quantity: 1, unitPrice: 1, taxCode: 'ZERO' } },
      ],
    });

    expect(result.rows.map((row) => row.rowId)).toEqual(['row-b', 'row-a']);
  });

  it('preserves deleted and phantom rows but excludes them from totals', () => {
    const result = recalculateSalesInvoice({
      rows: [
        { rowId: 'row-1', values: { quantity: 1, unitPrice: 10, taxCode: 'ZERO' } },
        { rowId: 'row-2', isDeleted: true, values: { quantity: 99, unitPrice: 99, taxCode: 'STANDARD' } },
        { rowId: 'row-3', isPhantom: true, values: { quantity: 99, unitPrice: 99, taxCode: 'STANDARD' } },
      ],
    });

    expect(result.rows[1].values).toMatchObject({ quantity: 99, unitPrice: 99 });
    expect(result.rows[2].values).toMatchObject({ quantity: 99, unitPrice: 99 });
    expect(result.footer).toEqual({
      subtotal: 10,
      taxTotal: 0,
      grandTotal: 10,
    });
  });

  it('marks preserved manual override stale on product change without overwriting unitPrice', () => {
    const result = recalculateSalesInvoice({
      previousRows: [
        { rowId: 'row-1', values: { product: 'product-old', quantity: 1, unitPrice: 12, taxCode: 'STANDARD' } },
      ],
      rows: [
        {
          rowId: 'row-1',
          values: { product: 'product-new', quantity: 1, unitPrice: 12, taxCode: 'STANDARD' },
          metadata: {
            autofill: {
              unitPrice: {
                sourceColumnId: 'product',
                mode: 'cascade',
                preservedManualOverride: true,
              },
            },
          },
        },
      ],
    });

    expect(result.rows[0].values.unitPrice).toBe(12);
    expect(result.rows[0].metadata?.stale?.unitPrice).toEqual({
      sourceColumnId: 'product',
      reason: 'preserved-manual-override',
    });
  });

  it('uses committed values only and ignores edit buffers', () => {
    const result = recalculateSalesInvoice({
      rows: [
        {
          rowId: 'row-1',
          values: { quantity: 1, unitPrice: 10, taxCode: 'ZERO' },
          metadata: {
            editBuffer: {
              columnId: 'quantity',
              value: 99,
              originalValue: 1,
              capturedRevision: 0,
            },
          },
        },
      ],
    });

    expect(result.rows[0].values.lineSubtotal).toBe(10);
  });

  it('exposes manifest calculation hook refs without mutating the manifest', () => {
    const hooks = createSalesInvoiceCalculationHooks();

    expect(Object.keys(hooks)).toEqual([
      'sales.invoice.calculateLineTotal',
      'sales.invoice.calculateSubtotal',
      'sales.invoice.calculateTaxTotal',
      'sales.invoice.calculateGrandTotal',
    ]);
    expect(hooks['sales.invoice.calculateLineTotal']({
      quantity: 2,
      unitPrice: 10,
      taxCode: 'STANDARD',
    })).toEqual(22);
  });
});
