import { calculateSalesInvoiceFooterTotals } from './footerCalculations';
import { calculateSalesInvoiceLine } from './lineCalculations';
import {
  markManualOverrideStale,
  shouldMarkManualOverrideStale,
} from './manualOverride';
import type {
  RecalculateSalesInvoiceInput,
  RecalculateSalesInvoiceResult,
  SalesInvoiceRow,
} from './types';

export function recalculateSalesInvoice(
  input: RecalculateSalesInvoiceInput,
): RecalculateSalesInvoiceResult {
  const previousRowsById = new Map(
    (input.previousRows ?? []).map((row) => [row.rowId, row]),
  );
  const rows = input.rows.map((row) => recalculateRow(row, previousRowsById.get(row.rowId)));

  return {
    rows,
    footer: calculateSalesInvoiceFooterTotals(rows),
  };
}

function recalculateRow(row: SalesInvoiceRow, previousRow?: SalesInvoiceRow): SalesInvoiceRow {
  if (row.isDeleted || row.isPhantom) {
    return cloneRow(row);
  }

  const calculated = calculateSalesInvoiceLine(row.values);
  const nextRow: SalesInvoiceRow = {
    ...row,
    values: {
      ...row.values,
      ...calculated,
    },
    metadata: row.metadata ? { ...row.metadata } : undefined,
  };

  if (shouldMarkManualOverrideStale({ previousRow, currentRow: nextRow })) {
    return markManualOverrideStale(nextRow);
  }

  return nextRow;
}

function cloneRow(row: SalesInvoiceRow): SalesInvoiceRow {
  return {
    ...row,
    values: { ...row.values },
    metadata: row.metadata ? { ...row.metadata } : undefined,
  };
}
