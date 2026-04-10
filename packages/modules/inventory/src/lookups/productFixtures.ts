export interface InventoryProductFixture {
  id: string;
  sku: string;
  name: string;
  barcodes: string[];
  baseUnitPrice: number;
  taxCode: string;
  discontinued: boolean;
  validFrom?: string;
  validTo?: string;
  quantityPriceBreaks?: Array<{ minQuantity: number; unitPrice: number }>;
  metadata?: Record<string, unknown>;
}

export const inventoryProductFixtures = Object.freeze([
  {
    id: 'product-widget',
    sku: 'WID-001',
    name: 'Widget',
    barcodes: ['012345678905'],
    baseUnitPrice: 10,
    taxCode: 'TAX-STD',
    discontinued: false,
    validFrom: '2025-01-01',
    quantityPriceBreaks: [
      { minQuantity: 10, unitPrice: 9 },
      { minQuantity: 50, unitPrice: 8.75 },
    ],
  },
  {
    id: 'product-gadget',
    sku: 'GAD-002',
    name: 'Gadget',
    barcodes: ['222222222222'],
    baseUnitPrice: 25,
    taxCode: 'TAX-STD',
    discontinued: false,
  },
  {
    id: 'product-discontinued',
    sku: 'DISC-003',
    name: 'Discontinued Part',
    barcodes: ['333333333333'],
    baseUnitPrice: 5,
    taxCode: 'TAX-STD',
    discontinued: true,
  },
  {
    id: 'product-seasonal',
    sku: 'SEAS-004',
    name: 'Seasonal Kit',
    barcodes: ['444444444444'],
    baseUnitPrice: 40,
    taxCode: 'TAX-REDUCED',
    discontinued: false,
    validFrom: '2026-06-01',
    validTo: '2026-12-31',
  },
  {
    id: 'product-expired',
    sku: 'EXP-005',
    name: 'Expired Bundle',
    barcodes: ['555555555555'],
    baseUnitPrice: 15,
    taxCode: 'TAX-STD',
    discontinued: false,
    validFrom: '2024-01-01',
    validTo: '2025-12-31',
  },
]) satisfies readonly InventoryProductFixture[];
