import type {
  GridValue,
  TransactionElementId,
} from '../transaction-grid';
import type {
  LookupCacheKey,
  LookupDiagnostic,
  LookupEnrichRequest,
  LookupResolveRequest,
  LookupResult,
  LookupSearchRequest,
  RunLookupRequestOptions,
  RunLookupRequestResult,
} from './types';

export async function runLookupRequest(
  options: RunLookupRequestOptions,
): Promise<RunLookupRequestResult> {
  const capturedGeneration = options.request.context.generation;
  const cacheKey = createCacheKey(options.provider.id, options.operation, options.request);

  if (options.operation === 'search') {
    const cached = options.cache?.get<LookupResult[]>(cacheKey);
    const results = cached ?? await options.provider.search(options.request as LookupSearchRequest);

    if (options.getCurrentGeneration() !== capturedGeneration) {
      return {
        operation: 'search',
        applied: false,
        results: [],
        diagnostics: [stale(options.provider.id, options.request.context.rowId)],
      };
    }

    if (cached === undefined) {
      options.cache?.set(cacheKey, results);
    }

    return {
      operation: 'search',
      applied: true,
      results: clone(results),
      diagnostics: [],
    };
  }

  if (options.operation === 'resolve') {
    const cached = options.cache?.get<LookupResult>(cacheKey);
    const result = cached ?? await options.provider.resolve(options.request as LookupResolveRequest);

    if (options.getCurrentGeneration() !== capturedGeneration) {
      return {
        operation: 'resolve',
        applied: false,
        diagnostics: [stale(options.provider.id, options.request.context.rowId)],
      };
    }

    if (cached === undefined && result !== undefined) {
      options.cache?.set(cacheKey, result);
    }

    return {
      operation: 'resolve',
      applied: true,
      result: clone(result),
      diagnostics: [],
    };
  }

  const cached = options.cache?.get<Record<TransactionElementId, GridValue>>(cacheKey);
  const values = cached ?? (await options.provider.enrich?.(options.request as LookupEnrichRequest) ?? {});

  if (options.getCurrentGeneration() !== capturedGeneration) {
    return {
      operation: 'enrich',
      applied: false,
      values: {},
      diagnostics: [stale(options.provider.id, options.request.context.rowId)],
    };
  }

  if (cached === undefined) {
    options.cache?.set(cacheKey, values);
  }

  return {
    operation: 'enrich',
    applied: true,
    values: clone(values),
    diagnostics: [],
  };
}

function createCacheKey(
  providerId: string,
  operation: 'search' | 'resolve' | 'enrich',
  request: LookupSearchRequest | LookupResolveRequest | LookupEnrichRequest,
): LookupCacheKey {
  const context = {
    headerValues: request.context.headerValues ?? {},
    rowValues: request.context.rowValues ?? {},
    ...('snapshotValues' in request ? { snapshotValues: request.snapshotValues } : {}),
  };

  return {
    providerId,
    operation,
    fieldId: request.context.fieldId,
    query: 'query' in request ? request.query : undefined,
    entityId: 'entityId' in request ? request.entityId : undefined,
    context,
  };
}

function stale(providerId: string, rowId?: string): LookupDiagnostic {
  return {
    severity: 'warning',
    code: 'STALE_LOOKUP_RESPONSE_IGNORED',
    providerId,
    rowId,
    message: rowId
      ? `Stale lookup response ignored for row: ${rowId}`
      : 'Stale lookup response ignored',
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
