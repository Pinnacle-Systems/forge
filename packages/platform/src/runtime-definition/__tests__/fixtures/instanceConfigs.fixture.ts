import type { TransactionInstanceConfig } from '../../types';

export const emptyConfig: TransactionInstanceConfig = {
  transactionType: 'sales.invoice',
  overrides: {},
};

export const validPresentationConfig: TransactionInstanceConfig = {
  transactionType: 'sales.invoice',
  overrides: {
    reference: {
      label: 'PO Reference',
      visible: false,
      order: 5,
    },
    quantity: {
      label: 'Qty',
      width: 96,
      editable: false,
      required: false,
      order: 15,
    },
  },
};

export const unknownTargetConfig: TransactionInstanceConfig = {
  transactionType: 'sales.invoice',
  overrides: {
    missingField: {
      label: 'Missing',
    },
  },
};

export const unauthorizedOverrideConfig: TransactionInstanceConfig = {
  transactionType: 'sales.invoice',
  overrides: {
    lineTotal: {
      editable: true,
    },
  },
};

export const businessLogicOverrideConfig = {
  transactionType: 'sales.invoice',
  overrides: {
    lineTotal: {
      calculationRef: 'customer.sneakyFormula',
    },
    customer: {
      lookupProviderRef: 'customer.customLookup',
      validationRefs: [],
      kind: 'text',
      id: 'otherCustomer',
    },
    product: {
      cascadeRefs: ['customer.customCascade'],
    },
    grandTotal: {
      hooks: {
        persistence: 'customer.customSave',
      },
      persistence: 'customer.customSave',
    },
  },
} as unknown as TransactionInstanceConfig;

export const invalidValueConfig = {
  transactionType: 'sales.invoice',
  overrides: {
    reference: {
      visible: 'yes',
      label: '',
      order: Number.NaN,
    },
    quantity: {
      editable: 'false',
      required: 1,
      width: -10,
    },
  },
} as unknown as TransactionInstanceConfig;
