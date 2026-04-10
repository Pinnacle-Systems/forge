import { describe, expect, it } from 'vitest';
import { LookupCache } from '../LookupCache';
import { fixtureResult } from './fixtures/lookupProviders.fixture';

describe('LookupCache', () => {
  it('returns cloned cached lookup data', () => {
    const cache = new LookupCache();
    const key = {
      providerId: 'fixture.entity',
      operation: 'resolve' as const,
      fieldId: 'lookupField',
      entityId: 'entity-1',
    };

    cache.set(key, fixtureResult);
    const cached = cache.get<typeof fixtureResult>(key);

    expect(cached).toEqual(fixtureResult);
    cached!.values.description = 'mutated';

    expect(cache.get<typeof fixtureResult>(key)?.values.description).toBe('Resolved description');
  });

  it('keys entries by provider, operation, field, query or entity, and context', () => {
    const cache = new LookupCache();
    const firstKey = {
      providerId: 'fixture.entity',
      operation: 'search' as const,
      fieldId: 'lookupField',
      query: 'abc',
      context: { segment: 'a', branch: 1 },
    };
    const sameContextDifferentOrder = {
      providerId: 'fixture.entity',
      operation: 'search' as const,
      fieldId: 'lookupField',
      query: 'abc',
      context: { branch: 1, segment: 'a' },
    };
    const secondKey = {
      ...firstKey,
      context: { segment: 'b', branch: 1 },
    };

    cache.set(firstKey, ['first']);

    expect(cache.get<string[]>(sameContextDifferentOrder)).toEqual(['first']);
    expect(cache.get<string[]>(secondKey)).toBeUndefined();
  });

  it('clears and deletes entries deterministically', () => {
    const cache = new LookupCache();
    const firstKey = {
      providerId: 'fixture.entity',
      operation: 'resolve' as const,
      fieldId: 'lookupField',
      entityId: 'entity-1',
    };
    const secondKey = {
      providerId: 'fixture.entity',
      operation: 'resolve' as const,
      fieldId: 'lookupField',
      entityId: 'entity-2',
    };

    cache.set(firstKey, 'first');
    cache.set(secondKey, 'second');
    cache.delete(firstKey);

    expect(cache.get<string>(firstKey)).toBeUndefined();
    expect(cache.get<string>(secondKey)).toBe('second');

    cache.clear();

    expect(cache.get<string>(secondKey)).toBeUndefined();
  });

  it('does not expose validation success state', () => {
    const cache = new LookupCache();
    const validationLikeKey = {
      providerId: 'fixture.entity',
      operation: 'resolve' as const,
      fieldId: 'lookupField',
      entityId: 'entity-1',
    };

    cache.set(validationLikeKey, fixtureResult);

    expect(cache.get(validationLikeKey)).not.toHaveProperty('valid');
  });
});
