export interface SalesCustomerFixture {
  id: string;
  code: string;
  name: string;
  defaultTaxCode: string;
  active: boolean;
  priceOverrides?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

export const salesCustomerFixtures = Object.freeze([
  {
    id: 'customer-acme',
    code: 'ACM',
    name: 'Acme Retail',
    defaultTaxCode: 'TAX-STD',
    active: true,
  },
  {
    id: 'customer-beta',
    code: 'BETA',
    name: 'Beta Wholesale',
    defaultTaxCode: 'TAX-REDUCED',
    active: true,
    priceOverrides: {
      'product-widget': 8.5,
    },
  },
  {
    id: 'customer-northwind',
    code: 'NORTH',
    name: 'Northwind Suspended',
    defaultTaxCode: 'TAX-STD',
    active: false,
    metadata: {
      creditStatus: 'hold',
    },
  },
]) satisfies readonly SalesCustomerFixture[];
