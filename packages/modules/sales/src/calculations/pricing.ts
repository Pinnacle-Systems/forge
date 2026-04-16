import { salesCustomerFixtures } from '../lookups/customerFixtures';
import { inventoryProductFixtures } from '@forge/inventory/lookups';
import type {
  SalesInvoiceHeaderValues,
  SalesInvoiceRowValues,
} from './types';

export function resolveSalesInvoiceUnitPrice(
  headerValues: SalesInvoiceHeaderValues | undefined,
  rowValues: SalesInvoiceRowValues,
): number | undefined {
  const productId = rowValues.product;

  if (!productId) {
    return undefined;
  }

  const product = inventoryProductFixtures.find((candidate) => candidate.id === productId);

  if (!product) {
    return undefined;
  }

  const customer = salesCustomerFixtures.find((candidate) => candidate.id === headerValues?.customer);
  const customerPrice = customer?.priceOverrides
    ? (customer.priceOverrides as Record<string, number | undefined>)[product.id]
    : undefined;

  if (customerPrice !== undefined) {
    return customerPrice;
  }

  const quantity = typeof rowValues.quantity === 'number'
    ? rowValues.quantity
    : Number(rowValues.quantity ?? 0);

  const quantityBreak = [...(product.quantityPriceBreaks ?? [])]
    .sort((left, right) => right.minQuantity - left.minQuantity)
    .find((priceBreak) => quantity >= priceBreak.minQuantity);

  return quantityBreak?.unitPrice ?? product.baseUnitPrice;
}
