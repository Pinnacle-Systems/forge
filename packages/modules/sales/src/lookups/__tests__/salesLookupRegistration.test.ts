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
  });

  it('maps manifest hook refs to concrete provider IDs', () => {
    expect(salesInvoiceLookupProviderRefs).toEqual({
      customer: {
        manifestRef: 'sales.customerLookup',
        providerId: 'sales.customer',
      },
      product: {
        manifestRef: 'inventory.productLookup',
        providerId: 'inventory.product',
      },
    });
  });

  it('does not mutate manifest hook refs during registration', () => {
    const before = structuredClone(salesInvoiceManifest.hooks?.lookupProviders);

    registerSalesInvoiceLookupProviders(new LookupRegistry());

    expect(salesInvoiceManifest.hooks?.lookupProviders).toEqual(before);
    expect(salesInvoiceManifest.hooks?.lookupProviders).toContain('sales.customerLookup');
    expect(salesInvoiceManifest.hooks?.lookupProviders).toContain('inventory.productLookup');
  });

  it('delegates duplicate provider behavior to LookupRegistry', () => {
    const registry = new LookupRegistry();
    registerSalesInvoiceLookupProviders(registry);

    expect(() => registerSalesInvoiceLookupProviders(registry)).toThrow(
      'Lookup provider already registered: sales.customer',
    );
  });
});
