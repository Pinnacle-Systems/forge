import {
  LookupCache,
  LookupRegistry,
  applyLookupSelection,
  createTransactionGridEngine,
  mergeTransactionDefinition,
  normalizeGridKeyboardEvent,
  runLookupRequest,
} from '@forge/platform';
import type {
  CascadePlan,
  GridRow,
  GridValue,
  LookupProvider,
  LookupResult,
  LookupSnapshotValue,
  ResolvedTransactionDefinition,
} from '@forge/platform';
import type { ResolvedGridColumn } from '@forge/platform';
import {
  createTransactionShell,
} from '@forge/platform/transaction-shell';
import type {
  SaveRequestResult,
  ValidationIssue,
  ValidationPolicy,
  ValidationSummary,
} from '@forge/platform/transaction-shell';
import type { KeyboardLikeEvent, RowValidationState } from '@forge/platform/transaction-grid';
import { inventoryProductFixtures } from '@forge/inventory/lookups';
import {
  calculateSalesInvoiceFooterTotals,
  calculateSalesInvoiceLine,
  isManualUnitPriceOverride,
  resolveSalesInvoiceUnitPrice,
} from '../calculations';
import type { SalesInvoiceRow } from '../calculations';
import {
  registerSalesInvoiceLookupProviders,
  salesInvoiceLookupProviderRefs,
} from '../lookups';
import { salesInvoiceManifest } from '../transactions';
import {
  validateDiscontinuedProduct,
} from '../validation';
import { discontinuedItemPolicy as defaultDiscontinuedItemPolicy } from '../validation/types';
import type {
  SalesInvoiceScreen,
  SalesInvoiceScreenOptions,
  SalesInvoiceScreenViewModel,
} from './types';

const layout = {
  header: 'fixed',
  body: 'scroll',
  footer: 'fixed',
} as const;

interface HeaderLookupState {
  values: Record<string, GridValue>;
  snapshots: Partial<Record<string, LookupSnapshotValue>>;
}

