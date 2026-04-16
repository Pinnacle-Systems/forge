# Story 005: Sales Customer and Product Lookup Providers

## Status
review

## Goal
Implement module-owned lookup providers and deterministic fixture-backed services for the Sales Invoice vertical slice: customer header selection, product row selection, barcode-to-product fill, product enrichment, and save-time product validation.

## Source of Truth
- `docs/architecture.md`
- `docs/prd.md`
- `spec/platform/lookup-autofill.md`
- `spec/platform/transaction-grid.md`
- `spec/modules/sales/sales-invoice.md`
- `spec/modules/inventory/product-lookup.md`
- `_bmad-output/implementation-artifacts/stories/002-sales-invoice-manifest-skeleton.md`
- `_bmad-output/implementation-artifacts/stories/004-lookup-runtime-foundation.md`

## Constraints Applied
- Module code owns customer/product lookup behavior, product enrichment, and backend-authoritative validation semantics.
- Platform lookup runtime may be used for registration, orchestration, caching, snapshots, cascades, and stale-response protection, but platform code must not gain Sales, Inventory, product, customer, barcode, tax, or invoice branching.
- UI and providers consume resolved definitions and provider contracts; they must not read raw manifests or raw instance config.
- Product provider ID must be `inventory.product`.
- Sales customer provider ID for this slice is `sales.customer`.
- Manifest lookup refs must align directly with concrete provider IDs; this story must not introduce an extra ref-to-provider translation layer.
- Product search supports SKU, product name, and barcode.
- Product resolve supports exact product ID lookup.
- Barcode is an input path through product `search` or `resolve` followed by the same lookup selection/enrich pipeline; it must not become grid-specific business logic.
- Lookup selection creates snapshot values in the row/header target.
- Product enrich returns product master data only. Customer pricing and quantity-break pricing are transaction-level calculations owned by the consuming module, not the lookup provider.
- Save-time validation rechecks product status and validity using provider `validate`; cached lookup data is never authoritative for save.
- Cascade behavior defaults to preserve. Manual price override preservation belongs to lookup/cascade metadata and later calculation behavior, not provider-side mutation of grid internals.
- No specs, ADRs, or PRD files are modified by this story.

## Scope
- Add a module-owned Sales lookup provider for customer header selection.
- Add an Inventory module package with a product lookup provider using provider ID `inventory.product`.
- Add deterministic in-memory fixture services for customers and products so tests behave like backend-backed providers without external integration.
- Add provider registration/assembly code that registers Sales and Inventory providers with `LookupRegistry`.
- Keep manifest lookup refs directly resolvable:
  - `sales.customer`
  - `inventory.product`
  - `sales.taxCode`
- Implement product search by SKU, product name, and barcode.
- Implement product exact ID resolve.
- Implement product enrich output for product display snapshot values, base unit price, tax code, and status/validity metadata needed by save validation.
- Implement product validation output for discontinued products and validity date windows.
- Add focused unit tests for customer provider behavior, product provider behavior, barcode flow, registration, and boundary compliance.

## Out of Scope
- Full inventory module behavior beyond product lookup fixtures.
- Real backend, network transport, persistence, database schema, or migrations.
- Customer-specific pricing and quantity-break pricing logic.
- Sales Invoice calculations, subtotal/tax/grand-total orchestration, or save orchestration UI.
- Rendering lookup popovers, barcode scanner UI, stale indicators, or cascade prompts.
- Generic header lookup selection runtime if it does not already exist. Customer provider tests should prove snapshot-ready lookup values; UI/header application can be assembled in a later shell story.
- Changing manifest contracts, instance config contracts, merge engine behavior, or platform lookup runtime semantics unless a small missing type export blocks provider implementation.

## Dependencies
- Story 002: Sales Invoice Manifest Skeleton is complete and exposes `salesInvoiceManifest` with lookup refs `sales.customer`, `inventory.product`, and `sales.taxCode`.
- Story 004: Lookup Runtime Foundation is complete and exports `LookupProvider`, request/response types, `LookupRegistry`, `runLookupRequest`, and `applyLookupSelection` from `@forge/platform/lookup-runtime`.
- Story 003: TransactionGrid Row Engine is complete if integration tests need row snapshots for product selection/barcode fill.

## Exact File Structure
Create or update the following module-owned files. Keep current repo conventions if implementation has already introduced equivalent paths, but do not place these providers in `packages/platform`.

