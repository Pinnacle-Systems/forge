import type { 
  ResolvedTransactionDefinition
} from '../runtime-definition/types';

import type {
  GridRow,
  TransactionGridEngine
} from '../transaction-grid/types';

export interface ValidationContext {
  manifest: ResolvedTransactionDefinition;
  headerValues: Record<string, any>;
}

export interface RowValidationContext extends ValidationContext {
  row: GridRow;
}

export interface SaveValidationContext extends ValidationContext {
  rows: GridRow[];
}

export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationPolicy = 'block' | 'warn' | 'ignore'; // Module-level policy configuration

export interface ValidationIssue {
  id: string;
  fieldId?: string; // Optional field reference
  rowId?: string;   // Optional row reference
  severity: ValidationSeverity; // 'error' implies block
  message: string;
}

export interface ValidationSummary {
  isValid: boolean;
  hasWarnings: boolean;
  issues: ValidationIssue[];
}

export type SaveLifecycleState = 
  | 'idle' 
  | 'validating' 
  | 'confirming'
  | 'saving' 
  | 'success' 
  | 'error';

export interface SaveLifecycle {
  state: SaveLifecycleState;
  warnings: ValidationIssue[];
  confirmSave(): Promise<SaveRequestResult>; // transitions confirming -> saving when only warnings present
  cancelSave(): void;  // transitions confirming -> idle
}

export type SaveRequestResult = { status: 'blocked' | 'confirming' | 'saved' | 'failed' };

export interface TransactionShellOptions {
  gridEngine: TransactionGridEngine; // From Story 003
  manifest: ResolvedTransactionDefinition; // From Story 001
  getHeaderValues?: () => Record<string, any>;
  validationHooks: {
    header?: Array<(context: ValidationContext) => ValidationIssue[]>;
    row?: Array<(context: RowValidationContext) => ValidationIssue[]>;
    footer?: Array<(context: SaveValidationContext) => ValidationIssue[]>;
    crossField?: Array<(context: SaveValidationContext) => ValidationIssue[]>;
    save?: Array<(context: SaveValidationContext) => Promise<ValidationIssue[]>>;
  };
  saveHandler: (context: SaveValidationContext) => Promise<{ ok: boolean; error?: string }>; // The actual persistence call
}

export interface TransactionShell {
  getState(): SaveLifecycleState;
  getValidationSummary(): ValidationSummary;
  requestSave(): Promise<SaveRequestResult>;
  confirmSave(): Promise<SaveRequestResult>; // Valid only in 'confirming'
  cancelSave(): void;         // Clears warnings, returns to 'idle'
  subscribe(callback: (state: SaveLifecycleState) => void): () => void;
}
