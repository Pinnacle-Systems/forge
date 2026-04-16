import { describe, expect, it, vi } from 'vitest';
import type { LookupProvider, LookupRegistry, LookupResult } from '@forge/platform';
import { createSalesInvoiceScreen } from '../salesInvoiceScreen';
import {
  createSalesCustomerLookupProvider,
  createSalesTaxCodeLookupProvider,
} from '../../lookups';
import {
  createInventoryProductLookupProvider,
  inventoryProductFixtures,
} from '@forge/inventory/lookups';

describe('sales invoice acceptance harness', () => {
  it('covers fast keyboard-first entry while preserving exactly one phantom row', async () => {
    const screen = createSalesInvoiceScreen();
    const firstRowId = screen.getViewModel().grid.rows[0].id;

    await screen.selectHeaderLookup('customer', 'customer-acme');
    screen.setHeaderValue('invoiceDate', '2026-04-10');
    await screen.selectRowLookup(firstRowId, 'product', 'product-widget');
    screen.editCell(firstRowId, 'quantity', 2);
    await screen.dispatchGridCommand({ type: 'enter' });

    const view = screen.getViewModel();
    expect(phantomRows(view)).toHaveLength(1);
    expect(view.grid.rows.some((row) => !row.isPhantom && cellValue(row, 'lineTotal') === 22)).toBe(true);
  });

  it('covers barcode scan to row fill with lookup snapshots', async () => {
    const screen = createSalesInvoiceScreen();
    const rowId = screen.getViewModel().grid.rows[0].id;

    await screen.applyBarcode(rowId, '012345678905');

    const row = requireRow(screen, rowId);
    expect(cellValue(row, 'product')).toBe('product-widget');
    expect(row.lookupSnapshots.product?.entityId).toBe('product-widget');
    expect(phantomRows(screen.getViewModel())).toHaveLength(1);
  });

  it('covers manual price override preservation and stale marking on product change', async () => {
    const screen = createSalesInvoiceScreen();
    const rowId = screen.getViewModel().grid.rows[0].id;

    await screen.selectRowLookup(rowId, 'product', 'product-widget');
    screen.editCell(rowId, 'quantity', 1);
    screen.editCell(rowId, 'unitPrice', 12);
    await screen.selectRowLookup(rowId, 'product', 'product-seasonal');

    const row = requireRow(screen, rowId);
    expect(cellValue(row, 'unitPrice')).toBe(12);
    expect(cellStaleReason(row, 'unitPrice')).toBe('preserved-manual-override');
    expect(row.lookupSnapshots.product?.entityId).toBe('product-seasonal');
  });

  it('covers tax cascade updates totals for the vertical slice', async () => {
    const screen = createSalesInvoiceScreen();
    const rowId = screen.getViewModel().grid.rows[0].id;

    await screen.selectHeaderLookup('customer', 'customer-acme');
    screen.setHeaderValue('invoiceDate', '2026-07-01');
    await screen.selectRowLookup(rowId, 'product', 'product-seasonal');
    screen.editCell(rowId, 'quantity', 2);

    const footer = footerValues(screen);
    expect(requireRow(screen, rowId).cells.find((cell) => cell.id === 'taxCode')?.value).toBe('TAX-REDUCED');
    expect(footer).toMatchObject({
      subtotal: 80,
      taxTotal: 4,
      grandTotal: 84,
    });
  });

  it('blocks save for discontinued items under block policy and keeps one phantom row', async () => {
    const saveHandler = vi.fn().mockResolvedValue({ ok: true });
    const screen = createSalesInvoiceScreen({
      discontinuedItemPolicy: 'block',
      saveHandler,
    });
    const rowId = screen.getViewModel().grid.rows[0].id;

    await screen.selectHeaderLookup('customer', 'customer-acme');
    screen.setHeaderValue('invoiceDate', '2026-04-10');
    await screen.selectRowLookup(rowId, 'product', 'product-discontinued');
    screen.editCell(rowId, 'quantity', 1);

    const result = await screen.requestSave();

    expect(result).toEqual({ status: 'blocked' });
    expect(screen.getViewModel().saveLifecycle.state).toBe('idle');
    expect(saveHandler).not.toHaveBeenCalled();
    expect(phantomRows(screen.getViewModel())).toHaveLength(1);
  });

  it('enters explicit warning-confirm flow for discontinued items under warn policy', async () => {
    const saveHandler = vi.fn().mockResolvedValue({ ok: true });
    const screen = createSalesInvoiceScreen({
      discontinuedItemPolicy: 'warn',
      saveHandler,
    });
    const rowId = screen.getViewModel().grid.rows[0].id;

    await screen.selectHeaderLookup('customer', 'customer-acme');
    screen.setHeaderValue('invoiceDate', '2026-04-10');
    await screen.selectRowLookup(rowId, 'product', 'product-discontinued');
    screen.editCell(rowId, 'quantity', 1);

    const result = await screen.requestSave();
    expect(result).toEqual({ status: 'confirming' });
    expect(screen.getViewModel().saveLifecycle.validationSummary.hasWarnings).toBe(true);

    const confirmed = await screen.confirmSave();
    expect(confirmed).toEqual({ status: 'saved' });
    expect(saveHandler).toHaveBeenCalledTimes(1);
  });

  it('revalidates against changed backend/provider state at save time', async () => {
    let discontinuedAtSave = false;
    const screen = createSalesInvoiceScreen({
      registerLookupProviders: (registry) => {
        registry.register(createSalesCustomerLookupProvider());
        registry.register(createSalesTaxCodeLookupProvider());
        registry.register(createDynamicProductProvider(() => discontinuedAtSave));
      },
    });
    const rowId = screen.getViewModel().grid.rows[0].id;

    await screen.selectHeaderLookup('customer', 'customer-acme');
    screen.setHeaderValue('invoiceDate', '2026-04-10');
    await screen.selectRowLookup(rowId, 'product', 'product-widget');
    screen.editCell(rowId, 'quantity', 1);

    discontinuedAtSave = true;

    const result = await screen.requestSave();
    expect(result).toEqual({ status: 'blocked' });
    expect(screen.getViewModel().saveLifecycle.validationSummary.issues.some((issue) => issue.message.includes('discontinued'))).toBe(true);
  });

  it('ignores delayed stale lookup responses and preserves newer row state', async () => {
    const screen = createSalesInvoiceScreen({
      registerLookupProviders: (registry) => {
        registry.register(createSalesCustomerLookupProvider());
        registry.register(createSalesTaxCodeLookupProvider());
        registry.register(createDelayedProductProvider(30));
      },
    });
    const rowId = screen.getViewModel().grid.rows[0].id;

    const pendingSelection = screen.selectRowLookup(rowId, 'product', 'product-widget');
    screen.editCell(rowId, 'quantity', 2);
    await pendingSelection;

    const row = requireRow(screen, rowId);
    expect(cellValue(row, 'product')).toBeUndefined();
    expect(cellValue(row, 'quantity')).toBe(2);
    expect(phantomRows(screen.getViewModel())).toHaveLength(1);
  });

  it('proves validation does not block navigation movement', async () => {
    const screen = createSalesInvoiceScreen();
    const firstRowId = screen.getViewModel().grid.rows[0].id;

    await screen.selectRowLookup(firstRowId, 'product', 'product-widget');
    await screen.handleKeyboardEvent({ key: 'ArrowDown' });

    const view = screen.getViewModel();
    const firstRow = requireRow(screen, firstRowId);
    expect(view.grid.focus.rowId).not.toBe(firstRowId);
    expect(firstRow.cells.find((cell) => cell.id === 'quantity')?.validationMessages).toContain('Quantity is required');
  });
});