```text
packages/
  modules/
    sales/
      src/
        lookups/
          customerFixtures.ts
          customerLookupProvider.ts
          lookupRegistration.ts
          index.ts
          __tests__/
            customerLookupProvider.test.ts
            salesLookupRegistration.test.ts
        index.ts
      package.json
    inventory/
      package.json
      src/
        lookups/
          productFixtures.ts
          productLookupProvider.ts
          index.ts
          __tests__/
            productLookupProvider.test.ts
            barcodeProductLookup.test.ts
        index.ts
```

If the implementation needs shared test helpers for applying lookup selections through the grid engine, place them under the relevant `__tests__/fixtures/` folder in the module package, not in platform.

## Public API
Export Sales lookup symbols from `packages/modules/sales/src/lookups/index.ts`:

```ts
export {
  createSalesCustomerLookupProvider,
  salesCustomerLookupProviderId,
} from './customerLookupProvider';
export {
  registerSalesInvoiceLookupProviders,
  salesInvoiceLookupProviderRefs,
} from './lookupRegistration';
export type { SalesCustomerFixture } from './customerFixtures';
```

Update `packages/modules/sales/src/index.ts` to export lookups without removing the existing transaction export:

```ts
export { salesInvoiceManifest } from './transactions';
export * from './lookups';
```

Update `packages/modules/sales/package.json` if `lookupRegistration.ts` imports the Inventory product provider:

```json
"dependencies": {
  "@forge/inventory": "workspace:*",
  "@forge/platform": "workspace:*"
}
```

Create `packages/modules/inventory/package.json`:

```json
{
  "name": "@forge/inventory",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {
    "@forge/platform": "workspace:*"
  },
  "exports": {
    ".": "./src/index.ts",
    "./lookups": "./src/lookups/index.ts"
  }
}
```

Export Inventory lookup symbols from `packages/modules/inventory/src/lookups/index.ts`:

```ts
export {
  createInventoryProductLookupProvider,
  inventoryProductLookupProviderId,
} from './productLookupProvider';
export type { InventoryProductFixture } from './productFixtures';
```

Export the same symbols from `packages/modules/inventory/src/index.ts`.

## Provider IDs and Hook Reference Alignment
- `salesCustomerLookupProviderId` must equal `sales.customer`.
- `inventoryProductLookupProviderId` must equal `inventory.product`.
- `salesTaxCodeLookupProviderId` must equal `sales.taxCode`.
- `salesInvoiceLookupProviderRefs` must be a deterministic object:

```ts
export const salesInvoiceLookupProviderRefs = {
  customer: {
    manifestRef: 'sales.customer',
    providerId: salesCustomerLookupProviderId,
  },
  product: {
    manifestRef: 'inventory.product',
    providerId: inventoryProductLookupProviderId,
  },
  taxCode: {
    manifestRef: 'sales.taxCode',
    providerId: salesTaxCodeLookupProviderId,
  },
} as const;
```

- `registerSalesInvoiceLookupProviders(registry)` must register customer, product, and tax-code providers with the supplied `LookupRegistry`.
- Registration must not mutate `salesInvoiceManifest`.
- Registration must not hide duplicate-provider errors from `LookupRegistry`; let the platform runtime's deterministic behavior surface duplicates.

## Customer Fixture Contract
Use deterministic fixture data with at least three customers:
- one ordinary active customer;
- one customer with a customer-specific product price override for at least one fixture product;
- one inactive or credit-warning customer represented as metadata for later validation stories.

Minimum customer fixture shape:

```ts
export interface SalesCustomerFixture {
  id: string;
  code: string;
  name: string;
  defaultTaxCode: string;
  active: boolean;
  priceOverrides?: Record<string, number>;
  metadata?: Record<string, unknown>;
}
```

Customer `LookupResult.values` must include:
- `customer`: customer ID
- `customerCode`: fixture code
- `customerName`: display name
- `defaultTaxCode`: default tax code

Customer metadata may include `active` and any later-story values, but tests should assert only the fields this story owns.

## Product Fixture Contract
Use deterministic fixture data with at least four products:
- one active product searchable by SKU and name;
- one active product searchable by barcode;
- one discontinued product;
- one product outside a validity date window.

Minimum product fixture shape:

