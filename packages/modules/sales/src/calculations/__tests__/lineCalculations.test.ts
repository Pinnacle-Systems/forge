import { describe, expect, it } from 'vitest';
import { calculateSalesInvoiceLine } from '../lineCalculations';

describe('calculateSalesInvoiceLine', () => {
  it('calculates subtotal, tax, and total', () => {
    expect(calculateSalesInvoiceLine({
      quantity: 2,
      unitPrice: 10,
      taxCode: 'STANDARD',
    })).toEqual({
      lineSubtotal: 20,
      lineTax: 2,
      lineTotal: 22,
    });
  });

  it('rounds half-up to two decimal places at each step', () => {
    expect(calculateSalesInvoiceLine({
      quantity: 1,
      unitPrice: 0.005,
      taxCode: 'ZERO',
    })).toEqual({
      lineSubtotal: 0.01,
      lineTax: 0,
      lineTotal: 0.01,
    });
  });

  it('treats zero and invalid input as zero', () => {
    expect(calculateSalesInvoiceLine({
      quantity: 'not-a-number',
      unitPrice: undefined,
      taxCode: 'STANDARD',
    })).toEqual({
      lineSubtotal: 0,
      lineTax: 0,
      lineTotal: 0,
    });
  });

  it('is deterministic for repeated inputs', () => {
    const input = {
      quantity: '3',
      unitPrice: '2.335',
      taxCode: 'STANDARD',
    };

    expect(calculateSalesInvoiceLine(input)).toEqual(calculateSalesInvoiceLine(input));
  });
});
