import { describe, expect, it } from 'vitest';
import {
  isManualUnitPriceOverride,
  markManualOverrideStale,
  shouldMarkManualOverrideStale,
} from '../manualOverride';

describe('manual unit price overrides', () => {
  it('detects override vs snapshot price', () => {
    expect(isManualUnitPriceOverride({
      rowId: 'row-1',
      values: { product: 'product-widget', unitPrice: 12 },
      metadata: {
        lookupSnapshots: {
          product: {
            providerRef: 'inventory.product',
            entityId: 'product-widget',
            values: { unitPrice: 10 },
            capturedAtRevision: 0,
          },
        },
      },
    })).toBe(true);
  });

  it('does not treat matching snapshot price as an override', () => {
    expect(isManualUnitPriceOverride({
      rowId: 'row-1',
      values: { product: 'product-widget', unitPrice: 10 },
      metadata: {
        lookupSnapshots: {
          product: {
            providerRef: 'inventory.product',
            entityId: 'product-widget',
            values: { unitPrice: 10 },
            capturedAtRevision: 0,
          },
        },
      },
    })).toBe(false);
  });

  it('uses metadata fallback when snapshot price is unavailable', () => {
    expect(isManualUnitPriceOverride({
      rowId: 'row-1',
      values: { unitPrice: 12 },
      metadata: {
        autofill: {
          unitPrice: {
            sourceColumnId: 'product',
            mode: 'cascade',
            preservedManualOverride: true,
          },
        },
      },
    })).toBe(true);
  });

  it('marks stale when override is preserved and product changes', () => {
    expect(shouldMarkManualOverrideStale({
      previousRow: { rowId: 'row-1', values: { product: 'product-old', unitPrice: 12, taxCode: 'STANDARD' } },
      currentRow: {
        rowId: 'row-1',
        values: { product: 'product-new', unitPrice: 12, taxCode: 'STANDARD' },
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
    })).toBe(true);
  });

  it('marks stale when override is preserved and tax code changes', () => {
    expect(shouldMarkManualOverrideStale({
      previousRow: { rowId: 'row-1', values: { product: 'product-widget', unitPrice: 12, taxCode: 'ZERO' } },
      currentRow: {
        rowId: 'row-1',
        values: { product: 'product-widget', unitPrice: 12, taxCode: 'STANDARD' },
        metadata: {
          autofill: {
            unitPrice: {
              sourceColumnId: 'taxCode',
              mode: 'cascade',
              preservedManualOverride: true,
            },
          },
        },
      },
    })).toBe(true);
  });

  it('does not mark non-overridden values stale', () => {
    expect(shouldMarkManualOverrideStale({
      previousRow: { rowId: 'row-1', values: { product: 'product-old', unitPrice: 10 } },
      currentRow: { rowId: 'row-1', values: { product: 'product-new', unitPrice: 10 } },
    })).toBe(false);
  });

  it('returns a new row with stale metadata without mutating input', () => {
    const row = {
      rowId: 'row-1',
      values: { unitPrice: 12 },
      metadata: {},
    };

    const marked = markManualOverrideStale(row);

    expect(marked.metadata?.stale?.unitPrice).toEqual({
      sourceColumnId: 'product',
      reason: 'preserved-manual-override',
    });
    expect(row.metadata).toEqual({});
  });
});
