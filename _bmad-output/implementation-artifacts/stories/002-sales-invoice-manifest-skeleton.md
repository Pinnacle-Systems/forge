# Story 002: Sales Invoice Manifest Skeleton

## Status
review

## Goal
Create the module-owned Sales Invoice `TransactionManifest` needed to validate the end-to-end vertical slice through the runtime definition merge engine from Story 001.

## Source of Truth
- `docs/architecture.md`
- `docs/prd.md`
- `spec/modules/sales/sales-invoice.md`
- `spec/platform/manifest-contract.md`
- `spec/platform/instance-config-contract.md`
- `spec/platform/merge-engine.md`
- `spec/platform/lookup-autofill.md`
- `_bmad-output/implementation-artifacts/stories/001-runtime-transaction-definition-contract.md`

## Constraints Applied
- Manifest defines deterministic structure and allowed presentation overrides only.
- Manifest may reference module-owned hooks, but must not implement calculations, validations, lookup providers, cascade logic, persistence, or formulas inline.
- Sales module owns calculations, validations, providers, persistence rules, and future enrichment behavior.
- Instance config may only change properties explicitly granted by each element's `overridePermissions`.
- UI must consume only `ResolvedTransactionDefinition` produced by `mergeTransactionDefinition`; no UI code should read this raw manifest directly.
- Lookup selection, cascade preservation, stale marking, and save-time validation behavior remain out of scope for this story.
- No customer-specific branching or customer-specific manifest variants.
- No spec, ADR, or PRD changes.

## Scope
- Add the Sales module transaction manifest location and naming convention.
- Define Sales Invoice transaction identity and metadata.
- Define header fields: customer lookup, invoice date, reference.
- Define grid columns: product lookup, quantity, unit price, tax code, line total.
- Define footer fields: subtotal, tax total, grand total.
- Reference Sales-owned calculation, validation, lookup provider, and persistence hooks by stable string IDs only.
- Define narrow `overridePermissions` for presentation-only changes needed by the vertical slice.
- Add tests proving the Sales Invoice manifest resolves successfully through Story 001's merge engine.
- Add tests proving instance config cannot alter Sales Invoice business behavior through this manifest/config path.

## Out of Scope
- Implementing calculation functions.
- Implementing lookup providers, lookup registry, barcode lookup, enrichment, cache, or cascade engine.
- Implementing save orchestration or backend validation.
- Building the visible TransactionShell, TransactionGrid, or Sales Invoice UI.
- Adding generalized invoicing features beyond the slice fields listed in the sales spec.

## Dependencies
- Story 001: Runtime Transaction Definition Contract must be complete or available in the current branch.
- Reuse the `TransactionManifest`, `TransactionInstanceConfig`, and `mergeTransactionDefinition` API from `packages/platform/src/runtime-definition`.

## Exact File Structure
Create the Sales module scaffold if it does not already exist:

```text
packages/
  modules/
    sales/
      src/
        transactions/
          salesInvoice.manifest.ts
          index.ts
          __tests__/
            salesInvoice.manifest.test.ts
```

If the repository has an established module layout when implementation starts, keep the same Sales module boundary and adapt these paths to the existing convention. Do not place the Sales Invoice manifest in the platform package or UI package.

## Public API
Export the manifest from the Sales transaction barrel:

```ts
export { salesInvoiceManifest } from './salesInvoice.manifest';
```

The manifest should be imported by tests, registration code, or module assembly code. UI components must continue to consume only resolved definitions.

## Required Manifest Shape
Implement `salesInvoiceManifest` as a `TransactionManifest`:

