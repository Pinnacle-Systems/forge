import type {
  LineResult,
  SalesInvoiceRowValues,
} from './types';
import { roundCurrency, toFiniteNumber } from './rounding';
import { getTaxRate } from './tax';
export {
  isManualUnitPriceOverride,
  shouldMarkManualOverrideStale,
} from './manualOverride';

export function calculateSalesInvoiceLine(values: SalesInvoiceRowValues): LineResult {
  const quantity = toFiniteNumber(values.quantity);
  const unitPrice = toFiniteNumber(values.unitPrice);
  const taxRate = getTaxRate(values.taxCode);
  const lineSubtotal = roundCurrency(quantity * unitPrice);
  const lineTax = roundCurrency(lineSubtotal * taxRate);

  return {
    lineSubtotal,
    lineTax,
    lineTotal: roundCurrency(lineSubtotal + lineTax),
  };
}
