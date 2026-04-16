import type {
  GridValue,
  LookupRegistry,
  LookupResult,
  LookupSnapshotValue,
  ResolvedTransactionDefinition,
} from '@forge/platform';
import type {
  SaveLifecycleState,
  SaveRequestResult,
  ValidationSummary,
} from '@forge/platform/transaction-shell';
import type {
  GridEditMode,
  GridKeyboardCommand,
  KeyboardLikeEvent,
} from '@forge/platform/transaction-grid';

export interface SalesInvoiceFieldView {
  id: string;
  label: string;
  kind: string;
  value: GridValue;
  visible: boolean;
  editable: boolean;
  required: boolean;
  validationMessages: string[];
  lookupSnapshot?: LookupSnapshotValue;
}

export interface SalesInvoiceCellView {
  id: string;
  label: string;
  kind: string;
  value: GridValue;
  staleReason?: string;
  validationMessages: string[];
}

export interface SalesInvoiceRowView {
  id: string;
  isPhantom: boolean;
  state?: string;
  lookupSnapshots: Partial<Record<string, LookupSnapshotValue>>;
  cells: SalesInvoiceCellView[];
}

export interface SalesInvoiceFooterFieldView {
  id: string;
  label: string;
  kind: string;
  value: GridValue;
  visible: boolean;
}

export interface SalesInvoiceScreenViewModel {
  title: string;
  layout: {
    header: 'fixed';
    body: 'scroll';
    footer: 'fixed';
  };
  definition: ResolvedTransactionDefinition;
  header: {
    fields: SalesInvoiceFieldView[];
  };
  grid: {
    columns: Array<{ id: string; label: string; kind: string }>;
    mode: GridEditMode;
    focus: { rowId: string; columnId: string };
    rows: SalesInvoiceRowView[];
  };
  footer: {
    fields: SalesInvoiceFooterFieldView[];
  };
  saveLifecycle: {
    state: SaveLifecycleState;
    validationSummary: ValidationSummary;
  };
}

export interface SalesInvoiceScreenOptions {
  saveHandler?: () => Promise<{ ok: boolean; error?: string }>;
  discontinuedItemPolicy?: 'block' | 'warn' | 'ignore';
  registerLookupProviders?: (registry: LookupRegistry) => void;
}

export interface SalesInvoiceScreen {
  getViewModel(): SalesInvoiceScreenViewModel;
  subscribe(listener: () => void): () => void;
  searchHeaderLookup(fieldId: string, query: string): Promise<LookupResult[]>;
  selectHeaderLookup(fieldId: string, entityId: string): Promise<void>;
  setHeaderValue(fieldId: string, value: GridValue): void;
  searchRowLookup(rowId: string, fieldId: string, query: string): Promise<LookupResult[]>;
  selectRowLookup(rowId: string, fieldId: string, entityId: string): Promise<void>;
  applyBarcode(rowId: string, barcode: string): Promise<void>;
  editCell(rowId: string, fieldId: string, value: GridValue): void;
  moveFocus(rowId: string, fieldId: string): void;
  dispatchGridCommand(command: GridKeyboardCommand): Promise<SaveRequestResult | undefined>;
  handleKeyboardEvent(event: KeyboardLikeEvent): Promise<SaveRequestResult | undefined>;
  requestSave(): Promise<SaveRequestResult>;
  confirmSave(): Promise<SaveRequestResult>;
  cancelSave(): void;
}