```ts
export interface InventoryProductFixture {
  id: string;
  sku: string;
  name: string;
  barcodes: string[];
  baseUnitPrice: number;
  taxCode: string;
  discontinued: boolean;
  validFrom?: string;
  validTo?: string;
  quantityPriceBreaks?: Array<{ minQuantity: number; unitPrice: number }>;
  metadata?: Record<string, unknown>;
}
```

Product `LookupResult.values` from search/resolve must include:
- `product`: product ID
- `productSku`: SKU
- `productName`: display name
- `unitPrice`: base unit price
- `taxCode`: default tax code

Product metadata must include:
- `sku`
- `barcodes`
- `discontinued`
- `validFrom` when present
- `validTo` when present

## Required Provider Behavior

### Sales Customer Provider
- Implements `LookupProvider`.
- `id` is `sales.customer`.
- `search({ query })` matches by customer code or customer name, case-insensitively.
- Empty or whitespace-only queries return an empty array.
- Results are deterministic and sorted by fixture order unless the existing repo has a stronger sorting convention.
- `resolve({ entityId })` returns exact ID match or `undefined`.
- `enrich` may be omitted unless needed to satisfy the platform type contract; customer selection values should be available from search/resolve results.
- `validate` returns valid for active fixture customers and an error or warning for inactive customers. This validation is module-owned and should be shaped like backend-authoritative validation even though fixtures are local.

### Inventory Product Provider
- Implements `LookupProvider`.
- `id` is `inventory.product`.
- `search({ query })` matches by SKU, product name, or barcode, case-insensitively where applicable. Barcode matching may be exact normalized string matching.
- Empty or whitespace-only queries return an empty array.
- Results are deterministic and sorted by fixture order unless exact barcode match should be placed first; if exact barcode priority is implemented, test it explicitly.
- `resolve({ entityId })` returns exact product ID match or `undefined`.
- `enrich({ entityId, snapshotValues, context })` returns provider-owned product enrichment values:
  - `product`
  - `productSku`
  - `productName`
  - `unitPrice`
  - `taxCode`
- Enrich must remain limited to product master data and must not use transaction header or row context to compute pricing.
- Enrich must not calculate `lineTotal`, footer totals, or tax totals.
- `validate({ entityId, snapshotValues, context })` rechecks current fixture data by exact product ID and returns:
  - `valid: false` with an `error` issue code `PRODUCT_NOT_FOUND` when missing;
  - `valid: false` with an `error` issue code `PRODUCT_DISCONTINUED` when discontinued;
  - `valid: false` with an `error` issue code `PRODUCT_NOT_YET_VALID` when invoice date is before `validFrom`;
  - `valid: false` with an `error` issue code `PRODUCT_EXPIRED` when invoice date is after `validTo`;
  - `valid: true` with no issues for active products inside the validity window.
- Date validation should read `context.headerValues.invoiceDate` when present. Use deterministic string-date comparison for ISO `YYYY-MM-DD` fixture dates, or a small date helper if existing code already has one. Do not introduce date libraries.

## Barcode Flow Requirement
Implement barcode support as product-provider behavior, then prove the row-fill path composes platform runtime pieces:

1. Call `inventory.product.search({ query: barcode, context })` or `resolve` if the barcode fixture maps directly to a product ID.
2. Use the selected `LookupResult` plus `inventory.product.enrich(...)`.
3. Apply selection/enriched values through `applyLookupSelection` or the same row-engine external update path established in Story 004.

No barcode-specific branch may be added to `TransactionGridEngine`, `CascadeEngine`, `applyLookupSelection`, or platform lookup runtime code.

## Runtime Contract Check Before Implementation
Before implementing providers, inspect the current exports from `packages/platform/src/lookup-runtime/types.ts` and `packages/platform/src/transaction-grid/types.ts`.

Treat the currently exported platform runtime types and APIs as authoritative for implementation details if they differ from illustrative wording in this story. Do not change platform contracts just to match this story unless a true spec gap is identified and called out explicitly.

For the barcode integration test, use the existing `createTransactionGridEngine` and `applyLookupSelection` APIs from platform. If the repo already has grid test helpers, use them rather than introducing a new test harness. The test should create a grid with at least `product`, `productSku`, `productName`, `unitPrice`, and `taxCode` columns, run product search/enrich from a barcode query, apply the selected result to a row, and assert committed row values plus `metadata.lookupSnapshots.product`.

