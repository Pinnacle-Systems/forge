import { describe, expect, it } from 'vitest';
import { createInventoryProductLookupProvider } from '../productLookupProvider';

const provider = createInventoryProductLookupProvider({
  customerPricing: [{
    customerId: 'customer-beta',
    priceOverrides: {
      'product-widget': 8.5,
    },
  }],
});

const context = {
  fieldId: 'product',
  generation: 0,
};

describe('createInventoryProductLookupProvider', () => {
  it('returns no results for empty query', async () => {
    await expect(provider.search({ query: ' ', context })).resolves.toEqual([]);
  });

  it('searches products by SKU', async () => {
    const results = await provider.search({ query: 'WID-001', context });

    expect(results.map((result) => result.entityId)).toEqual(['product-widget']);
  });

  it('searches products by product name case-insensitively', async () => {
    const results = await provider.search({ query: 'gadget', context });

    expect(results.map((result) => result.entityId)).toEqual(['product-gadget']);
  });

  it('searches products by barcode', async () => {
    const results = await provider.search({ query: '012345678905', context });

    expect(results.map((result) => result.entityId)).toEqual(['product-widget']);
  });

  it('resolves exact product ID', async () => {
    const result = await provider.resolve({
      entityId: 'product-widget',
      context,
    });

    expect(result).toMatchObject({
      entityId: 'product-widget',
      label: 'Widget',
      values: {
        product: 'product-widget',
        productSku: 'WID-001',
        productName: 'Widget',
        unitPrice: 10,
        taxCode: 'TAX-STD',
      },
      metadata: {
        sku: 'WID-001',
        barcodes: ['012345678905'],
        discontinued: false,
      },
    });
  });

  it('returns undefined for unknown product ID', async () => {
    await expect(provider.resolve({
      entityId: 'missing-product',
      context,
    })).resolves.toBeUndefined();
  });

  it('enrich returns base unit price with no customer or quantity context', async () => {
    await expect(provider.enrich?.({
      entityId: 'product-widget',
      snapshotValues: {},
      context,
    })).resolves.toEqual({
      product: 'product-widget',
      productSku: 'WID-001',
      productName: 'Widget',
      unitPrice: 10,
      taxCode: 'TAX-STD',
    });
  });

  it('enrich applies customer-specific pricing', async () => {
    await expect(provider.enrich?.({
      entityId: 'product-widget',
      snapshotValues: {},
      context: {
        ...context,
        headerValues: { customer: 'customer-beta' },
        rowValues: { quantity: 100 },
      },
    })).resolves.toMatchObject({
      unitPrice: 8.5,
    });
  });

  it('enrich applies quantity pricing when no customer override takes precedence', async () => {
    await expect(provider.enrich?.({
      entityId: 'product-widget',
      snapshotValues: {},
      context: {
        ...context,
        rowValues: { quantity: 10 },
      },
    })).resolves.toMatchObject({
      unitPrice: 9,
    });
  });

  it('validation returns PRODUCT_DISCONTINUED for discontinued products', async () => {
    await expect(provider.validate({
      entityId: 'product-discontinued',
      snapshotValues: {},
      context: { fieldId: 'product' },
    })).resolves.toMatchObject({
      valid: false,
      issues: [{
        severity: 'error',
        code: 'PRODUCT_DISCONTINUED',
      }],
    });
  });

  it('validation returns PRODUCT_NOT_YET_VALID for future products', async () => {
    await expect(provider.validate({
      entityId: 'product-seasonal',
      snapshotValues: {},
      context: {
        fieldId: 'product',
        headerValues: { invoiceDate: '2026-01-01' },
      },
    })).resolves.toMatchObject({
      valid: false,
      issues: [{
        severity: 'error',
        code: 'PRODUCT_NOT_YET_VALID',
      }],
    });
  });

  it('validation returns PRODUCT_EXPIRED for expired products', async () => {
    await expect(provider.validate({
      entityId: 'product-expired',
      snapshotValues: {},
      context: {
        fieldId: 'product',
        headerValues: { invoiceDate: '2026-01-01' },
      },
    })).resolves.toMatchObject({
      valid: false,
      issues: [{
        severity: 'error',
        code: 'PRODUCT_EXPIRED',
      }],
    });
  });

  it('validation returns valid for active products inside the invoice date window', async () => {
    await expect(provider.validate({
      entityId: 'product-widget',
      snapshotValues: {},
      context: {
        fieldId: 'product',
        headerValues: { invoiceDate: '2026-01-01' },
      },
    })).resolves.toEqual({
      valid: true,
      issues: [],
    });
  });
});
