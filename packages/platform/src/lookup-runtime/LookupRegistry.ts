import type {
  LookupDiagnostic,
  LookupProvider,
  LookupProviderId,
} from './types';

export class LookupRegistry {
  private readonly providers = new Map<LookupProviderId, LookupProvider>();

  register(provider: LookupProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Lookup provider already registered: ${provider.id}`);
    }

    this.providers.set(provider.id, provider);
  }

  get(providerId: LookupProviderId): LookupProvider | undefined {
    return this.providers.get(providerId);
  }

  require(providerId: LookupProviderId): {
    provider?: LookupProvider;
    diagnostics: LookupDiagnostic[];
  } {
    const provider = this.get(providerId);

    if (provider) {
      return { provider, diagnostics: [] };
    }

    return {
      diagnostics: [{
        severity: 'error',
        code: 'PROVIDER_NOT_FOUND',
        providerId,
        message: `Lookup provider not found: ${providerId}`,
      }],
    };
  }

  list(): LookupProvider[] {
    return [...this.providers.values()];
  }
}
