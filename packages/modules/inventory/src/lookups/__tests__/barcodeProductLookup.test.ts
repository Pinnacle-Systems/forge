import { describe, expect, it } from 'vitest';
import { applyLookupSelection } from '@forge/platform/lookup-runtime';
import { createTransactionGridEngine } from '@forge/platform/transaction-grid';
import type { ResolvedGridColumn } from '@forge/platform/transaction-grid';
import { createInventoryProductLookupProvider, inventoryProductLookupProviderId } from '../productLookupProvider';

const productColumns: ResolvedGridColumn[] = [
  column('product', 'Product', 'lookup', 10),
  column('productSku', 'SKU', 'text', 20),
  column('productName', 'Product Name', 'text', 30),
  column('unitPrice', 'Unit Price', 'currency', 40),
  column('taxCode', 'Tax Code', 'lookup', 50),
];

describe('barcode product lookup flow', () => {
  it('fills a row through product lookup, enrich, and lookup selection', async () => {
    const provider = createInventoryProductLookupProvider();
    const engine = createTransactionGridEngine({
      columns: productColumns,
      rows: [{ quantity: 2 }],
    });
    const row = engine.getSnapshot().rows[0];

    const [barcodeResult] = await provider.search({
      query: '012345678905',
      context: {
        rowId: row.id,
        fieldId: 'product',
        rowValues: row.values,
        generation: row.metadata.generation,
      },
    });
    const enrichValues = await provider.enrich?.({
      entityId: barcodeResult.entityId,
      snapshotValues: barcodeResult.values,
      context: {
        rowId: row.id,
        fieldId: 'product',
        rowValues: row.values,
        generation: row.metadata.generation,
      },
    });

    const result = applyLookupSelection({
      engine,
      selection: {
        providerId: inventoryProductLookupProviderId,
        fieldId: 'product',
        rowId: row.id,
        result: {
          ...barcodeResult,
          values: {
            ...barcodeResult.values,
            ...enrichValues,
          },
        },
        capturedGeneration: row.metadata.generation,
      },
    });

    const updatedRow = engine.getSnapshot().rows[0];
    expect(result.applied).toBe(true);
    expect(updatedRow.values).toMatchObject({
      product: 'product-widget',
      productSku: 'WID-001',
      productName: 'Widget',
      unitPrice: 10,
      taxCode: 'TAX-STD',
    });
    expect(updatedRow.metadata.lookupSnapshots.product).toMatchObject({
      providerRef: 'inventory.product',
      entityId: 'product-widget',
      label: 'Widget',
    });
  });
});

function column(
  id: string,
  label: string,
  kind: ResolvedGridColumn['kind'],
  order: number,
): ResolvedGridColumn {
  return {
    id,
    label,
    kind,
    visible: true,
    editable: true,
    required: false,
    order,
    validationRefs: [],
    cascadeRefs: [],
  };
}
