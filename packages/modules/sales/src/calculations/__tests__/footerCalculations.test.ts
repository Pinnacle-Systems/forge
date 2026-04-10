import { describe, expect, it } from 'vitest';
import { calculateSalesInvoiceFooterTotals } from '../footerCalculations';

describe('calculateSalesInvoiceFooterTotals', () => {
  it('sums footer totals correctly', () => {
    expect(calculateSalesInvoiceFooterTotals([
      { rowId: 'row-1', values: { lineSubtotal: 10, lineTax: 1, lineTotal: 11 } },
      { rowId: 'row-2', values: { lineSubtotal: 20, lineTax: 2, lineTotal: 22 } },
    ])).toEqual({
      subtotal: 30,
      taxTotal: 3,
      grandTotal: 33,
    });
  });

  it('excludes phantom rows', () => {
    expect(calculateSalesInvoiceFooterTotals([
      { rowId: 'row-1', values: { lineSubtotal: 10, lineTax: 1 } },
      { rowId: 'phantom-1', isPhantom: true, values: { lineSubtotal: 99, lineTax: 99 } },
    ])).toEqual({
      subtotal: 10,
      taxTotal: 1,
      grandTotal: 11,
    });
  });

  it('excludes deleted rows', () => {
    expect(calculateSalesInvoiceFooterTotals([
      { rowId: 'row-1', values: { lineSubtotal: 10, lineTax: 1 } },
      { rowId: 'row-2', isDeleted: true, values: { lineSubtotal: 99, lineTax: 99 } },
    ])).toEqual({
      subtotal: 10,
      taxTotal: 1,
      grandTotal: 11,
    });
  });

  it('returns zero totals for empty input', () => {
    expect(calculateSalesInvoiceFooterTotals([])).toEqual({
      subtotal: 0,
      taxTotal: 0,
      grandTotal: 0,
    });
  });
});
