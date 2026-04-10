import type {
  LookupProvider,
  LookupResult,
  LookupValidationResult,
} from '@forge/platform/lookup-runtime';
import {
  salesCustomerFixtures,
  type SalesCustomerFixture,
} from './customerFixtures';

export const salesCustomerLookupProviderId = 'sales.customer';

interface SalesCustomerLookupProviderOptions {
  customers?: readonly SalesCustomerFixture[];
}

export function createSalesCustomerLookupProvider(
  options: SalesCustomerLookupProviderOptions = {},
): LookupProvider {
  const customers = options.customers ?? salesCustomerFixtures;

  return {
    id: salesCustomerLookupProviderId,

    async search({ query }) {
      const normalized = normalizeQuery(query);

      if (!normalized) {
        return [];
      }

      return customers
        .filter((customer) => normalizeQuery(customer.code).includes(normalized)
          || normalizeQuery(customer.name).includes(normalized))
        .map(toCustomerResult);
    },

    async resolve({ entityId }) {
      const customer = customers.find((candidate) => candidate.id === entityId);
      return customer ? toCustomerResult(customer) : undefined;
    },

    async validate({ entityId }): Promise<LookupValidationResult> {
      const customer = customers.find((candidate) => candidate.id === entityId);

      if (!customer) {
        return invalid('CUSTOMER_NOT_FOUND', `Customer not found: ${entityId}`);
      }

      if (!customer.active) {
        return invalid('CUSTOMER_INACTIVE', `Customer is inactive: ${customer.code}`);
      }

      return { valid: true, issues: [] };
    },
  };
}

function toCustomerResult(customer: SalesCustomerFixture): LookupResult {
  return {
    entityId: customer.id,
    label: customer.name,
    values: {
      customer: customer.id,
      customerCode: customer.code,
      customerName: customer.name,
      defaultTaxCode: customer.defaultTaxCode,
    },
    metadata: {
      active: customer.active,
      ...customer.metadata,
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
