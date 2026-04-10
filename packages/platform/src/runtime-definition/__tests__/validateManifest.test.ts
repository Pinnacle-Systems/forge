import { describe, expect, it } from 'vitest';
import { ManifestValidationError } from '../errors';
import type { TransactionManifest } from '../types';
import { validateManifest } from '../validateManifest';
import { salesInvoiceManifest } from './fixtures/salesInvoiceManifest.fixture';

describe('validateManifest', () => {
  it('accepts a valid Sales Invoice manifest', () => {
    expect(() => validateManifest(salesInvoiceManifest)).not.toThrow();
  });

  it('throws when transactionType is missing', () => {
    const manifest = cloneManifest();
    manifest.transactionType = '';

    expect(() => validateManifest(manifest)).toThrow(ManifestValidationError);
  });

  it('throws when required collections are missing or not arrays', () => {
    const manifest = {
      ...cloneManifest(),
      header: { fields: undefined },
    } as unknown as TransactionManifest;

    expect(() => validateManifest(manifest)).toThrow(ManifestValidationError);
  });

  it('throws when an element is missing id, label, kind, or numeric order', () => {
    const manifest = cloneManifest();
    manifest.header.fields[0] = {
      ...manifest.header.fields[0],
      id: '',
      label: '',
      kind: undefined as unknown as never,
      order: Number.NaN,
    };

    expect(() => validateManifest(manifest)).toThrow(ManifestValidationError);
  });

  it('throws when duplicate IDs appear across header, grid, and footer', () => {
    const manifest = cloneManifest();
    manifest.grid.columns[0].id = 'customer';

    expect(() => validateManifest(manifest)).toThrow(ManifestValidationError);
  });

  it('throws when an unsupported field kind is used', () => {
    const manifest = cloneManifest();
    manifest.header.fields[0].kind = 'email' as never;

    expect(() => validateManifest(manifest)).toThrow(ManifestValidationError);
  });

  it('throws when overridePermissions includes an unsupported key', () => {
    const manifest = cloneManifest();
    manifest.header.fields[0].overridePermissions = {
      calculationRef: true,
    } as never;

    expect(() => validateManifest(manifest)).toThrow(ManifestValidationError);
  });

  it('throws when an overridePermissions value is not boolean', () => {
    const manifest = cloneManifest();
    manifest.header.fields[0].overridePermissions = {
      label: 'yes',
    } as never;

    expect(() => validateManifest(manifest)).toThrow(ManifestValidationError);
  });

  it('throws when lookup, calculation, or validation refs are undeclared', () => {
    const lookupManifest = cloneManifest();
    lookupManifest.header.fields[0].lookupProviderRef = 'missing.lookup';

    const calculationManifest = cloneManifest();
    calculationManifest.grid.columns[4].calculationRef = 'missing.calculation';

    const validationManifest = cloneManifest();
    validationManifest.header.fields[0].validationRefs = ['missing.validation'];

    expect(() => validateManifest(lookupManifest)).toThrow(ManifestValidationError);
    expect(() => validateManifest(calculationManifest)).toThrow(ManifestValidationError);
    expect(() => validateManifest(validationManifest)).toThrow(ManifestValidationError);
  });
});

function cloneManifest(): TransactionManifest {
  return structuredClone(salesInvoiceManifest);
}
