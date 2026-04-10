# Story 006: Sales Invoice Calculations

## Status

review

## Goal

Implement module-owned, pure synchronous Sales Invoice calculations for line values and footer totals, and integrate them with the existing runtime so committed header/row changes trigger deterministic recalculation without introducing async behavior or platform business branching.

---

## Source of Truth

* `docs/architecture.md`
* `docs/prd.md`
* `spec/modules/sales/sales-invoice.md`
* `spec/platform/transaction-grid.md`
* `spec/platform/lookup-autofill.md`
* `_bmad-output/implementation-artifacts/stories/002-sales-invoice-manifest-skeleton.md`
* `_bmad-output/implementation-artifacts/stories/003-transaction-grid-row-engine.md`
* `_bmad-output/implementation-artifacts/stories/004-lookup-runtime-foundation.md`
* `_bmad-output/implementation-artifacts/stories/005-sales-customer-and-product-lookup-providers.md`

---

## Constraints Applied

* Calculations are **pure and synchronous** (no async/await, no I/O).
* Sales module owns all calculation logic.
* Platform/runtime triggers calculations but **must not contain Sales-specific logic**.
* Calculations operate only on **committed values**, not edit buffers.
* **Excluded rows**:

  * Phantom rows
  * Deleted rows
    → must not contribute to totals.
* Manual unit price override:

  * Must be preserved by default on product change.
  * Must be marked **stale** when product or tax context changes.
* Tax rates are resolved synchronously from **module-owned fixtures**.
* Rounding: **half-up to 2 decimal places**
  (`Math.round(value * 100) / 100`)
* No customer/product/tax branching inside platform code.

---

## Scope

* Implement pure line calculations:

  * `lineSubtotal`
  * `lineTax`
  * `lineTotal`
* Implement footer calculations:

  * `subtotal`
  * `taxTotal`
  * `grandTotal`
* Implement deterministic tax rate resolution from `taxCode`
* Implement manual unit price override detection
* Implement stale marking for preserved overrides
* Implement recalculation orchestration from committed state
* Wire Sales Invoice calculation hooks to module-owned functions
* Add unit + integration tests

---

## Out of Scope

* Async enrichment or validation
* Save-time validation
* Multi-currency
* Complex tax jurisdictions
* Discounts/promotions
* UI rendering of stale indicators
* Platform contract redesign

---

## Dependencies

* Story 002: Manifest defines calculation hook refs
* Story 003: Grid engine provides committed rows + metadata
* Story 004: Lookup + cascade behavior (preserve/reset)
* Story 005: Providers supply committed unit price + taxCode + snapshots

---

## Runtime Contract Check Before Implementation

Before implementing:

Inspect:

* `packages/platform/src/transaction-grid/types.ts`
* existing grid/runtime APIs

Rules:

* Treat **existing runtime types and APIs as authoritative**
* Do not modify platform contracts to fit this story
* If mismatch exists → adapt implementation, not platform
* Use existing test helpers if available

---

## Exact File Structure

packages/
modules/
sales/
src/
calculations/
types.ts
tax.ts
lineCalculations.ts
footerCalculations.ts
manualOverride.ts
recalculation.ts
hooks.ts
index.ts
**tests**/
lineCalculations.test.ts
footerCalculations.test.ts
manualOverride.test.ts
recalculation.test.ts

---

## Public API

export * from './types';

export {
calculateSalesInvoiceLine,
isManualUnitPriceOverride,
shouldMarkManualOverrideStale,
} from './lineCalculations';

export {
calculateSalesInvoiceFooterTotals,
} from './footerCalculations';

export {
recalculateSalesInvoice,
} from './recalculation';

export {
createSalesInvoiceCalculationHooks,
} from './hooks';

---

## Core Types (Module-Owned)

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