function requireRow(
  screen: ReturnType<typeof createSalesInvoiceScreen>,
  rowId: string,
) {
  const row = screen.getViewModel().grid.rows.find((candidate) => candidate.id === rowId);

  if (!row) {
    throw new Error(`Row not found: ${rowId}`);
  }

  return row;
}

function phantomRows(view: ReturnType<ReturnType<typeof createSalesInvoiceScreen>['getViewModel']>) {
  return view.grid.rows.filter((row) => row.isPhantom);
}

function cellValue(
  row: { cells: Array<{ id: string; value: unknown }> },
  fieldId: string,
) {
  return row.cells.find((cell) => cell.id === fieldId)?.value;
}

function cellStaleReason(
  row: { cells: Array<{ id: string; staleReason?: string }> },
  fieldId: string,
) {
  return row.cells.find((cell) => cell.id === fieldId)?.staleReason;
}

function footerValues(screen: ReturnType<typeof createSalesInvoiceScreen>) {
  return Object.fromEntries(
    screen.getViewModel().footer.fields.map((field) => [field.id, field.value]),
  );
}

function createDynamicProductProvider(isDiscontinuedAtSave: () => boolean): LookupProvider {
  return {
    ...createInventoryProductLookupProvider(),
    async validate(request) {
      if (request.entityId === 'product-widget' && isDiscontinuedAtSave()) {
        return {
          valid: false,
          issues: [{
            severity: 'error',
            code: 'PRODUCT_DISCONTINUED',
            message: 'Product is discontinued: WID-001',
          }],
        };
      }

      return await createInventoryProductLookupProvider().validate(request);
    },
  };
}

function createDelayedProductProvider(delayMs: number): LookupProvider {
  const provider = createInventoryProductLookupProvider({
    products: inventoryProductFixtures,
  });

  return {
    ...provider,
    async resolve(request): Promise<LookupResult | undefined> {
      await delay(delayMs);
      return await provider.resolve(request);
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