## Required Tests

### `customerLookupProvider.test.ts`
- returns no results for empty query.
- searches customers by code.
- searches customers by name case-insensitively.
- resolves exact customer ID.
- returns `undefined` for unknown customer ID.
- emits customer snapshot values for `customer`, `customerCode`, `customerName`, and `defaultTaxCode`.
- validates active customers as valid.
- validates inactive/blocked fixture customers with deterministic issue code.

### `productLookupProvider.test.ts`
- returns no results for empty query.
- searches products by SKU.
- searches products by product name case-insensitively.
- searches products by barcode.
- resolves exact product ID.
- returns `undefined` for unknown product ID.
- emits product snapshot values for `product`, `productSku`, `productName`, `unitPrice`, and `taxCode`.
- enrich returns base unit price with no customer/quantity context.
- enrich ignores transaction-specific pricing context and still returns base product master data.
- validation returns `PRODUCT_DISCONTINUED` for discontinued fixture products.
- validation returns `PRODUCT_NOT_YET_VALID` and `PRODUCT_EXPIRED` for validity-window failures.
- validation returns valid for an active product inside the invoice date window.

### `barcodeProductLookup.test.ts`
- barcode search returns the matching product.
- barcode-selected product can be enriched using the same `enrich` method as normal product selection.
- applying the barcode-selected/enriched product to a grid row writes row values through lookup selection or external row update.
- row metadata contains lookup snapshot data for the product field after barcode fill.
- the test imports only module providers plus platform lookup/grid APIs; it must not depend on barcode-specific platform code.

### `salesLookupRegistration.test.ts`
- `registerSalesInvoiceLookupProviders(new LookupRegistry())` registers `sales.customer`, `inventory.product`, and `sales.taxCode`.
- manifest hook refs map to concrete provider IDs using `salesInvoiceLookupProviderRefs`.
- the Sales Invoice manifest still references concrete provider IDs (`sales.customer`, `inventory.product`, `sales.taxCode`) and is not mutated by registration.
- duplicate registration behavior is delegated to `LookupRegistry`.

## Step-by-Step Implementation Tasks
- [x] Create Sales customer fixture data and types.
- [x] Implement `createSalesCustomerLookupProvider`.
- [x] Add Sales customer provider tests.
- [x] Create Inventory package scaffold and exports.
- [x] Create Inventory product fixture data and types.
- [x] Implement `createInventoryProductLookupProvider`.
- [x] Add product search, resolve, enrich, and validation tests.
- [x] Implement `salesInvoiceLookupProviderRefs`.
- [x] Implement `registerSalesInvoiceLookupProviders`.
- [x] Add lookup registration tests.
- [x] Add barcode flow integration test using product provider plus platform lookup/grid APIs.
- [x] Update package exports for Sales and Inventory modules.
- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.

## Implementation Notes
- Keep fixtures immutable from provider callers. Return cloned lookup results or construct fresh result objects so tests cannot mutate shared fixture state.
- Prefer small pure helpers such as `toCustomerResult`, `toProductResult`, `normalizeQuery`, and `isWithinValidityWindow`.
- Provider factories may accept optional fixture arrays for tests:

```ts
createInventoryProductLookupProvider({
  products?: InventoryProductFixture[];
})
```

Do not make `@forge/inventory` depend on `@forge/sales`; Sales-owned pricing behavior belongs in Sales module calculations.
- `@forge/sales` may depend on `@forge/inventory` for vertical-slice registration because Sales Invoice assembly composes the product provider. `@forge/inventory` must not depend on `@forge/sales`.
- If TypeScript path/workspace configuration does not automatically recognize the new Inventory package, make the smallest package/export update needed and document it in the Dev Agent Record.
- Do not add `lineTotal`, `subtotal`, `taxTotal`, or `grandTotal` to provider output. Story 006 owns calculations.
- Use issue codes in tests rather than asserting full human-readable messages.
- Avoid broad platform changes. If a missing platform export blocks provider tests, add only the export and a focused assertion.

## Risks
- Inventory behavior leaks into Sales or platform code instead of staying provider-owned.
- Barcode support bypasses lookup snapshot semantics and row-engine invariants.
- Fixture-enriched prices are treated as final save authority instead of being revalidated at save time.
- Product provider starts performing invoice calculations.
- Hook refs and provider IDs are conflated, causing manifest churn or raw manifest consumption.

