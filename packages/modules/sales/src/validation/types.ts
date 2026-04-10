import type { ValidationPolicy } from '@forge/platform/transaction-shell/types';

export interface ProductValidationContext {
  productId: string;
  isDiscontinued: boolean;
  policy: ValidationPolicy;
}

// Default policy configuration for discontinued items
export const discontinuedItemPolicy: ValidationPolicy = 'block';
