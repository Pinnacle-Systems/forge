import type {
  GridValue,
  LookupProvider,
  LookupResult,
  LookupValidationResult,
} from '@forge/platform';
import {
  inventoryProductFixtures,
  type InventoryProductFixture,
} from './productFixtures';

export const inventoryProductLookupProviderId = 'inventory.product';

interface InventoryProductLookupProviderOptions {
  products?: readonly InventoryProductFixture[];
}

export function createInventoryProductLookupProvider(
  options: InventoryProductLookupProviderOptions = {},
): LookupProvider {
  const products = options.products ?? inventoryProductFixtures;

  return {
    id: inventoryProductLookupProviderId,

    async search({ query }) {
      const normalized = normalizeQuery(query);

      if (!normalized) {
        return [];
      }

      return products
        .filter((product) => matchesProduct(product, normalized))
        .map(toProductResult);
    },

    async resolve({ entityId }) {
      const product = products.find((candidate) => candidate.id === entityId);
      return product ? toProductResult(product) : undefined;
    },

    async enrich({ entityId }) {
      const product = products.find((candidate) => candidate.id === entityId);

      if (!product) {
        return {};
      }

      return {
        product: product.id,
        productSku: product.sku,
        productName: product.name,
        unitPrice: product.baseUnitPrice,
        taxCode: product.taxCode,
      };
    },

    async validate({ entityId, context }) {
      const product = products.find((candidate) => candidate.id === entityId);

      if (!product) {
        return invalid('PRODUCT_NOT_FOUND', `Product not found: ${entityId}`);
      }

      if (product.discontinued) {
        return invalid('PRODUCT_DISCONTINUED', `Product is discontinued: ${product.sku}`);
      }

      const invoiceDate = getStringValue(context.headerValues?.invoiceDate);

      if (invoiceDate && product.validFrom && invoiceDate < product.validFrom) {
        return invalid('PRODUCT_NOT_YET_VALID', `Product is not valid until ${product.validFrom}`);
      }

      if (invoiceDate && product.validTo && invoiceDate > product.validTo) {
        return invalid('PRODUCT_EXPIRED', `Product expired on ${product.validTo}`);
      }

      return { valid: true, issues: [] };
    },
  };
}

function matchesProduct(product: InventoryProductFixture, normalizedQuery: string): boolean {
  return normalizeQuery(product.sku).includes(normalizedQuery)
    || normalizeQuery(product.name).includes(normalizedQuery)
    || product.barcodes.some((barcode) => normalizeQuery(barcode) === normalizedQuery);
}

function toProductResult(product: InventoryProductFixture): LookupResult {
  return {
    entityId: product.id,
    label: product.name,
    values: {
      product: product.id,
      productSku: product.sku,
      productName: product.name,
      unitPrice: product.baseUnitPrice,
      taxCode: product.taxCode,
    },
    metadata: {
      sku: product.sku,
      barcodes: [...product.barcodes],
      discontinued: product.discontinued,
      validFrom: product.validFrom,
      validTo: product.validTo,
      ...product.metadata,
    },
  };
}

function invalid(code: string, message: string): LookupValidationResult {
  return {
    valid: false,
    issues: [{
      severity: 'error',
      code,
      message,
    }],
  };
}

function getStringValue(value: GridValue): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function normalizeQuery(value: string): string {
  return value.trim().toLocaleLowerCase();
}
