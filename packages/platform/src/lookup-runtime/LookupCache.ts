import type {
  LookupCacheKey,
  LookupCacheOptions,
} from './types';

interface CacheEntry<T> {
  value: T;
  storedAt: number;
}

export class LookupCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs?: number;
  private readonly now: () => number;

  constructor(options: LookupCacheOptions = {}) {
    this.ttlMs = options.ttlMs;
    this.now = options.now ?? Date.now;
  }

  get<T>(key: LookupCacheKey): T | undefined {
    const normalizedKey = normalizeKey(key);
    const entry = this.entries.get(normalizedKey);

    if (!entry) {
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.entries.delete(normalizedKey);
      return undefined;
    }

    return clone(entry.value) as T;
  }

  set<T>(key: LookupCacheKey, value: T): void {
    this.entries.set(normalizeKey(key), {
      value: clone(value),
      storedAt: this.now(),
    });
  }

  delete(key: LookupCacheKey): void {
    this.entries.delete(normalizeKey(key));
  }

  clear(): void {
    this.entries.clear();
  }

  has(key: LookupCacheKey): boolean {
    return this.get(key) !== undefined;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return this.ttlMs !== undefined && this.now() - entry.storedAt > this.ttlMs;
  }
}

function normalizeKey(key: LookupCacheKey): string {
  return stableStringify({
    providerId: key.providerId,
    operation: key.operation,
    fieldId: key.fieldId,
    query: key.query,
    entityId: key.entityId,
    context: key.context ?? {},
  });
}

function stableStringify(value: unknown): string {
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    return `{${Object.keys(objectValue).sort().map((key) => (
      `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`
    )).join(',')}}`;
  }

  return JSON.stringify(value);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
