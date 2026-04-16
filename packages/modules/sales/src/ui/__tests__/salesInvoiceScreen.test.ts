import { describe, expect, it, vi } from 'vitest';
import { createSalesInvoiceScreen } from '../salesInvoiceScreen';

describe('createSalesInvoiceScreen', () => {
  it('renders the sales invoice from the resolved definition with fixed header/footer layout', () => {
    const screen = createSalesInvoiceScreen();
    const view = screen.getViewModel();

    expect(view.title).toBe('Sales Invoice');
    expect(view.layout).toEqual({
      header: 'fixed',
      body: 'scroll',
      footer: 'fixed',
    });
    expect(view.header.fields.map((field) => field.id)).toEqual([
      'customer',
      'invoiceDate',
      'reference',
    ]);
    expect(view.grid.columns.map((column) => column.id)).toEqual([
      'product',
      'quantity',
      'unitPrice',
      'taxCode',
      'lineTotal',
    ]);
    expect(view.footer.fields.map((field) => field.id)).toEqual([
      'subtotal',
      'taxTotal',
      'grandTotal',
    ]);
  });

  it('fills a row through the barcode lookup flow and recalculates footer totals', async () => {
    const screen = createSalesInvoiceScreen();
    const rowId = screen.getViewModel().grid.rows[0].id;

    await screen.applyBarcode(rowId, '012345678905');
    screen.editCell(rowId, 'quantity', 2);

    const row = screen.getViewModel().grid.rows.find((candidate) => candidate.id === rowId);
    const footer = Object.fromEntries(
      screen.getViewModel().footer.fields.map((field) => [field.id, field.value]),
    );

    expect(cellValue(row, 'product')).toBe('product-widget');
    expect(cellValue(row, 'unitPrice')).toBe(10);
    expect(cellValue(row, 'taxCode')).toBe('TAX-STD');
    expect(cellValue(row, 'lineTotal')).toBe(22);
    expect(footer).toMatchObject({
      subtotal: 20,
      taxTotal: 2,
      grandTotal: 22,
    });
  });

  it('preserves manual unit price overrides when product changes and marks them stale', async () => {
    const screen = createSalesInvoiceScreen();
    const rowId = screen.getViewModel().grid.rows[0].id;

    await screen.selectRowLookup(rowId, 'product', 'product-widget');
    screen.editCell(rowId, 'quantity', 1);
    screen.editCell(rowId, 'unitPrice', 12);
    await screen.selectRowLookup(rowId, 'product', 'product-seasonal');

    const row = screen.getViewModel().grid.rows.find((candidate) => candidate.id === rowId);
    const unitPriceCell = row?.cells.find((cell) => cell.id === 'unitPrice');

    expect(cellValue(row, 'product')).toBe('product-seasonal');
    expect(cellValue(row, 'unitPrice')).toBe(12);
    expect(cellValue(row, 'taxCode')).toBe('TAX-REDUCED');
    expect(cellValue(row, 'lineTotal')).toBe(12.6);
    expect(unitPriceCell?.staleReason).toBe('preserved-manual-override');
  });

  it('uses customer pricing for non-overridden rows after customer selection', async () => {
    const screen = createSalesInvoiceScreen();
    const rowId = screen.getViewModel().grid.rows[0].id;

    await screen.selectHeaderLookup('customer', 'customer-beta');
    screen.setHeaderValue('invoiceDate', '2026-07-01');
    await screen.selectRowLookup(rowId, 'product', 'product-widget');
    screen.editCell(rowId, 'quantity', 100);

    const row = screen.getViewModel().grid.rows.find((candidate) => candidate.id === rowId);

    expect(cellValue(row, 'unitPrice')).toBe(8.5);
    expect(cellValue(row, 'lineTotal')).toBe(935);
  });

  it('routes Ctrl+S through the shell warning-confirm flow for discontinued items', async () => {
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

    const saveResult = await screen.handleKeyboardEvent({
      key: 's',
      ctrlKey: true,
    });

    expect(saveResult).toEqual({ status: 'confirming' });
    expect(screen.getViewModel().saveLifecycle.state).toBe('confirming');
    expect(screen.getViewModel().saveLifecycle.validationSummary.hasWarnings).toBe(true);

    const confirmed = await screen.confirmSave();

    expect(confirmed).toEqual({ status: 'saved' });
    expect(saveHandler).toHaveBeenCalledTimes(1);
  });
});

function cellValue(
  row: { cells: Array<{ id: string; value: unknown }> } | undefined,
  fieldId: string,
) {
  return row?.cells.find((cell) => cell.id === fieldId)?.value;
}
