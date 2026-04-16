import type {
  LookupProvider,
  LookupResult,
  LookupValidationResult,
} from '@forge/platform/lookup-runtime';

export const salesTaxCodeLookupProviderId = 'sales.taxCode';

interface TaxCodeFixture {
  code: string;
  label: string;
  active: boolean;
}

const taxCodeFixtures: readonly TaxCodeFixture[] = [
  { code: 'TAX-STD', label: 'Standard Tax', active: true },
  { code: 'TAX-REDUCED', label: 'Reduced Tax', active: true },
  { code: 'ZERO', label: 'Zero Rated', active: true },
  { code: 'EXEMPT', label: 'Exempt', active: true },
];

export function createSalesTaxCodeLookupProvider(): LookupProvider {
  return {
    id: salesTaxCodeLookupProviderId,

    async search({ query }) {
      const normalized = normalizeQuery(query);

      if (!normalized) {
        return [];
      }

      return taxCodeFixtures
        .filter((taxCode) => matchesTaxCode(taxCode, normalized))
        .map(toTaxCodeResult);
    },

    async resolve({ entityId }) {
      const taxCode = taxCodeFixtures.find((candidate) => candidate.code === entityId);
      return taxCode ? toTaxCodeResult(taxCode) : undefined;
    },

    async validate({ entityId }): Promise<LookupValidationResult> {
      const taxCode = taxCodeFixtures.find((candidate) => candidate.code === entityId);

      if (!taxCode) {
        return invalid('TAX_CODE_NOT_FOUND', `Tax code not found: ${entityId}`);
      }

      if (!taxCode.active) {
        return invalid('TAX_CODE_INACTIVE', `Tax code is inactive: ${entityId}`);
      }

      return { valid: true, issues: [] };
    },
  };
}

function matchesTaxCode(taxCode: TaxCodeFixture, normalizedQuery: string): boolean {
  return normalizeQuery(taxCode.code).includes(normalizedQuery)
    || normalizeQuery(taxCode.label).includes(normalizedQuery);
}

function toTaxCodeResult(taxCode: TaxCodeFixture): LookupResult {
  return {
    entityId: taxCode.code,
    label: taxCode.label,
    values: {
      taxCode: taxCode.code,
    },
    metadata: {
      active: taxCode.active,
    },
  };
}

function invalid(code: string, message: string): LookupValidationResult {
  return {
    valid: false,
    issues: [{
      severity: 'error',
      code,
      message,
    }],
  };
}

function normalizeQuery(value: string): string {
  return value.trim().toLocaleLowerCase();
}
