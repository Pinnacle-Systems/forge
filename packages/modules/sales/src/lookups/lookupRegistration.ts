import { LookupRegistry } from '@forge/platform/lookup-runtime';
import { createInventoryProductLookupProvider, inventoryProductLookupProviderId } from '@forge/inventory/lookups';
import { salesCustomerFixtures } from './customerFixtures';
import {
  createSalesCustomerLookupProvider,
  salesCustomerLookupProviderId,
} from './customerLookupProvider';

export const salesInvoiceLookupProviderRefs = {
  customer: {
    manifestRef: 'sales.customerLookup',
    providerId: salesCustomerLookupProviderId,
  },
  product: {
    manifestRef: 'inventory.productLookup',
    providerId: inventoryProductLookupProviderId,
  },
} as const;

export function registerSalesInvoiceLookupProviders(registry: LookupRegistry): void {
  registry.register(createSalesCustomerLookupProvider());
  registry.register(createInventoryProductLookupProvider({
    customerPricing: salesCustomerFixtures.map((customer) => ({
      customerId: customer.id,
      priceOverrides: customer.priceOverrides ?? {},
    })),
  }));
}
