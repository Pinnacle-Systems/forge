import type {
  GridRowMetadataPatch,
  GridValue,
  TransactionElementId,
  TransactionGridEngine,
} from '../transaction-grid';

export type LookupProviderId = string;
export type CascadeMode = 'preserve' | 'reset' | 'prompt';
export type LookupCacheOperation = 'search' | 'resolve' | 'enrich';
export type LookupRequestOperation = 'search' | 'resolve' | 'enrich';

export interface LookupOperationContext {
  rowId?: string;
  fieldId: TransactionElementId;
  rowValues?: Record<TransactionElementId, GridValue>;
  headerValues?: Record<TransactionElementId, GridValue>;
  generation: number;
  signal?: AbortSignal;
}

export interface LookupSearchRequest {
  query: string;
  context: LookupOperationContext;
}

export interface LookupResolveRequest {
  entityId: string;
  context: LookupOperationContext;
}

export interface LookupEnrichRequest {
  entityId: string;
  snapshotValues: Record<TransactionElementId, GridValue>;
  context: LookupOperationContext;
}

export interface LookupValidationRequest {
  entityId: string;
  snapshotValues: Record<TransactionElementId, GridValue>;
  context: Omit<LookupOperationContext, 'generation'>;
}

export interface LookupResult {
  entityId: string;
  label?: string;
  values: Record<TransactionElementId, GridValue>;
  metadata?: Record<string, unknown>;
}

export interface LookupValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  code?: string;
}

export interface LookupValidationResult {
  valid: boolean;
  issues: LookupValidationIssue[];
}

export interface LookupCacheKey {
  providerId: LookupProviderId;
  operation: LookupCacheOperation;
  fieldId: TransactionElementId;
  query?: string;
  entityId?: string;
  context?: Record<string, GridValue>;
}

export interface LookupCacheOptions {
  ttlMs?: number;
  now?: () => number;
}

export interface LookupCacheStore {
  get<T>(key: LookupCacheKey): T | undefined;
  set<T>(key: LookupCacheKey, value: T): void;
}

export interface LookupProvider {
  id: LookupProviderId;
  search(request: LookupSearchRequest): Promise<LookupResult[]>;
  resolve(request: LookupResolveRequest): Promise<LookupResult | undefined>;
  enrich?(request: LookupEnrichRequest): Promise<Record<TransactionElementId, GridValue>>;
  validate(request: LookupValidationRequest): Promise<LookupValidationResult>;
}

export interface LookupDiagnostic {
  severity: 'warning' | 'error';
  code:
    | 'PROVIDER_ALREADY_REGISTERED'
    | 'PROVIDER_NOT_FOUND'
    | 'ROW_NOT_FOUND'
    | 'STALE_LOOKUP_RESPONSE_IGNORED';
  providerId?: LookupProviderId;
  rowId?: string;
  message: string;
}

export interface CascadeFieldRule {
  targetFieldId: TransactionElementId;
  mode?: CascadeMode;
}

export interface CascadePlan {
  sourceFieldId: TransactionElementId;
  rules: CascadeFieldRule[];
}

export interface CascadeDecision {
  targetFieldId: TransactionElementId;
  mode: CascadeMode;
  currentValue: GridValue;
  incomingValue: GridValue;
  action: 'write' | 'clear' | 'preserve' | 'prompt';
  markStale: boolean;
}

export interface CascadeResult {
  valuesToWrite: Record<TransactionElementId, GridValue>;
  valuesToClear: TransactionElementId[];
  preservedStaleFields: TransactionElementId[];
  prompts: CascadeDecision[];
}

export interface LookupRuntimeSelection {
  providerId: LookupProviderId;
  fieldId: TransactionElementId;
  rowId: string;
  result: LookupResult;
  cascadePlan?: CascadePlan;
  capturedGeneration?: number;
}

export interface LookupSelectionResult {
  applied: boolean;
  diagnostics: LookupDiagnostic[];
  cascade: CascadeResult;
}

export interface ApplyLookupSelectionOptions {
  engine: TransactionGridEngine;
  selection: LookupRuntimeSelection;
}

export interface RunLookupRequestOptions {
  provider: LookupProvider;
  operation: LookupRequestOperation;
  request: LookupSearchRequest | LookupResolveRequest | LookupEnrichRequest;
  getCurrentGeneration: () => number;
  cache?: LookupCacheStore;
}

export type RunLookupRequestResult =
  | {
    operation: 'search';
    applied: boolean;
    results: LookupResult[];
    diagnostics: LookupDiagnostic[];
  }
  | {
    operation: 'resolve';
    applied: boolean;
    result?: LookupResult;
    diagnostics: LookupDiagnostic[];
  }
  | {
    operation: 'enrich';
    applied: boolean;
    values: Record<TransactionElementId, GridValue>;
    diagnostics: LookupDiagnostic[];
  };

export type LookupMetadataPatch = GridRowMetadataPatch;
