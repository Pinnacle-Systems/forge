import { describe, expect, it } from 'vitest';
import { createTransactionGridEngine } from '../../transaction-grid';
import { applyLookupSelection } from '../applyLookupSelection';
import { fixtureResult } from './fixtures/lookupProviders.fixture';
import { lookupRuntimeColumns } from './fixtures/lookupRows.fixture';

function activePhantoms(snapshot: ReturnType<ReturnType<typeof createTransactionGridEngine>['getSnapshot']>) {
  return snapshot.rows.filter((row) => row.metadata.isPhantom && row.state !== 'deleted');
}

describe('applyLookupSelection', () => {
  it('writes lookup field values and snapshot metadata through the grid engine', () => {
    const engine = createTransactionGridEngine({
      columns: lookupRuntimeColumns,
      rows: [{ lookupField: 'old-value' }],
    });
    const rowId = engine.getSnapshot().rows[0].id;

    const result = applyLookupSelection({
      engine,
      selection: {
        providerId: 'fixture.entity',
        fieldId: 'lookupField',
        rowId,
        result: fixtureResult,
      },
    });

    const row = engine.getSnapshot().rows[0];
    expect(result.applied).toBe(true);
    expect(row.values).toMatchObject({
      lookupField: 'entity-1',
      description: 'Resolved description',
      dependentValue: 'incoming dependent',
      manualOverride: 'incoming manual',
    });
    expect(row.metadata.lookupSnapshots.lookupField).toEqual({
      providerRef: 'fixture.entity',
      entityId: 'entity-1',
      label: 'Entity One',
      values: fixtureResult.values,
      capturedAtRevision: 0,
    });
    expect(row.metadata.autofill.description).toEqual({
      sourceColumnId: 'lookupField',
      mode: 'lookup',
    });
  });

  it('marks preserved manual overrides as stale and does not overwrite them', () => {
    const engine = createTransactionGridEngine({
      columns: lookupRuntimeColumns,
      rows: [{
        lookupField: 'old-value',
        manualOverride: 'manual value',
      }],
    });
    const rowId = engine.getSnapshot().rows[0].id;

    applyLookupSelection({
      engine,
      selection: {
        providerId: 'fixture.entity',
        fieldId: 'lookupField',
        rowId,
        result: fixtureResult,
        cascadePlan: {
          sourceFieldId: 'lookupField',
          rules: [{ targetFieldId: 'manualOverride' }],
        },
      },
    });

    const row = engine.getSnapshot().rows[0];
    expect(row.values.manualOverride).toBe('manual value');
    expect(row.metadata.stale.manualOverride).toEqual({
      sourceColumnId: 'lookupField',
      reason: 'preserved-manual-override',
    });
    expect(row.metadata.autofill.manualOverride).toEqual({
      sourceColumnId: 'lookupField',
      mode: 'cascade',
      preservedManualOverride: true,
    });
  });

  it('resets cascade fields when reset mode is explicit', () => {
    const engine = createTransactionGridEngine({
      columns: lookupRuntimeColumns,
      rows: [{
        lookupField: 'old-value',
        manualOverride: 'manual value',
      }],
    });
    const rowId = engine.getSnapshot().rows[0].id;

    applyLookupSelection({
      engine,
      selection: {
        providerId: 'fixture.entity',
        fieldId: 'lookupField',
        rowId,
        result: fixtureResult,
        cascadePlan: {
          sourceFieldId: 'lookupField',
          rules: [{ targetFieldId: 'manualOverride', mode: 'reset' }],
        },
      },
    });

    expect(engine.getSnapshot().rows[0].values.manualOverride).toBe('incoming manual');
  });

  it('returns prompt decisions without overwriting conflicting prompt fields', () => {
    const engine = createTransactionGridEngine({
      columns: lookupRuntimeColumns,
      rows: [{
        lookupField: 'old-value',
        manualOverride: 'manual value',
      }],
    });
    const rowId = engine.getSnapshot().rows[0].id;

    const result = applyLookupSelection({
      engine,
      selection: {
        providerId: 'fixture.entity',
        fieldId: 'lookupField',
        rowId,
        result: fixtureResult,
        cascadePlan: {
          sourceFieldId: 'lookupField',
          rules: [{ targetFieldId: 'manualOverride', mode: 'prompt' }],
        },
      },
    });

    expect(engine.getSnapshot().rows[0].values.manualOverride).toBe('manual value');
    expect(result.cascade.prompts).toEqual([{
      targetFieldId: 'manualOverride',
      mode: 'prompt',
      currentValue: 'manual value',
      incomingValue: 'incoming manual',
      action: 'prompt',
      markStale: false,
    }]);
  });

  it('preserves the one-phantom-row invariant after selection on the phantom row', () => {
    const engine = createTransactionGridEngine({
      columns: lookupRuntimeColumns,
      createRowId: () => 'replacement-phantom',
    });
    const rowId = engine.getSnapshot().focus.rowId;

    applyLookupSelection({
      engine,
      selection: {
        providerId: 'fixture.entity',
        fieldId: 'lookupField',
        rowId,
        result: fixtureResult,
      },
    });

    const snapshot = engine.getSnapshot();
    expect(snapshot.rows.find((row) => row.id === rowId)).toMatchObject({
      state: 'new',
      metadata: { isPhantom: false },
    });
    expect(activePhantoms(snapshot)).toHaveLength(1);
    expect(activePhantoms(snapshot)[0].id).toBe('replacement-phantom');
  });

  it('ignores selections captured for an older row generation', () => {
    const engine = createTransactionGridEngine({
      columns: lookupRuntimeColumns,
      rows: [{ lookupField: 'old-value' }],
    });
    const rowId = engine.getSnapshot().rows[0].id;

    engine.applyExternalRowUpdate(rowId, {
      values: { description: 'newer local value' },
      reason: 'external-update',
      generation: 0,
    });

    const result = applyLookupSelection({
      engine,
      selection: {
        providerId: 'fixture.entity',
        fieldId: 'lookupField',
        rowId,
        result: fixtureResult,
        capturedGeneration: 0,
      },
    });

    expect(result).toMatchObject({
      applied: false,
      diagnostics: [{
        severity: 'warning',
        code: 'STALE_LOOKUP_RESPONSE_IGNORED',
        providerId: 'fixture.entity',
        rowId,
      }],
    });
    expect(engine.getSnapshot().rows[0].values.description).toBe('newer local value');
  });
});
