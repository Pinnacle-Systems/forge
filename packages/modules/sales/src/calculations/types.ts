import type {
  AutofillAnnotation,
  EditBuffer,
  LookupSnapshotValue,
  StaleAnnotation,
  TransactionElementId,
} from '@forge/platform/transaction-grid';

export interface SalesInvoiceHeaderValues {
  customer?: string;
  invoiceDate?: string;
}

export interface SalesInvoiceRowValues {
  product?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  taxCode?: string;
  lineSubtotal?: number;
  lineTax?: number;
  lineTotal?: number;
}

export interface SalesInvoiceRowMetadata {
  lookupSnapshots?: Partial<Record<TransactionElementId, LookupSnapshotValue>>;
  autofill?: Partial<Record<TransactionElementId, AutofillAnnotation>>;
  stale?: Partial<Record<TransactionElementId, StaleAnnotation>>;
  editBuffer?: EditBuffer;
  [key: string]: unknown;
}

export interface SalesInvoiceRow {
  rowId: string;
  values: SalesInvoiceRowValues;
  isDeleted?: boolean;
  isPhantom?: boolean;
  metadata?: SalesInvoiceRowMetadata;
}

export interface LineResult {
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

export interface FooterResult {
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
}

export interface RecalculateSalesInvoiceInput {
  headerValues?: SalesInvoiceHeaderValues;
  rows: SalesInvoiceRow[];
  previousRows?: SalesInvoiceRow[];
}

export interface RecalculateSalesInvoiceResult {
  rows: SalesInvoiceRow[];
  footer: FooterResult;
}

export type SalesInvoiceCalculationHook =
  (input: SalesInvoiceRowValues | SalesInvoiceRow[] | RecalculateSalesInvoiceInput) => number;

export type SalesInvoiceCalculationHooks = Record<string, SalesInvoiceCalculationHook>;