```ts
export const salesInvoiceManifest: TransactionManifest = {
  transactionType: 'sales.invoice',
  version: '1.0.0',
  title: 'Sales Invoice',
  hooks: {
    calculations: [
      'sales.invoice.calculateLineTotal',
      'sales.invoice.calculateSubtotal',
      'sales.invoice.calculateTaxTotal',
      'sales.invoice.calculateGrandTotal',
    ],
    validations: [
      'sales.invoice.validateCustomer',
      'sales.invoice.validateProduct',
      'sales.invoice.validateDiscontinuedItems',
    ],
    lookupProviders: [
      'sales.customerLookup',
      'inventory.productLookup',
      'sales.taxCodeLookup',
    ],
    persistence: 'sales.invoice.save',
  },
  header: {
    fields: [
      {
        id: 'customer',
        label: 'Customer',
        kind: 'lookup',
        order: 10,
        required: true,
        lookupProviderRef: 'sales.customerLookup',
        validationRefs: ['sales.invoice.validateCustomer'],
        overridePermissions: { label: true, visible: true, required: true, order: true },
      },
      {
        id: 'invoiceDate',
        label: 'Invoice Date',
        kind: 'date',
        order: 20,
        required: true,
        overridePermissions: { label: true, required: true, order: true },
      },
      {
        id: 'reference',
        label: 'Reference',
        kind: 'text',
        order: 30,
        overridePermissions: { label: true, visible: true, order: true },
      },
    ],
  },
  grid: {
    columns: [
      {
        id: 'product',
        label: 'Product',
        kind: 'lookup',
        order: 10,
        required: true,
        lookupProviderRef: 'inventory.productLookup',
        validationRefs: ['sales.invoice.validateProduct'],
        overridePermissions: { label: true, width: true, order: true },
      },
      {
        id: 'quantity',
        label: 'Quantity',
        kind: 'number',
        order: 20,
        required: true,
        overridePermissions: { label: true, width: true, editable: true, required: true, order: true },
      },
      {
        id: 'unitPrice',
        label: 'Unit Price',
        kind: 'currency',
        order: 30,
        required: true,
        overridePermissions: { label: true, width: true, editable: true, order: true },
      },
      {
        id: 'taxCode',
        label: 'Tax Code',
        kind: 'lookup',
        order: 40,
        lookupProviderRef: 'sales.taxCodeLookup',
        overridePermissions: { label: true, width: true, order: true },
      },
      {
        id: 'lineTotal',
        label: 'Line Total',
        kind: 'currency',
        order: 50,
        editable: false,
        calculationRef: 'sales.invoice.calculateLineTotal',
        overridePermissions: { label: true, width: true, visible: true, order: true },
      },
    ],
  },
  footer: {
    fields: [
      {
        id: 'subtotal',
        label: 'Subtotal',
        kind: 'currency',
        order: 10,
        editable: false,
        calculationRef: 'sales.invoice.calculateSubtotal',
        overridePermissions: { label: true, visible: true, order: true },
      },
      {
        id: 'taxTotal',
        label: 'Tax Total',
        kind: 'currency',
        order: 20,
        editable: false,
        calculationRef: 'sales.invoice.calculateTaxTotal',
        overridePermissions: { label: true, visible: true, order: true },
      },
      {
        id: 'grandTotal',
        label: 'Grand Total',
        kind: 'currency',
        order: 30,
        editable: false,
        calculationRef: 'sales.invoice.calculateGrandTotal',
        overridePermissions: { label: true, visible: true, order: true },
      },
    ],
  },
};
```

Adjust only if Story 001's final type names or field names differ. Preserve the same business meaning and contract boundaries.

## Hook Reference Rules
- Calculation hook refs must be listed in `hooks.calculations` before being used by `calculationRef`.
- Validation hook refs must be listed in `hooks.validations` before being used by `validationRefs`.
- Lookup provider refs must be listed in `hooks.lookupProviders` before being used by `lookupProviderRef`.
- `sales.invoice.validateDiscontinuedItems` is a save-time/business validation hook reference only in this story; do not attach implementation logic.
- `sales.invoice.save` is a persistence hook reference only; do not implement persistence.
- Do not add formula strings, expression objects, inline functions, lambdas, or executable callbacks to the manifest.

## Override Permission Policy
Use the narrowest permissions that still support presentation customization:
- Header lookup/date/text fields may allow `label`, `visible` where useful, `required` only for fields that can be optionally relaxed by instance policy, and `order`.
- Grid input columns may allow `label`, `width`, `editable` only where the user can actually edit the value, `required` only where appropriate, and `order`.
- Calculated grid/footer outputs may allow `label`, `width` where applicable, `visible`, and `order`.
- Calculated outputs must not allow `editable: true` unless a later spec explicitly permits manual override of that calculated output.
- No element may grant permissions for business properties such as `calculationRef`, `validationRefs`, `lookupProviderRef`, `cascadeRefs`, `hooks`, `persistence`, `kind`, or `id`.

