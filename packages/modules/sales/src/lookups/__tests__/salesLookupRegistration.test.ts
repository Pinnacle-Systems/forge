import { describe, expect, it } from 'vitest';
import { LookupRegistry } from '@forge/platform/lookup-runtime';
import { salesInvoiceManifest } from '../../transactions';
import {
  registerSalesInvoiceLookupProviders,
  salesInvoiceLookupProviderRefs,
} from '../lookupRegistration';

describe('registerSalesInvoiceLookupProviders', () => {
  it('registers Sales Invoice lookup providers', () => {
    const registry = new LookupRegistry();

    registerSalesInvoiceLookupProviders(registry);

    expect(registry.get('sales.customer')?.id).toBe('sales.customer');
    expect(registry.get('inventory.product')?.id).toBe('inventory.product');
    expect(registry.get('sales.taxCode')?.id).toBe('sales.taxCode');
  });

  it('maps manifest hook refs to concrete provider IDs', () => {
    expect(salesInvoiceLookupProviderRefs).toEqual({
      customer: {
        manifestRef: 'sales.customer',
        providerId: 'sales.customer',
      },
      product: {
        manifestRef: 'inventory.product',
        providerId: 'inventory.product',
      },
      taxCode: {
        manifestRef: 'sales.taxCode',
        providerId: 'sales.taxCode',
      },
    });
  });

  it('does not mutate manifest hook refs during registration', () => {
    const before = structuredClone(salesInvoiceManifest.hooks?.lookupProviders);

    registerSalesInvoiceLookupProviders(new LookupRegistry());

    expect(salesInvoiceManifest.hooks?.lookupProviders).toEqual(before);
    expect(salesInvoiceManifest.hooks?.lookupProviders).toContain('sales.customer');
    expect(salesInvoiceManifest.hooks?.lookupProviders).toContain('inventory.product');
    expect(salesInvoiceManifest.hooks?.lookupProviders).toContain('sales.taxCode');
  });

  it('delegates duplicate provider behavior to LookupRegistry', () => {
    const registry = new LookupRegistry();
    registerSalesInvoiceLookupProviders(registry);

    expect(() => registerSalesInvoiceLookupProviders(registry)).toThrow(
      'Lookup provider already registered: sales.customer',
    );
  });
});