export interface SalesInvoiceRow {
rowId: string;
values: SalesInvoiceRowValues;
isDeleted?: boolean;
isPhantom?: boolean;
metadata?: Record<string, unknown>;
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

---

## Tax Resolution (Module-Owned)

const TAX_RATES: Record<string, number> = {
STANDARD: 0.1,
ZERO: 0,
EXEMPT: 0,
};

export function getTaxRate(code?: string): number {
return TAX_RATES[code ?? ''] ?? 0;
}

---

## Calculation Rules

### Line Calculation

lineSubtotal = round(quantity * unitPrice)
lineTax = round(lineSubtotal * taxRate)
lineTotal = round(lineSubtotal + lineTax)

Rules:

* Invalid or missing values → treated as 0
* Always round at each step

---

### Footer Calculation

Include only rows where:

* !isDeleted
* !isPhantom

subtotal = sum(lineSubtotal)
taxTotal = sum(lineTax)
grandTotal = subtotal + taxTotal

---

## Manual Override Logic

### Detection

Manual override exists when:

* committed unitPrice differs from provider-originated price (snapshot/base)

Fallback:

* if snapshot not available → do not treat as override unless metadata indicates it

---

### Preservation

On product change (cascade = preserve):

* keep current unitPrice
* do not overwrite from enrich

---

### Stale Marking

Mark override as stale when:

* override is preserved AND
* product changes OR taxCode changes

---

## Recalculation Orchestration

recalculateSalesInvoice({
headerValues,
rows
})

Must:

* iterate rows deterministically
* recalc valid rows only
* preserve deleted + phantom rows
* update line values
* compute footer totals
* return new rows + footer

Constraints:

* pure
* synchronous
* no side effects

---

## Hook Wiring

createSalesInvoiceCalculationHooks() must:

* map manifest hook refs → module functions
* not mutate manifest
* use existing runtime hook mechanism

---

## Required Tests

### Line Tests

* correct subtotal, tax, total
* rounding edge cases (0.005 → 0.01)
* zero/invalid input → 0
* deterministic output

### Footer Tests

* excludes phantom rows
* excludes deleted rows
* sums correctly
* returns 0 for empty input

### Manual Override Tests

* detects override vs snapshot price
* preserved override remains after product change
* stale marked on product/tax change
* non-overridden values not marked stale

### Recalculation Tests

* recalculates on quantity change
* recalculates on unit price change
* recalculates on taxCode change
* updates footer totals
* deterministic ordering
* no async usage
* uses committed values only

---

## Implementation Tasks

* [x] Define types
* [x] Implement rounding helpers
* [x] Implement tax resolution
* [x] Implement line calculations
* [x] Implement footer calculations
* [x] Implement manual override detection
* [x] Implement stale marking logic
* [x] Implement recalculation orchestration
* [x] Wire hooks
* [x] Write tests
* [x] Run pnpm test
* [x] Run pnpm typecheck

---

## Risks

* Async logic leaks into calculations
* Phantom/deleted rows included in totals
* Manual override overwritten
* Rounding inconsistencies
* Platform contract drift

---

## Acceptance Criteria

* Calculations are pure, synchronous, deterministic
* Footer excludes phantom + deleted rows
* Tax resolved locally
* Manual override preserved + marked stale correctly
* Recalculation triggered from committed state
* No platform business logic added
* Tests cover all scenarios

---

## Definition of Done

* Calculation module implemented in Sales
* Tests pass
* Typecheck passes
* No spec changes
* No async code in calculations
* Gaps documented if any

---

## Dev Agent Record

### Implementation Plan

* Implemented Sales-owned pure calculation modules without changing platform contracts.
* Added local tax resolution and half-up two-decimal rounding helpers.
* Added deterministic line/footer recalculation over committed row values only.
* Added manual unit price override detection and stale marking helpers that work with existing grid metadata.
* Added manifest hook-ref mapping through `createSalesInvoiceCalculationHooks` because no generic platform hook runtime exists yet.

### Debug Log

* Story source list references `_bmad-output/implementation-artifacts/stories/005-sales-customer-and-product-lookup-providers.md`, but the actual completed story file is `_bmad-output/implementation-artifacts/stories/005-sales-customer-product-lookup-providers.md`.
* Initial red test run failed because calculation modules did not exist.
* No platform contract changes were needed.
* Verified no `async`, `await`, `Promise`, or I/O calls exist in calculation implementation files.

### Completion Notes

* Added Sales calculation types, rounding helpers, tax fixtures, line calculations, footer totals, manual override logic, recalculation orchestration, and calculation hook mapping.
* Recalculation preserves deleted and phantom rows while excluding them from footer totals.
* Recalculation preserves unit price values and marks preserved manual overrides stale when product or tax context changes.
* Verified with `pnpm test` and `pnpm typecheck`.

## File List

* `_bmad-output/implementation-artifacts/stories/006-sales-invoice-calculations.md`
* `packages/modules/sales/package.json`
* `packages/modules/sales/src/index.ts`
* `packages/modules/sales/src/calculations/index.ts`
* `packages/modules/sales/src/calculations/types.ts`
* `packages/modules/sales/src/calculations/rounding.ts`
* `packages/modules/sales/src/calculations/tax.ts`
* `packages/modules/sales/src/calculations/lineCalculations.ts`
* `packages/modules/sales/src/calculations/footerCalculations.ts`
* `packages/modules/sales/src/calculations/manualOverride.ts`
* `packages/modules/sales/src/calculations/recalculation.ts`
* `packages/modules/sales/src/calculations/hooks.ts`
* `packages/modules/sales/src/calculations/__tests__/lineCalculations.test.ts`
* `packages/modules/sales/src/calculations/__tests__/footerCalculations.test.ts`
* `packages/modules/sales/src/calculations/__tests__/manualOverride.test.ts`
* `packages/modules/sales/src/calculations/__tests__/recalculation.test.ts`
* `vitest.config.ts`

## Change Log

* 2026-04-10: Implemented Story 006 Sales Invoice calculations, recalculation orchestration, manual override stale marking, hook mapping, and tests.