## Step-by-Step Implementation Tasks
- [x] Create `packages/modules/sales/src/transactions/` and establish `salesInvoice.manifest.ts` as the Sales module transaction manifest naming convention.
- [x] Add `packages/modules/sales/src/transactions/index.ts` that exports `salesInvoiceManifest`.
- [x] Define Sales Invoice transaction identity: `transactionType: 'sales.invoice'`, `version: '1.0.0'`, and `title: 'Sales Invoice'`.
- [x] Add header field definitions for `customer`, `invoiceDate`, and `reference` with stable IDs, labels, kinds, orders, and required flags.
- [x] Add grid column definitions for `product`, `quantity`, `unitPrice`, `taxCode`, and `lineTotal` with stable IDs, labels, kinds, orders, editability, and required flags.
- [x] Add footer summary definitions for `subtotal`, `taxTotal`, and `grandTotal` as calculated, non-editable output fields.
- [x] Add hook references for Sales-owned calculations, validations, lookup providers, and save behavior, using strings only.
- [x] Define narrow `overridePermissions` for presentation-only changes on each manifest element.
- [x] Add merge tests proving `salesInvoiceManifest` resolves successfully with no instance config.
- [x] Add merge tests proving authorized presentation overrides apply without changing hook references.
- [x] Add contract tests proving config cannot alter `calculationRef`, `validationRefs`, `lookupProviderRef`, `hooks.persistence`, `kind`, or `id`.
- [x] Add contract tests proving `lineTotal`, `subtotal`, `taxTotal`, and `grandTotal` remain calculated outputs and cannot be made editable through unauthorized config.
- [x] Document any implementation gap in this story's Dev Agent Record if Story 001's contract lacks a required field or validator behavior.

## Explicit Test Cases
Add tests in `packages/modules/sales/src/transactions/__tests__/salesInvoice.manifest.test.ts`.

### Manifest Resolution
- `mergeTransactionDefinition(salesInvoiceManifest)` returns a `ResolvedTransactionDefinition`.
- Resolved identity equals:
  - `transactionType: 'sales.invoice'`
  - `version: '1.0.0'`
  - `title: 'Sales Invoice'`
- Header field IDs resolve in order: `customer`, `invoiceDate`, `reference`.
- Grid column IDs resolve in order: `product`, `quantity`, `unitPrice`, `taxCode`, `lineTotal`.
- Footer field IDs resolve in order: `subtotal`, `taxTotal`, `grandTotal`.
- Diagnostics are empty for the base manifest.

### Hook Preservation
- Resolved `customer.lookupProviderRef` equals `sales.customerLookup`.
- Resolved `product.lookupProviderRef` equals `inventory.productLookup`.
- Resolved `taxCode.lookupProviderRef` equals `sales.taxCodeLookup`.
- Resolved `lineTotal.calculationRef` equals `sales.invoice.calculateLineTotal`.
- Resolved footer calculation refs equal the manifest-defined subtotal, tax total, and grand total calculation refs.
- Resolved hooks include the calculation, validation, lookup provider, and persistence refs from the manifest.

### Authorized Presentation Overrides
- A valid `TransactionInstanceConfig` may change permitted labels, widths, visibility, required flags, editability, or order based on each target's `overridePermissions`.
- Authorized overrides produce no diagnostics.
- Business hook refs remain unchanged after authorized presentation overrides.

### Business Logic Protection
- Config attempting to change `lineTotal.calculationRef` is ignored with a warning diagnostic.
- Config attempting to change `subtotal`, `taxTotal`, or `grandTotal` calculation refs is ignored with warning diagnostics.
- Config attempting to add or remove `validationRefs` is ignored with a warning diagnostic.
- Config attempting to change `customer.lookupProviderRef`, `product.lookupProviderRef`, or `taxCode.lookupProviderRef` is ignored with warning diagnostics.
- Config attempting to change `hooks.persistence` is ignored with a warning diagnostic.
- Config attempting to change a field `kind` is ignored with a warning diagnostic.
- Config attempting to change an element `id` is ignored with a warning diagnostic.
- Unauthorized config attempting to set `lineTotal.editable: true` is ignored and `lineTotal.editable` remains `false`.
- Unauthorized config attempting to set footer output `editable: true` is ignored and footer outputs remain non-editable.

