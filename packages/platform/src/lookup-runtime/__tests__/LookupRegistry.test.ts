import { describe, expect, it } from 'vitest';
import { LookupRegistry } from '../LookupRegistry';
import { createFixtureProvider } from './fixtures/lookupProviders.fixture';

describe('LookupRegistry', () => {
  it('registers and retrieves providers by ID', () => {
    const registry = new LookupRegistry();
    const provider = createFixtureProvider();

    registry.register(provider);

    expect(registry.get('fixture.entity')).toBe(provider);
    expect(registry.list()).toEqual([provider]);
  });

  it('prevents duplicate provider registration', () => {
    const registry = new LookupRegistry();

    registry.register(createFixtureProvider('fixture.entity'));

    expect(() => registry.register(createFixtureProvider('fixture.entity'))).toThrow(
      'Lookup provider already registered: fixture.entity',
    );
  });

  it('reports missing providers with diagnostics', () => {
    const registry = new LookupRegistry();

    expect(registry.require('missing.provider')).toEqual({
      diagnostics: [{
        severity: 'error',
        code: 'PROVIDER_NOT_FOUND',
        providerId: 'missing.provider',
        message: 'Lookup provider not found: missing.provider',
      }],
    });
  });
});
