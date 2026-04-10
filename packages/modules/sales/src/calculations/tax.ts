const TAX_RATES: Record<string, number> = {
  STANDARD: 0.1,
  'TAX-STD': 0.1,
  ZERO: 0,
  EXEMPT: 0,
  'TAX-REDUCED': 0.05,
};

export function getTaxRate(code?: string): number {
  return TAX_RATES[code ?? ''] ?? 0;
}
