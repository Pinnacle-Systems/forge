import type { ValidationIssue, ValidationPolicy } from '@forge/platform/transaction-shell';
import type { LookupValidationResult } from '@forge/platform/lookup-runtime';

export function validateDiscontinuedProduct(
  providerResult: LookupValidationResult,
  policy: ValidationPolicy,
  context?: { id?: string, fieldId?: string, rowId?: string }
): ValidationIssue | undefined {
  if (policy === 'ignore') {
    return undefined;
  }

  // Assuming provider validation might return standard issues, we look for 'PRODUCT_DISCONTINUED'
  // Story 007 says: adapter `validateDiscontinuedProduct(providerResult, policy)` transforms the specific provider's `PRODUCT_DISCONTINUED` result
  const discontinuedIssue = providerResult.issues.find(i => i.code === 'PRODUCT_DISCONTINUED' || i.message.includes('discontinued'));

  if (!discontinuedIssue) {
    return undefined;
  }

  return {
    id: context?.id || 'discontinued_item',
    fieldId: context?.fieldId || 'productId',
    rowId: context?.rowId,
    // The policy dictates severity during assembly
    severity: policy === 'block' ? 'error' : 'warning',
    message: discontinuedIssue.message || 'Product is discontinued',
  };
}