## Implementation Notes
- Keep this manifest thinner than a business rules object; it should be structure plus stable hook references only.
- Treat `lineTotal`, `subtotal`, `taxTotal`, and `grandTotal` as calculated outputs, never as configurable formulas.
- Preserve manual price override behavior for later calculation/cascade stories by keeping `unitPrice` editable and leaving cascade behavior out of this manifest unless Story 001 already defines a declarative `cascadeRefs` hook reference pattern.
- Prefer stable IDs that match the sales spec terms exactly.
- If Story 001 tests already contain a Sales Invoice fixture, replace fixture-only usage with this real module manifest where appropriate instead of duplicating divergent manifest definitions.
- If no repo test runner exists yet, add the tests in the expected location and record the missing runner as an implementation gap. Do not create unrelated build tooling in this story.

## Risks
- Manifest becomes a hidden business-rules container.
- Instance override permissions are made too broad.
- Sales Invoice grows into a general invoicing framework.
- Test fixtures drift from the real module manifest.

## Acceptance Criteria
- Sales Invoice manifest skeleton exists in the Sales module layer.
- Sales Invoice manifest resolves successfully through `mergeTransactionDefinition`.
- Header, grid, and footer structure match `spec/modules/sales/sales-invoice.md`.
- Calculation, validation, lookup provider, and persistence hooks are referenced but not implemented inline.
- Override permissions are limited to presentation-safe properties.
- Tests verify authorized presentation overrides apply.
- Tests verify disallowed overrides cannot alter Sales Invoice calculations, validations, lookup providers, persistence hook, field IDs, field kinds, or calculated-output editability.
- No specs, ADRs, PRD, or architecture docs are modified.

## Definition of Done
- `packages/modules/sales/src/transactions/salesInvoice.manifest.ts` exists or equivalent existing Sales module path is used.
- Sales transaction barrel exports the manifest.
- Merge tests include the real Sales Invoice manifest.
- Contract tests prove structure is valid and override permissions are narrow.
- Business behavior remains module-owned through hook references only.
- All relevant tests pass, or the exact missing test-runner gap is documented in Dev Agent Record.
- Story status is ready for review after implementation.

## Dev Agent Record

### Constraints Summary
- Apply the two-layer contract: module manifest plus instance config resolves to a UI-safe definition.
- Keep business logic out of manifest and config.
- Keep Sales-specific behavior in hook references owned by the Sales module.
- Fail hard only for invalid manifest; invalid config should warn and continue through the merge engine.

### Implementation Plan
- Reuse Story 001 platform runtime-definition types and merge API.
- Create the Sales module manifest in the module layer.
- Resolve the real manifest in tests instead of relying only on platform fixtures.
- Add business-protection tests around Sales Invoice-specific hooks and calculated outputs.

### Debug Log
- Reused the Story 001 runtime-definition API as implemented in this session.
- Story 001's fixture now re-exports the real Sales module manifest so `sales.taxCodeLookup` and other field assumptions stay canonical.

### Completion Notes
- Implemented the Sales Invoice manifest in the Sales module layer with stable IDs, presentation-only override permissions, and hook references only.
- Added Sales module tests proving the manifest resolves, preserves hook refs, accepts authorized presentation overrides, and rejects business-logic mutation attempts through config.
- No specs, ADRs, PRD, architecture docs, lookup providers, calculations, persistence, or UI code were modified.

### File List
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `vitest.config.ts`
- `packages/modules/sales/package.json`
- `packages/modules/sales/src/index.ts`
- `packages/modules/sales/src/transactions/index.ts`
- `packages/modules/sales/src/transactions/salesInvoice.manifest.ts`
- `packages/modules/sales/src/transactions/__tests__/salesInvoice.manifest.test.ts`
- `packages/platform/src/runtime-definition/__tests__/fixtures/salesInvoiceManifest.fixture.ts`
- `_bmad-output/implementation-artifacts/stories/002-sales-invoice-manifest-skeleton.md`

### Change Log
- 2026-04-10: Refined story into Codex-ready implementation brief with exact file targets, manifest shape, tests, constraints, and Dev Agent Record.
- 2026-04-10: Implemented Sales Invoice manifest skeleton and module tests. Status moved to review.
