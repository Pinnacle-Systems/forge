import type {
  RecalculateSalesInvoiceInput,
  SalesInvoiceCalculationHooks,
  SalesInvoiceRow,
  SalesInvoiceRowValues,
} from './types';
import { calculateSalesInvoiceFooterTotals } from './footerCalculations';
import { calculateSalesInvoiceLine } from './lineCalculations';
import { recalculateSalesInvoice } from './recalculation';

export function createSalesInvoiceCalculationHooks(): SalesInvoiceCalculationHooks {
  return {
    'sales.invoice.calculateLineTotal': (input) => calculateSalesInvoiceLine(input as SalesInvoiceRowValues).lineTotal,
    'sales.invoice.calculateSubtotal': (input) => calculateSalesInvoiceFooterTotals(input as SalesInvoiceRow[]).subtotal,
    'sales.invoice.calculateTaxTotal': (input) => calculateSalesInvoiceFooterTotals(input as SalesInvoiceRow[]).taxTotal,
    'sales.invoice.calculateGrandTotal': (input) => {
      if (Array.isArray(input)) {
        return calculateSalesInvoiceFooterTotals(input).grandTotal;
      }

      return recalculateSalesInvoice(input as RecalculateSalesInvoiceInput).footer.grandTotal;
    },
  };
}
