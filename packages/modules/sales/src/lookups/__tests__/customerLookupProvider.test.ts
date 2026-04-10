import { describe, expect, it } from 'vitest';
import { salesCustomerFixtures } from '../customerFixtures';
import { createSalesCustomerLookupProvider } from '../customerLookupProvider';

const provider = createSalesCustomerLookupProvider();

const context = {
  fieldId: 'customer',
  generation: 0,
};

describe('createSalesCustomerLookupProvider', () => {
  it('returns no results for empty query', async () => {
    await expect(provider.search({ query: '   ', context })).resolves.toEqual([]);
  });

  it('searches customers by code', async () => {
    const results = await provider.search({ query: 'ACM', context });

    expect(results.map((result) => result.entityId)).toEqual(['customer-acme']);
  });

  it('searches customers by name case-insensitively', async () => {
    const results = await provider.search({ query: 'northwind', context });

    expect(results.map((result) => result.entityId)).toEqual(['customer-northwind']);
  });

  it('resolves exact customer ID', async () => {
    const result = await provider.resolve({
      entityId: 'customer-acme',
      context,
    });

    expect(result).toMatchObject({
      entityId: 'customer-acme',
      label: 'Acme Retail',
      values: {
        customer: 'customer-acme',
        customerCode: 'ACM',
        customerName: 'Acme Retail',
        defaultTaxCode: 'TAX-STD',
      },
    });
  });

  it('returns undefined for unknown customer ID', async () => {
    await expect(provider.resolve({
      entityId: 'missing-customer',
      context,
    })).resolves.toBeUndefined();
  });

  it('emits customer snapshot values', async () => {
    const [result] = await provider.search({ query: 'BETA', context });

    expect(result.values).toEqual({
      customer: 'customer-beta',
      customerCode: 'BETA',
      customerName: 'Beta Wholesale',
      defaultTaxCode: 'TAX-REDUCED',
    });
    expect(result.metadata).toMatchObject({ active: true });
  });

  it('validates active customers as valid', async () => {
    await expect(provider.validate({
      entityId: 'customer-acme',
      snapshotValues: {},
      context: { fieldId: 'customer' },
    })).resolves.toEqual({
      valid: true,
      issues: [],
    });
  });

  it('validates inactive fixture customers with a deterministic issue code', async () => {
    const inactiveCustomer = salesCustomerFixtures.find((customer) => !customer.active);

    expect(inactiveCustomer).toBeDefined();
    await expect(provider.validate({
      entityId: inactiveCustomer?.id ?? '',
      snapshotValues: {},
      context: { fieldId: 'customer' },
    })).resolves.toMatchObject({
      valid: false,
      issues: [{
        severity: 'error',
        code: 'CUSTOMER_INACTIVE',
      }],
    });
  });
});