export function createSalesInvoiceScreen(
  options: SalesInvoiceScreenOptions = {},
): SalesInvoiceScreen {
  const definition = mergeTransactionDefinition(salesInvoiceManifest);
  const registry = new LookupRegistry();
  if (options.registerLookupProviders) {
    options.registerLookupProviders(registry);
  } else {
    registerSalesInvoiceLookupProviders(registry);
  }
  const cache = new LookupCache();
  const gridEngine = createTransactionGridEngine({
    columns: definition.grid.columns,
  });
  const headerState: HeaderLookupState = {
    values: {},
    snapshots: {},
  };
  const listeners = new Set<() => void>();
  let footerValues = {
    subtotal: 0,
    taxTotal: 0,
    grandTotal: 0,
  };
  const policy = options.discontinuedItemPolicy ?? defaultDiscontinuedItemPolicy;
  const shell = createTransactionShell({
    gridEngine,
    manifest: definition,
    getHeaderValues: () => ({ ...headerState.values }),
    validationHooks: {
      header: [
        (context) => validateRequiredHeaderFields(definition.header.fields, context.headerValues),
      ],
      row: [
        ({ row }) => validateRequiredRowFields(definition.grid.columns, row),
      ],
      save: [
        async ({ rows, headerValues }) => {
          return await validateRowsForSave(rows, headerValues, registry, policy);
        },
      ],
    },
    saveHandler: async () => {
      if (options.saveHandler) {
        return await options.saveHandler();
      }

      return { ok: true };
    },
  });

  recomputeDerivedState();

  return {
    getViewModel(): SalesInvoiceScreenViewModel {
      const snapshot = gridEngine.getSnapshot();
      const validationSummary = shell.getValidationSummary();

      return {
        title: definition.title,
        layout,
        definition,
        header: {
          fields: definition.header.fields
            .filter((field) => field.visible)
            .map((field) => mapHeaderField(field, headerState, validationSummary)),
        },
        grid: {
          columns: definition.grid.columns
            .filter((column) => column.visible)
            .map((column) => ({ id: column.id, label: column.label, kind: column.kind })),
          mode: snapshot.mode,
          focus: snapshot.focus,
          rows: snapshot.rows.map((row) => mapRowView(row, definition.grid.columns)),
        },
        footer: {
          fields: definition.footer.fields
            .filter((field) => field.visible)
            .map((field) => ({
              id: field.id,
              label: field.label,
              kind: field.kind,
              value: footerValues[field.id as keyof typeof footerValues] ?? 0,
              visible: field.visible,
            })),
        },
        saveLifecycle: {
          state: shell.getState(),
          validationSummary,
        },
      };
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    async searchHeaderLookup(fieldId: string, query: string): Promise<LookupResult[]> {
      const field = requireHeaderField(definition, fieldId);
      const provider = requireLookupProvider(registry, field.lookupProviderRef);
      const result = await runLookupRequest({
        provider,
        operation: 'search',
        request: {
          query,
          context: {
            fieldId,
            headerValues: headerState.values,
            generation: 0,
          },
        },
        getCurrentGeneration: () => 0,
        cache,
      });

      return result.operation === 'search' ? result.results : [];
    },

    async selectHeaderLookup(fieldId: string, entityId: string): Promise<void> {
      const field = requireHeaderField(definition, fieldId);
      const provider = requireLookupProvider(registry, field.lookupProviderRef);
      const result = await runLookupRequest({
        provider,
        operation: 'resolve',
        request: {
          entityId,
          context: {
            fieldId,
            headerValues: headerState.values,
            generation: 0,
          },
        },
        getCurrentGeneration: () => 0,
        cache,
      });

      if (result.operation !== 'resolve' || !result.result) {
        throw new Error(`Lookup selection failed for header field "${fieldId}" and entity "${entityId}"`);
      }

      applyHeaderLookupSelection(fieldId, field.lookupProviderRef!, result.result, headerState);
      recomputeDerivedState();
    },

    setHeaderValue(fieldId: string, value: GridValue): void {
      headerState.values[fieldId] = value;
      recomputeDerivedState();
    },

    async searchRowLookup(rowId: string, fieldId: string, query: string): Promise<LookupResult[]> {
      const row = requireRow(gridEngine, rowId);
      const column = requireColumn(definition, fieldId);
      const provider = requireLookupProvider(registry, column.lookupProviderRef);
      const result = await runLookupRequest({
        provider,
        operation: 'search',
        request: {
          query,
          context: {
            rowId,
            fieldId,
            rowValues: row.values,
            headerValues: headerState.values,
            generation: row.metadata.generation,
          },
        },
        getCurrentGeneration: () => requireRow(gridEngine, rowId).metadata.generation,
        cache,
      });

      return result.operation === 'search' ? result.results : [];
    },

    async selectRowLookup(rowId: string, fieldId: string, entityId: string): Promise<void> {
      await selectRowLookup(rowId, fieldId, entityId);
    },

    async applyBarcode(rowId: string, barcode: string): Promise<void> {
      const results = await this.searchRowLookup(rowId, 'product', barcode);
      const firstResult = results[0];

      if (!firstResult) {
        throw new Error(`No product found for barcode "${barcode}"`);
      }

      await selectRowLookup(rowId, 'product', firstResult.entityId);
    },

    editCell(rowId: string, fieldId: string, value: GridValue): void {
      gridEngine.moveFocus({ rowId, columnId: fieldId });
      gridEngine.beginEdit();
      gridEngine.updateEditBuffer(value);
      gridEngine.commitEdit();
      processGridEvents();
      recomputeDerivedState();
    },

    moveFocus(rowId: string, fieldId: string): void {
      gridEngine.moveFocus({ rowId, columnId: fieldId });
      emitChange();
    },

    async dispatchGridCommand(command) {
      gridEngine.dispatchKeyboard(command);
      const result = await processGridEvents();
      recomputeDerivedState();

      return result;
    },

    async handleKeyboardEvent(event: KeyboardLikeEvent): Promise<SaveRequestResult | undefined> {
      const command = normalizeGridKeyboardEvent(event);

      if (!command) {
        return undefined;
      }

      gridEngine.dispatchKeyboard(command);
      const result = await processGridEvents();
      recomputeDerivedState();

      return result;
    },

    async requestSave(): Promise<SaveRequestResult> {
      const result = await shell.requestSave();
      emitChange();

      return result;
    },

    async confirmSave(): Promise<SaveRequestResult> {
      const result = await shell.confirmSave();
      emitChange();

      return result;
    },

    cancelSave(): void {
      shell.cancelSave();
      emitChange();
    },
  };

  async function selectRowLookup(rowId: string, fieldId: string, entityId: string): Promise<void> {
      const row = requireRow(gridEngine, rowId);
      const column = requireColumn(definition, fieldId);
      const provider = requireLookupProvider(registry, column.lookupProviderRef);
      const resolveResult = await runLookupRequest({
      provider,
      operation: 'resolve',
      request: {
        entityId,
        context: {
          rowId,
          fieldId,
          rowValues: row.values,
          headerValues: headerState.values,
          generation: row.metadata.generation,
        },
      },
      getCurrentGeneration: () => requireRow(gridEngine, rowId).metadata.generation,
      cache,
      });

    if (resolveResult.operation !== 'resolve') {
      return;
    }

    if (!resolveResult.applied) {
      return;
    }

    if (!resolveResult.result) {
      throw new Error(`Lookup selection failed for row "${rowId}", field "${fieldId}", entity "${entityId}"`);
    }

    const enrichResult = await runLookupRequest({
      provider,
      operation: 'enrich',
      request: {
        entityId,
        snapshotValues: resolveResult.result.values,
        context: {
          rowId,
          fieldId,
          rowValues: row.values,
          headerValues: headerState.values,
          generation: row.metadata.generation,
        },
      },
      getCurrentGeneration: () => requireRow(gridEngine, rowId).metadata.generation,
      cache,
    });

    if (enrichResult.operation !== 'enrich' || !enrichResult.applied) {
      return;
    }

    const resultValues = {
      ...resolveResult.result.values,
      ...enrichResult.values,
    };
    const currentRow = requireRow(gridEngine, rowId);
    const cascadePlan = buildCascadePlan(fieldId, currentRow);

    applyLookupSelection({
      engine: gridEngine,
      selection: {
        providerId: provider.id,
        fieldId,
        rowId,
        result: {
          ...resolveResult.result,
          values: resultValues,
        },
        cascadePlan,
        capturedGeneration: currentRow.metadata.generation,
      },
    });

    processGridEvents();
    recomputeDerivedState();
  }

  async function processGridEvents(): Promise<SaveRequestResult | undefined> {
    let saveResult: SaveRequestResult | undefined;

    for (const event of gridEngine.drainEvents()) {
      if (event.type === 'validationRequested' && event.rowId) {
        applyLocalValidation(event.rowId);
      }

      if (event.type === 'cellCommitted') {
        recomputeDerivedState();
      }

      if (event.type === 'saveRequested') {
        saveResult = await shell.requestSave();
      }
    }

    return saveResult;
  }

  function applyLocalValidation(rowId: string): void {
    const row = requireRow(gridEngine, rowId);
    gridEngine.applyValidation(rowId, validateRow(definition.grid.columns, row));
  }

  function recomputeDerivedState(): void {
    const snapshot = gridEngine.getSnapshot();

    for (const row of snapshot.rows) {
      if (row.metadata.isPhantom || row.state === 'deleted') {
        continue;
      }

      const nextValues: Record<string, GridValue> = {};
      const rowValues = row.values as Record<string, GridValue>;
      const manualOverride = isManualUnitPriceOverride(toSalesInvoiceRow(row));
      const suggestedUnitPrice = manualOverride
        ? undefined
        : resolveSalesInvoiceUnitPrice(headerState.values, rowValues);

      if (suggestedUnitPrice !== undefined && !Object.is(row.values.unitPrice, suggestedUnitPrice)) {
        nextValues.unitPrice = suggestedUnitPrice;
      }

      const effectiveValues = {
        ...row.values,
        ...nextValues,
      };
      const line = calculateSalesInvoiceLine(effectiveValues);

      if (!Object.is(row.values.lineSubtotal, line.lineSubtotal)) {
        nextValues.lineSubtotal = line.lineSubtotal;
      }

      if (!Object.is(row.values.lineTax, line.lineTax)) {
        nextValues.lineTax = line.lineTax;
      }

      if (!Object.is(row.values.lineTotal, line.lineTotal)) {
        nextValues.lineTotal = line.lineTotal;
      }

      if (Object.keys(nextValues).length > 0) {
        gridEngine.applyExternalRowUpdate(row.id, {
          values: nextValues,
          reason: 'external-update',
          generation: row.metadata.generation,
        });
      }
    }

    const recalculatedSnapshot = gridEngine.getSnapshot();
    footerValues = calculateSalesInvoiceFooterTotals(
      recalculatedSnapshot.rows.map(toSalesInvoiceRow),
    );
    emitChange();
  }

  function emitChange(): void {
    for (const listener of listeners) {
      listener();
    }
  }
}

function validateRequiredHeaderFields(
  fields: ResolvedTransactionDefinition['header']['fields'],
  values: Record<string, GridValue>,
): ValidationIssue[] {
  return fields
    .filter((field) => field.required && isEmpty(values[field.id]))
    .map((field) => ({
      id: `header-required-${field.id}`,
      fieldId: field.id,
      severity: 'error',
      message: `${field.label} is required`,
    }));
}

function validateRequiredRowFields(
  columns: ResolvedGridColumn[],
  row: GridRow,
): ValidationIssue[] {
  if (row.metadata.isPhantom || row.state === 'deleted') {
    return [];
  }

  return columns
    .filter((column) => column.required && isEmpty(row.values[column.id]))
    .map((column) => ({
      id: `row-required-${row.id}-${column.id}`,
      fieldId: column.id,
      rowId: row.id,
      severity: 'error',
      message: `${column.label} is required`,
    }));
}

async function validateRowsForSave(
  rows: GridRow[],
  headerValues: Record<string, GridValue>,
  registry: LookupRegistry,
  policy: ValidationPolicy,
): Promise<ValidationIssue[]> {
  const provider = requireLookupProvider(registry, salesInvoiceLookupProviderRefs.product.providerId);
  const issues: ValidationIssue[] = [];

  for (const row of rows) {
    if (row.metadata.isPhantom || row.state === 'deleted' || typeof row.values.product !== 'string') {
      continue;
    }

    const validation = await provider.validate({
      entityId: row.values.product,
      snapshotValues: row.metadata.lookupSnapshots.product?.values ?? {},
      context: {
        fieldId: 'product',
        rowId: row.id,
        rowValues: row.values,
        headerValues,
      },
    });

    const discontinuedIssue = validateDiscontinuedProduct(validation, policy, {
      id: `discontinued-${row.id}`,
      fieldId: 'product',
      rowId: row.id,
    });

    if (discontinuedIssue) {
      issues.push(discontinuedIssue);
    }

    for (const issue of validation.issues) {
      if (issue.code === 'PRODUCT_DISCONTINUED') {
        continue;
      }

      issues.push({
        id: `${issue.code ?? 'lookup'}-${row.id}`,
        fieldId: 'product',
        rowId: row.id,
        severity: issue.severity === 'warning' ? 'warning' : 'error',
        message: issue.message,
      });
    }
  }

  return issues;
}

function mapHeaderField(
  field: ResolvedTransactionDefinition['header']['fields'][number],
  headerState: HeaderLookupState,
  validationSummary: ValidationSummary,
) {
  return {
    id: field.id,
    label: field.label,
    kind: field.kind,
    value: headerState.values[field.id],
    visible: field.visible,
    editable: field.editable,
    required: field.required,
    validationMessages: validationSummary.issues
      .filter((issue) => issue.fieldId === field.id && !issue.rowId)
      .map((issue) => issue.message),
    lookupSnapshot: headerState.snapshots[field.id],
  };
}

function mapRowView(row: GridRow, columns: ResolvedGridColumn[]) {
  return {
    id: row.id,
    isPhantom: row.metadata.isPhantom,
    state: row.state,
    lookupSnapshots: row.metadata.lookupSnapshots,
    cells: columns
      .filter((column) => column.visible)
      .map((column) => ({
        id: column.id,
        label: column.label,
        kind: column.kind,
        value: row.values[column.id],
        staleReason: row.metadata.stale[column.id]?.reason,
        validationMessages: [
          ...(row.metadata.validation.cells[column.id]?.map((issue) => issue.message) ?? []),
          ...row.metadata.validation.row.map((issue) => issue.message),
        ],
      })),
  };
}

function validateRow(columns: ResolvedGridColumn[], row: GridRow): RowValidationState {
  const cells: RowValidationState['cells'] = {};

  if (!row.metadata.isPhantom && row.state !== 'deleted') {
    for (const column of columns) {
      if (column.required && isEmpty(row.values[column.id])) {
        cells[column.id] = [{
          severity: 'error',
          message: `${column.label} is required`,
        }];
      }
    }
  }

  return {
    cells,
    row: [],
  };
}

function applyHeaderLookupSelection(
  fieldId: string,
  providerRef: string,
  result: LookupResult,
  state: HeaderLookupState,
): void {
  state.values = {
    ...state.values,
    ...result.values,
    [fieldId]: result.entityId,
  };
  state.snapshots[fieldId] = {
    providerRef,
    entityId: result.entityId,
    label: result.label,
    values: structuredClone(result.values),
    capturedAtRevision: 0,
  };
}

function buildCascadePlan(fieldId: string, row: GridRow): CascadePlan {
  if (fieldId !== 'product') {
    return {
      sourceFieldId: fieldId,
      rules: [],
    };
  }

  return {
    sourceFieldId: fieldId,
    rules: [
      {
        targetFieldId: 'unitPrice',
        mode: isManualUnitPriceOverride(toSalesInvoiceRow(row)) ? 'preserve' as const : 'reset' as const,
      },
      {
        targetFieldId: 'taxCode',
        mode: 'reset' as const,
      },
    ],
  };
}

function toSalesInvoiceRow(row: GridRow): SalesInvoiceRow {
  return {
    rowId: row.id,
    values: row.values,
    isDeleted: row.state === 'deleted',
    isPhantom: row.metadata.isPhantom,
    metadata: row.metadata as unknown as SalesInvoiceRow['metadata'],
  };
}

function requireHeaderField(
  definition: ResolvedTransactionDefinition,
  fieldId: string,
): ResolvedTransactionDefinition['header']['fields'][number] {
  type HeaderField = ResolvedTransactionDefinition['header']['fields'][number];
  const field = definition.header.fields.find((candidate) => candidate.id === fieldId);

  if (!field || !field.lookupProviderRef) {
    throw new Error(`Header lookup field not found: ${fieldId}`);
  }

  return field as HeaderField;
}

function requireColumn(definition: ResolvedTransactionDefinition, fieldId: string): ResolvedGridColumn {
  const column = definition.grid.columns.find((candidate) => candidate.id === fieldId);

  if (!column || !column.lookupProviderRef) {
    throw new Error(`Grid lookup column not found: ${fieldId}`);
  }

  return column;
}

function requireLookupProvider(registry: LookupRegistry, providerId: string | undefined): LookupProvider {
  if (!providerId) {
    throw new Error('Lookup provider reference is required');
  }

  const { provider, diagnostics } = registry.require(providerId);

  if (!provider) {
    throw new Error(diagnostics[0]?.message ?? `Lookup provider not found: ${providerId}`);
  }

  return provider;
}

function requireRow(engine: ReturnType<typeof createTransactionGridEngine>, rowId: string): GridRow {
  const row = engine.getSnapshot().rows.find((candidate) => candidate.id === rowId);

  if (!row) {
    throw new Error(`Grid row not found: ${rowId}`);
  }

  return row;
}

function isEmpty(value: GridValue): boolean {
  return value === undefined || value === null || value === '';
}
