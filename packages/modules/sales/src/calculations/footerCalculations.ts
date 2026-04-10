import type {
  FooterResult,
  SalesInvoiceRow,
} from './types';
import { roundCurrency, toFiniteNumber } from './rounding';

export function calculateSalesInvoiceFooterTotals(rows: SalesInvoiceRow[]): FooterResult {
  const includedRows = rows.filter((row) => !row.isDeleted && !row.isPhantom);
  const subtotal = roundCurrency(includedRows.reduce(
    (total, row) => total + toFiniteNumber(row.values.lineSubtotal),
    0,
  ));
  const taxTotal = roundCurrency(includedRows.reduce(
    (total, row) => total + toFiniteNumber(row.values.lineTax),
    0,
  ));

  return {
    subtotal,
    taxTotal,
    grandTotal: roundCurrency(subtotal + taxTotal),
  };
}
