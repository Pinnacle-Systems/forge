import { LookupRegistry } from '@forge/platform/lookup-runtime';
import { createInventoryProductLookupProvider, inventoryProductLookupProviderId } from '@forge/inventory/lookups';
import {
  createSalesCustomerLookupProvider,
  salesCustomerLookupProviderId,
} from './customerLookupProvider';
import {
  createSalesTaxCodeLookupProvider,
  salesTaxCodeLookupProviderId,
} from './taxCodeLookupProvider';

export const salesInvoiceLookupProviderRefs = {
  customer: {
    manifestRef: salesCustomerLookupProviderId,
    providerId: salesCustomerLookupProviderId,
  },
  product: {
    manifestRef: inventoryProductLookupProviderId,
    providerId: inventoryProductLookupProviderId,
  },
  taxCode: {
    manifestRef: salesTaxCodeLookupProviderId,
    providerId: salesTaxCodeLookupProviderId,
  },
} as const;

export function registerSalesInvoiceLookupProviders(registry: LookupRegistry): void {
  registry.register(createSalesCustomerLookupProvider());
  registry.register(createInventoryProductLookupProvider());
  registry.register(createSalesTaxCodeLookupProvider());
}
