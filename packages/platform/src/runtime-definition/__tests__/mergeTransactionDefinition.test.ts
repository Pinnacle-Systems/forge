import { describe, expect, it } from 'vitest';
import type { TransactionInstanceConfig, TransactionManifest } from '../types';
import { ConfigVersionMismatchError } from '../errors';
import { mergeTransactionDefinition } from '../mergeTransactionDefinition';
import { salesInvoiceManifest } from './fixtures/salesInvoiceManifest.fixture';
import { validPresentationConfig } from './fixtures/instanceConfigs.fixture';

describe('mergeTransactionDefinition', () => {
  it('resolves a valid Sales Invoice manifest with no config', () => {
    const resolved = mergeTransactionDefinition(salesInvoiceManifest);

    expect(resolved.transactionType).toBe('sales.invoice');
    expect(resolved.schemaVersion).toBe('1.0.0');
    expect(resolved.title).toBe('Sales Invoice');
    expect(resolved.header.fields.map((field) => field.id)).toEqual([
      'customer',
      'invoiceDate',
      'reference',
    ]);
    expect(resolved.grid.columns.map((column) => column.id)).toEqual([
      'product',
      'quantity',
      'unitPrice',
      'taxCode',
      'lineTotal',
    ]);
    expect(resolved.footer.fields.map((field) => field.id)).toEqual([
      'subtotal',
      'taxTotal',
      'grandTotal',
    ]);
    expect(resolved.header.fields[2]).toMatchObject({
      visible: true,
      editable: true,
      required: false,
    });
    expect(resolved.diagnostics).toEqual([]);
  });

  it('applies authorized presentation overrides without changing business hooks', () => {
    const resolved = mergeTransactionDefinition(salesInvoiceManifest, validPresentationConfig);
    const reference = resolved.header.fields.find((field) => field.id === 'reference');
    const quantity = resolved.grid.columns.find((column) => column.id === 'quantity');
    const lineTotal = resolved.grid.columns.find((column) => column.id === 'lineTotal');

    expect(reference).toMatchObject({
      label: 'PO Reference',
      visible: false,
      order: 5,
    });
    expect(quantity).toMatchObject({
      label: 'Qty',
      width: 96,
      editable: false,
      required: false,
      order: 15,
    });
    expect(lineTotal?.calculationRef).toBe('sales.invoice.calculateLineTotal');
    expect(resolved.hooks.persistence).toBe('sales.invoice.save');
    expect(resolved.diagnostics).toEqual([]);
  });

  it('does not mutate manifest or config inputs', () => {
    const manifestBefore = structuredClone(salesInvoiceManifest);
    const configBefore = structuredClone(validPresentationConfig);

    mergeTransactionDefinition(salesInvoiceManifest, validPresentationConfig);

    expect(salesInvoiceManifest).toEqual(manifestBefore);
    expect(validPresentationConfig).toEqual(configBefore);
  });

  it('does not expose overridePermissions on resolved elements', () => {
    const resolved = mergeTransactionDefinition(salesInvoiceManifest);
    const allElements = [
      ...resolved.header.fields,
      ...resolved.grid.columns,
      ...resolved.footer.fields,
    ];

    expect(allElements.every((element) => !('overridePermissions' in element))).toBe(true);
  });

  it('preserves module hook references', () => {
    const resolved = mergeTransactionDefinition(salesInvoiceManifest);

    expect(resolved.hooks).toEqual(salesInvoiceManifest.hooks);
    expect(resolved.header.fields.find((field) => field.id === 'customer')?.lookupProviderRef)
      .toBe('sales.customer');
    expect(resolved.grid.columns.find((column) => column.id === 'product')?.lookupProviderRef)
      .toBe('inventory.product');
    expect(resolved.grid.columns.find((column) => column.id === 'lineTotal')?.calculationRef)
      .toBe('sales.invoice.calculateLineTotal');
    expect(resolved.footer.fields.find((field) => field.id === 'grandTotal')?.calculationRef)
      .toBe('sales.invoice.calculateGrandTotal');
  });

  it('sorts deterministically by id when orders tie', () => {
    const manifest: TransactionManifest = structuredClone(salesInvoiceManifest);
    manifest.header.fields[0].order = 10;
    manifest.header.fields[1].order = 10;
    manifest.header.fields[2].order = 10;

    const resolved = mergeTransactionDefinition(manifest);

    expect(resolved.header.fields.map((field) => field.id)).toEqual([
      'customer',
      'invoiceDate',
      'reference',
    ]);
  });

  it('ignores invalid config entries while applying valid entries', () => {
    const config = {
      transactionType: 'sales.invoice',
      targetManifestVersion: '1.0.0',
      overrides: {
        reference: {
          label: 'PO Reference',
          calculationRef: 'customer.formula',
        },
      },
    } as unknown as TransactionInstanceConfig;

    const resolved = mergeTransactionDefinition(salesInvoiceManifest, config);
    const reference = resolved.header.fields.find((field) => field.id === 'reference');

    expect(reference?.label).toBe('PO Reference');
    expect(resolved.diagnostics).toHaveLength(1);
    expect(resolved.diagnostics[0]).toMatchObject({
      code: 'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      targetId: 'reference',
      property: 'calculationRef',
    });
  });

  it('fails hard when config targets an incompatible manifest version', () => {
    expect(() => mergeTransactionDefinition(salesInvoiceManifest, {
      transactionType: 'sales.invoice',
      targetManifestVersion: '2.0.0',
      overrides: {},
    })).toThrow(ConfigVersionMismatchError);
  });
});
