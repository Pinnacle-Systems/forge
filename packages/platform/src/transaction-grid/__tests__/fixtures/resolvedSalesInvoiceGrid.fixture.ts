import { mergeTransactionDefinition } from '@forge/platform/runtime-definition';
import { salesInvoiceManifest } from '../../../runtime-definition/__tests__/fixtures/salesInvoiceManifest.fixture';

export const resolvedSalesInvoiceGridColumns = mergeTransactionDefinition(
  salesInvoiceManifest,
).grid.columns;
