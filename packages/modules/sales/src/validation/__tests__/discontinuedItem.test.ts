import { describe, it, expect } from 'vitest';
import { validateDiscontinuedProduct } from '../discontinuedItem';
import type { LookupValidationResult } from '@forge/platform/lookup-runtime';

describe('validateDiscontinuedProduct', () => {
  it('returns undefined if policy is ignore', () => {
    const result: LookupValidationResult = {
      valid: false,
      issues: [{ severity: 'error', message: 'Item is discontinued', code: 'PRODUCT_DISCONTINUED' }],
    };
    expect(validateDiscontinuedProduct(result, 'ignore')).toBeUndefined();
  });

  it('returns undefined if no discontinued issue is present', () => {
    const result: LookupValidationResult = {
      valid: false,
      issues: [{ severity: 'warning', message: 'Some other issue', code: 'OTHER_ISSUE' }],
    };
    expect(validateDiscontinuedProduct(result, 'block')).toBeUndefined();
  });

  it('returns error severity when policy is block', () => {
    const result: LookupValidationResult = {
      valid: false,
      issues: [{ severity: 'error', message: 'Item is discontinued', code: 'PRODUCT_DISCONTINUED' }],
    };
    const issue = validateDiscontinuedProduct(result, 'block');
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('error');
    expect(issue?.message).toBe('Item is discontinued');
  });

  it('returns warning severity when policy is warn', () => {
    const result: LookupValidationResult = {
      valid: false,
      issues: [{ severity: 'error', message: 'Item is discontinued', code: 'PRODUCT_DISCONTINUED' }],
    };
    const issue = validateDiscontinuedProduct(result, 'warn');
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('warning');
    expect(issue?.message).toBe('Item is discontinued');
  });
});
