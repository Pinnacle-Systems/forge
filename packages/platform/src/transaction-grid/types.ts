import type {
  ResolvedGridColumn,
  TransactionElementId,
} from '../runtime-definition/types';

export type {
  ResolvedGridColumn,
  TransactionElementId,
} from '../runtime-definition/types';

export type GridValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | Record<string, unknown>;

export type GridRowState = 'new' | 'dirty' | 'deleted';
export type GridEditMode = 'navigation' | 'edit';

export interface CellPosition {
  rowId: string;
  columnId: TransactionElementId;
}

export interface LookupSnapshotValue {
  providerRef: string;
  entityId: string;
  label?: string;
  values: Record<string, GridValue>;
  capturedAtRevision: number;
}

export interface AutofillAnnotation {
  sourceColumnId: TransactionElementId;
  mode: 'lookup' | 'cascade' | 'external';
  preservedManualOverride?: boolean;
}

export interface StaleAnnotation {
  sourceColumnId?: TransactionElementId;
  reason: 'preserved-manual-override' | 'stale-async-response' | 'external-update-conflict';
}

export interface CellValidationAnnotation {
  severity: 'error' | 'warning';
  message: string;
  validationRef?: string;
}

export interface RowValidationState {
  cells: Partial<Record<TransactionElementId, CellValidationAnnotation[]>>;
  row: CellValidationAnnotation[];
}

export interface EditBuffer {
  columnId: TransactionElementId;
  value: GridValue;
  originalValue: GridValue;
  capturedRevision: number;
}

export interface QueuedExternalUpdate {
  values: Record<TransactionElementId, GridValue>;
  reason: 'external-update' | 'lookup-enrich';
  generation: number;
  metadata?: GridRowMetadataPatch;
}

export interface GridRowMetadataPatch {
  lookupSnapshots?: Partial<Record<TransactionElementId, LookupSnapshotValue | undefined>>;
  autofill?: Partial<Record<TransactionElementId, AutofillAnnotation | undefined>>;
  stale?: Partial<Record<TransactionElementId, StaleAnnotation | undefined>>;
}

export interface GridRowMetadata {
  isPhantom: boolean;
  revision: number;
  generation: number;
  lookupSnapshots: Partial<Record<TransactionElementId, LookupSnapshotValue>>;
  autofill: Partial<Record<TransactionElementId, AutofillAnnotation>>;
  stale: Partial<Record<TransactionElementId, StaleAnnotation>>;
  validation: RowValidationState;
  editBuffer?: EditBuffer;
  queuedExternalUpdates: QueuedExternalUpdate[];
}

export interface GridRow {
  id: string;
  state?: GridRowState;
  values: Record<TransactionElementId, GridValue>;
  metadata: GridRowMetadata;
}

export interface GridSnapshot {
  columns: ResolvedGridColumn[];
  rows: GridRow[];
  mode: GridEditMode;
  focus: CellPosition;
}

export type GridKeyboardCommand =
  | { type: 'enter' }
  | { type: 'tab'; shiftKey?: boolean }
  | { type: 'arrow'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'f2' }
  | { type: 'escape' }
  | { type: 'delete' }
  | { type: 'backspace' }
  | { type: 'save' };

export type TransactionGridEngineEvent =
  | { type: 'cellCommitted'; rowId: string; columnId: TransactionElementId; value: GridValue }
  | { type: 'rowExited'; rowId: string }
  | { type: 'validationRequested'; scope: 'cell' | 'row' | 'grid'; rowId?: string; columnId?: TransactionElementId }
  | { type: 'saveRequested' }
  | { type: 'externalUpdateQueued'; rowId: string }
  | { type: 'staleExternalUpdateIgnored'; rowId: string };

export interface TransactionGridEngineOptions {
  columns: ResolvedGridColumn[];
  rows?: Array<Record<TransactionElementId, GridValue>>;
  createRowId?: () => string;
}

export interface TransactionGridEngine {
  getSnapshot(): GridSnapshot;
  drainEvents(): TransactionGridEngineEvent[];
  dispatchKeyboard(command: GridKeyboardCommand): void;
  beginEdit(position?: CellPosition): void;
  updateEditBuffer(value: GridValue): void;
  commitEdit(): void;
  cancelEdit(): void;
  moveFocus(position: CellPosition): void;
  deleteRow(rowId: string): void;
  applyExternalRowUpdate(rowId: string, update: QueuedExternalUpdate): void;
  applyValidation(rowId: string, validation: RowValidationState): void;
}
