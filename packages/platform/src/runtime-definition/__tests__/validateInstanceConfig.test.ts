import { describe, expect, it } from 'vitest';
import { validateInstanceConfig } from '../validateInstanceConfig';
import { salesInvoiceManifest } from './fixtures/salesInvoiceManifest.fixture';
import {
  businessLogicOverrideConfig,
  emptyConfig,
  invalidValueConfig,
  unauthorizedOverrideConfig,
  unknownTargetConfig,
} from './fixtures/instanceConfigs.fixture';

describe('validateInstanceConfig', () => {
  it('returns no diagnostics for undefined config', () => {
    expect(validateInstanceConfig(undefined, salesInvoiceManifest)).toEqual([]);
  });

  it('returns no diagnostics for empty config with matching transactionType', () => {
    expect(validateInstanceConfig(emptyConfig, salesInvoiceManifest)).toEqual([]);
  });

  it('warns and ignores config with mismatched transactionType', () => {
    const diagnostics = validateInstanceConfig({
      transactionType: 'purchase.invoice',
      overrides: {},
    }, salesInvoiceManifest);

    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: 'warning',
        code: 'UNKNOWN_TARGET',
      }),
    ]);
  });

  it('warns with UNKNOWN_TARGET for unknown target IDs', () => {
    const diagnostics = validateInstanceConfig(unknownTargetConfig, salesInvoiceManifest);

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'UNKNOWN_TARGET',
        targetId: 'missingField',
      }),
    ]);
  });

  it('warns with UNKNOWN_OVERRIDE_PROPERTY for non-contract keys', () => {
    const diagnostics = validateInstanceConfig({
      transactionType: 'sales.invoice',
      overrides: {
        reference: {
          placeholder: 'External ref',
        },
      },
    } as never, salesInvoiceManifest);

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'UNKNOWN_OVERRIDE_PROPERTY',
        targetId: 'reference',
        property: 'placeholder',
      }),
    ]);
  });

  it('warns with OVERRIDE_NOT_PERMITTED for unauthorized allowed properties', () => {
    const diagnostics = validateInstanceConfig(unauthorizedOverrideConfig, salesInvoiceManifest);

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'OVERRIDE_NOT_PERMITTED',
        targetId: 'lineTotal',
        property: 'editable',
      }),
    ]);
  });

  it('warns with INVALID_OVERRIDE_VALUE for invalid presentation values', () => {
    const diagnostics = validateInstanceConfig(invalidValueConfig, salesInvoiceManifest);

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'INVALID_OVERRIDE_VALUE',
      'INVALID_OVERRIDE_VALUE',
      'INVALID_OVERRIDE_VALUE',
      'INVALID_OVERRIDE_VALUE',
      'INVALID_OVERRIDE_VALUE',
      'INVALID_OVERRIDE_VALUE',
    ]);
    expect(diagnostics.map((diagnostic) => diagnostic.property)).toEqual([
      'visible',
      'label',
      'order',
      'editable',
      'required',
      'width',
    ]);
  });

  it('warns with BUSINESS_LOGIC_OVERRIDE_IGNORED for business behavior overrides', () => {
    const diagnostics = validateInstanceConfig(businessLogicOverrideConfig, salesInvoiceManifest);

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
    ]);
    expect(diagnostics.map((diagnostic) => diagnostic.property)).toEqual([
      'calculationRef',
      'lookupProviderRef',
      'validationRefs',
      'kind',
      'id',
      'cascadeRefs',
      'hooks',
      'persistence',
    ]);
  });
});