## Acceptance Criteria
- Customer lookup provider supports deterministic search, resolve, snapshot values, and validation.
- Product lookup provider ID is `inventory.product`.
- Product lookup supports SKU, product name, and barcode search.
- Product resolve supports exact product ID lookup.
- Product enrich returns product identity/display values, unit price, and tax code without performing invoice calculations.
- Barcode scan/fill scenario is covered through the product lookup/enrich pipeline and row-engine lookup snapshot path.
- Product save-time validation can return discontinued and validity-date errors from current fixture state.
- Sales Invoice lookup registration keeps manifest refs aligned with concrete provider IDs without mutating the manifest.
- No platform code branches on product, customer, tax, barcode, or invoice semantics.
- Tests cover search, resolve, enrich, barcode flow, snapshots, registration, and validation conditions.

## Definition of Done
- Behavior matches `lookup-autofill.md`, `transaction-grid.md`, `sales-invoice.md`, and `product-lookup.md`.
- Customer and product providers are implemented in module-owned packages.
- Sales Invoice provider registration is deterministic and uses `LookupRegistry`.
- Barcode-to-row-fill works in tests through provider and lookup runtime contracts.
- Unit tests pass with `pnpm test`.
- Type checking passes with `pnpm typecheck`.
- No specs, ADRs, or PRD files are modified.
- Any discovered spec gap is noted in this story or a follow-up backlog item.

## Dev Agent Record

### Implementation Plan
- Implemented fixture-backed Sales customer and Inventory product providers against the current `LookupProvider` runtime contract.
- Kept Inventory independent from Sales by limiting the product provider to product-master lookup behavior.
- Composed Sales Invoice lookup registration in the Sales module with manifest refs aligned to concrete provider IDs without mutating the manifest.
- Used platform `createTransactionGridEngine` and `applyLookupSelection` for the barcode row-fill integration test.

### Debug Log
- Initial targeted test run failed because provider modules did not exist yet and the new Inventory workspace package needed test-time aliasing.
- Added TypeScript and Vitest aliases for `@forge/inventory` and existing Forge workspace imports so tests can resolve workspace packages without requiring a fresh install.
- Typecheck initially rejected frozen fixture arrays as mutable arrays; provider options and fixture exports were tightened to readonly fixture arrays.

### Completion Notes
- Added deterministic customer fixtures and `sales.customer` lookup provider with search, resolve, snapshot-ready values, and validation.
- Added new `@forge/inventory` package with `inventory.product` lookup provider supporting SKU/name/barcode search, exact resolve, product-master enrichment, and save-time validation issue codes.
- Added Sales Invoice lookup registration with directly resolvable provider IDs and a `sales.taxCode` provider.
- Added barcode integration coverage proving barcode fill goes through product provider enrichment and platform lookup selection snapshot metadata.
- Verified with `pnpm test` and `pnpm typecheck`.

## File List
- `_bmad-output/implementation-artifacts/stories/005-sales-customer-product-lookup-providers.md`
- `packages/modules/inventory/package.json`
- `packages/modules/inventory/src/index.ts`
- `packages/modules/inventory/src/lookups/index.ts`
- `packages/modules/inventory/src/lookups/productFixtures.ts`
- `packages/modules/inventory/src/lookups/productLookupProvider.ts`
- `packages/modules/inventory/src/lookups/__tests__/barcodeProductLookup.test.ts`
- `packages/modules/inventory/src/lookups/__tests__/productLookupProvider.test.ts`
- `packages/modules/sales/package.json`
- `packages/modules/sales/src/index.ts`
- `packages/modules/sales/src/lookups/index.ts`
- `packages/modules/sales/src/lookups/customerFixtures.ts`
- `packages/modules/sales/src/lookups/customerLookupProvider.ts`
- `packages/modules/sales/src/lookups/lookupRegistration.ts`
- `packages/modules/sales/src/lookups/__tests__/customerLookupProvider.test.ts`
- `packages/modules/sales/src/lookups/__tests__/salesLookupRegistration.test.ts`
- `pnpm-lock.yaml`
- `tsconfig.json`
- `vitest.config.ts`

## Change Log
- 2026-04-10: Implemented Story 005 Sales customer and Inventory product lookup providers, registration, barcode integration tests, and workspace alias support.
