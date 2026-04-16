import { describe, expect, it } from 'vitest';
import type { TransactionInstanceConfig } from '@forge/platform/runtime-definition';
import { mergeTransactionDefinition } from '@forge/platform/runtime-definition';
import { salesInvoiceManifest } from '../salesInvoice.manifest';

describe('salesInvoiceManifest', () => {
  it('resolves through the runtime definition merge engine', () => {
    const resolved = mergeTransactionDefinition(salesInvoiceManifest);

    expect(resolved).toMatchObject({
      transactionType: 'sales.invoice',
      schemaVersion: '1.0.0',
      title: 'Sales Invoice',
      diagnostics: [],
    });
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
  });

  it('preserves Sales-owned hook references', () => {
    const resolved = mergeTransactionDefinition(salesInvoiceManifest);

    expect(resolved.header.fields.find((field) => field.id === 'customer')?.lookupProviderRef)
      .toBe('sales.customer');
    expect(resolved.grid.columns.find((column) => column.id === 'product')?.lookupProviderRef)
      .toBe('inventory.product');
    expect(resolved.grid.columns.find((column) => column.id === 'taxCode')?.lookupProviderRef)
      .toBe('sales.taxCode');
    expect(resolved.grid.columns.find((column) => column.id === 'lineTotal')?.calculationRef)
      .toBe('sales.invoice.calculateLineTotal');
    expect(resolved.footer.fields.find((field) => field.id === 'subtotal')?.calculationRef)
      .toBe('sales.invoice.calculateSubtotal');
    expect(resolved.footer.fields.find((field) => field.id === 'taxTotal')?.calculationRef)
      .toBe('sales.invoice.calculateTaxTotal');
    expect(resolved.footer.fields.find((field) => field.id === 'grandTotal')?.calculationRef)
      .toBe('sales.invoice.calculateGrandTotal');
    expect(resolved.hooks).toEqual({
      calculations: [
        'sales.invoice.calculateLineTotal',
        'sales.invoice.calculateSubtotal',
        'sales.invoice.calculateTaxTotal',
        'sales.invoice.calculateGrandTotal',
      ],
      validations: [
        'sales.invoice.validateCustomer',
        'sales.invoice.validateProduct',
        'sales.invoice.validateDiscontinuedItems',
      ],
      lookupProviders: [
        'sales.customer',
        'inventory.product',
        'sales.taxCode',
      ],
      persistence: 'sales.invoice.save',
    });
  });

  it('applies authorized presentation overrides without changing business hooks', () => {
    const config: TransactionInstanceConfig = {
      transactionType: 'sales.invoice',
      targetManifestVersion: '1.0.0',
      overrides: {
        reference: {
          label: 'Customer Reference',
          visible: false,
          order: 5,
        },
        quantity: {
          label: 'Qty',
          width: 90,
          editable: false,
          required: false,
        },
        lineTotal: {
          label: 'Amount',
          width: 120,
          visible: false,
        },
      },
    };

    const resolved = mergeTransactionDefinition(salesInvoiceManifest, config);
    const reference = resolved.header.fields.find((field) => field.id === 'reference');
    const quantity = resolved.grid.columns.find((column) => column.id === 'quantity');
    const lineTotal = resolved.grid.columns.find((column) => column.id === 'lineTotal');

    expect(resolved.diagnostics).toEqual([]);
    expect(reference).toMatchObject({
      label: 'Customer Reference',
      visible: false,
      order: 5,
    });
    expect(quantity).toMatchObject({
      label: 'Qty',
      width: 90,
      editable: false,
      required: false,
    });
    expect(lineTotal).toMatchObject({
      label: 'Amount',
      width: 120,
      visible: false,
      editable: false,
      calculationRef: 'sales.invoice.calculateLineTotal',
    });
    expect(resolved.hooks.persistence).toBe('sales.invoice.save');
  });

  it('ignores attempts to alter Sales Invoice business behavior', () => {
    const config = {
      transactionType: 'sales.invoice',
      targetManifestVersion: '1.0.0',
      overrides: {
        lineTotal: {
          calculationRef: 'customer.lineTotalFormula',
          editable: true,
        },
        subtotal: {
          calculationRef: 'customer.subtotalFormula',
          editable: true,
        },
        taxTotal: {
          calculationRef: 'customer.taxFormula',
          editable: true,
        },
        grandTotal: {
          calculationRef: 'customer.grandTotalFormula',
          editable: true,
          hooks: {
            persistence: 'customer.save',
          },
        },
        customer: {
          lookupProviderRef: 'customer.lookup',
          validationRefs: [],
          kind: 'text',
          id: 'customerAlias',
        },
        product: {
          lookupProviderRef: 'product.lookup',
        },
        taxCode: {
          lookupProviderRef: 'customer.taxLookup',
        },
      },
    } as unknown as TransactionInstanceConfig;

    const resolved = mergeTransactionDefinition(salesInvoiceManifest, config);
    const lineTotal = resolved.grid.columns.find((column) => column.id === 'lineTotal');
    const subtotal = resolved.footer.fields.find((field) => field.id === 'subtotal');
    const taxTotal = resolved.footer.fields.find((field) => field.id === 'taxTotal');
    const grandTotal = resolved.footer.fields.find((field) => field.id === 'grandTotal');
    const customer = resolved.header.fields.find((field) => field.id === 'customer');
    const product = resolved.grid.columns.find((column) => column.id === 'product');
    const taxCode = resolved.grid.columns.find((column) => column.id === 'taxCode');

    expect(resolved.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'OVERRIDE_NOT_PERMITTED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'OVERRIDE_NOT_PERMITTED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'OVERRIDE_NOT_PERMITTED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'OVERRIDE_NOT_PERMITTED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
      'BUSINESS_LOGIC_OVERRIDE_IGNORED',
    ]);
    expect(lineTotal).toMatchObject({
      editable: false,
      calculationRef: 'sales.invoice.calculateLineTotal',
    });
    expect(subtotal).toMatchObject({
      editable: false,
      calculationRef: 'sales.invoice.calculateSubtotal',
    });
    expect(taxTotal).toMatchObject({
      editable: false,
      calculationRef: 'sales.invoice.calculateTaxTotal',
    });
    expect(grandTotal).toMatchObject({
      editable: false,
      calculationRef: 'sales.invoice.calculateGrandTotal',
    });
    expect(customer).toMatchObject({
      id: 'customer',
      kind: 'lookup',
      lookupProviderRef: 'sales.customer',
      validationRefs: ['sales.invoice.validateCustomer'],
    });
    expect(product?.lookupProviderRef).toBe('inventory.product');
    expect(taxCode?.lookupProviderRef).toBe('sales.taxCode');
    expect(resolved.hooks.persistence).toBe('sales.invoice.save');
  });
});
