import type {
  SalesInvoiceRow,
  SalesInvoiceRowMetadata,
} from './types';
import { toFiniteNumber } from './rounding';

interface ShouldMarkManualOverrideStaleInput {
  previousRow?: SalesInvoiceRow;
  currentRow: SalesInvoiceRow;
}

export function isManualUnitPriceOverride(row: SalesInvoiceRow): boolean {
  const snapshotPrice = row.metadata?.lookupSnapshots?.product?.values.unitPrice;

  if (snapshotPrice !== undefined) {
    return toFiniteNumber(row.values.unitPrice) !== toFiniteNumber(snapshotPrice as number | string | undefined);
  }

  return row.metadata?.autofill?.unitPrice?.preservedManualOverride === true
    || row.metadata?.stale?.unitPrice?.reason === 'preserved-manual-override';
}

export function shouldMarkManualOverrideStale(
  input: ShouldMarkManualOverrideStaleInput,
): boolean {
  const { previousRow, currentRow } = input;

  if (!previousRow || !isManualUnitPriceOverride(currentRow)) {
    return false;
  }

  return previousRow.values.product !== currentRow.values.product
    || previousRow.values.taxCode !== currentRow.values.taxCode;
}

export function markManualOverrideStale(row: SalesInvoiceRow): SalesInvoiceRow {
  return {
    ...row,
    values: { ...row.values },
    metadata: mergeStaleMetadata(row.metadata),
  };
}

function mergeStaleMetadata(metadata: SalesInvoiceRowMetadata | undefined): SalesInvoiceRowMetadata {
  return {
    ...metadata,
    stale: {
      ...metadata?.stale,
      unitPrice: {
        sourceColumnId: 'product',
        reason: 'preserved-manual-override',
      },
    },
  };
}
