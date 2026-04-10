import { describe, expect, it } from 'vitest';
import { createTransactionGridEngine } from '../../transaction-grid';
import { applyLookupSelection } from '../applyLookupSelection';
import { runLookupRequest } from '../runLookupRequest';
import type { LookupProvider, LookupResult } from '../types';
import { lookupRuntimeColumns } from './fixtures/lookupRows.fixture';

describe('lookup runtime generation token protection', () => {
  it('ignores out-of-order async resolve response after row generation changes', async () => {
    const engine = createTransactionGridEngine({
      columns: lookupRuntimeColumns,
      rows: [{ lookupField: 'old-value' }],
    });
    const rowId = engine.getSnapshot().rows[0].id;
    const provider = createDeferredResolveProvider();
    const request = {
      entityId: 'entity-1',
      context: {
        rowId,
        fieldId: 'lookupField',
        generation: 0,
      },
    };

    const pending = runLookupRequest({
      provider,
      operation: 'resolve',
      request,
      getCurrentGeneration: () => engine.getSnapshot().rows[0].metadata.generation,
    });

    engine.applyExternalRowUpdate(rowId, {
      values: { lookupField: 'newer-value' },
      reason: 'external-update',
      generation: 0,
    });
    provider.resolveDeferred({
      entityId: 'entity-1',
      values: { lookupField: 'stale-value' },
    });

    const result = await pending;

    expect(result).toMatchObject({
      operation: 'resolve',
      applied: false,
      diagnostics: [{
        severity: 'warning',
        code: 'STALE_LOOKUP_RESPONSE_IGNORED',
        providerId: 'fixture.entity',
        rowId,
      }],
    });
    expect(engine.getSnapshot().rows[0].values.lookupField).toBe('newer-value');
  });

  it('allows current-generation response to apply through lookup selection', async () => {
    const engine = createTransactionGridEngine({
      columns: lookupRuntimeColumns,
      rows: [{ lookupField: 'old-value' }],
    });
    const rowId = engine.getSnapshot().rows[0].id;
    const provider = createDeferredResolveProvider();
    const pending = runLookupRequest({
      provider,
      operation: 'resolve',
      request: {
        entityId: 'entity-1',
        context: {
          rowId,
          fieldId: 'lookupField',
          generation: 0,
        },
      },
      getCurrentGeneration: () => engine.getSnapshot().rows[0].metadata.generation,
    });

    provider.resolveDeferred({
      entityId: 'entity-1',
      label: 'Entity One',
      values: {
        lookupField: 'entity-1',
        description: 'current response',
      },
    });
    const result = await pending;

    expect(result.applied).toBe(true);
    expect(result.operation).toBe('resolve');

    if (result.operation === 'resolve' && result.result) {
      applyLookupSelection({
        engine,
        selection: {
          providerId: provider.id,
          fieldId: 'lookupField',
          rowId,
          result: result.result,
          capturedGeneration: 0,
        },
      });
    }

    expect(engine.getSnapshot().rows[0].values.description).toBe('current response');
  });

  it('ignores stale async enrich response after row generation changes', async () => {
    const engine = createTransactionGridEngine({
      columns: lookupRuntimeColumns,
      rows: [{ lookupField: 'old-value' }],
    });
    const rowId = engine.getSnapshot().rows[0].id;
    const provider = createDeferredEnrichProvider();
    const pending = runLookupRequest({
      provider,
      operation: 'enrich',
      request: {
        entityId: 'entity-1',
        snapshotValues: { lookupField: 'entity-1' },
        context: {
          rowId,
          fieldId: 'lookupField',
          generation: 0,
        },
      },
      getCurrentGeneration: () => engine.getSnapshot().rows[0].metadata.generation,
    });

    engine.applyExternalRowUpdate(rowId, {
      values: { description: 'newer value' },
      reason: 'external-update',
      generation: 0,
    });
    provider.resolveDeferred({ description: 'stale enrich value' });

    const result = await pending;

    expect(result).toEqual({
      operation: 'enrich',
      applied: false,
      values: {},
      diagnostics: [{
        severity: 'warning',
        code: 'STALE_LOOKUP_RESPONSE_IGNORED',
        providerId: 'fixture.entity',
        rowId,
        message: `Stale lookup response ignored for row: ${rowId}`,
      }],
    });
    expect(engine.getSnapshot().rows[0].values.description).toBe('newer value');
  });

  it('ignores stale queued external update after an active edit commits', () => {
    const engine = createTransactionGridEngine({
      columns: lookupRuntimeColumns,
      rows: [{ lookupField: 'old-value' }],
    });
    const rowId = engine.getSnapshot().rows[0].id;

    engine.beginEdit();
    engine.updateEditBuffer('manual-value');

    applyLookupSelection({
      engine,
      selection: {
        providerId: 'fixture.entity',
        fieldId: 'lookupField',
        rowId,
        capturedGeneration: 0,
        result: {
          entityId: 'entity-1',
          values: { lookupField: 'queued-value' },
        },
      },
    });
    engine.drainEvents();
    engine.commitEdit();

    expect(engine.getSnapshot().rows[0].values.lookupField).toBe('manual-value');
    expect(engine.drainEvents()).toEqual([
      { type: 'cellCommitted', rowId, columnId: 'lookupField', value: 'manual-value' },
      { type: 'validationRequested', scope: 'cell', rowId, columnId: 'lookupField' },
      { type: 'staleExternalUpdateIgnored', rowId },
    ]);
  });
});

interface DeferredResolveProvider extends LookupProvider {
  resolveDeferred(result: LookupResult): void;
}

interface DeferredEnrichProvider extends LookupProvider {
  resolveDeferred(values: Record<string, string>): void;
}

function createDeferredResolveProvider(): DeferredResolveProvider {
  let resolveDeferred: (result: LookupResult) => void = () => undefined;

  return {
    id: 'fixture.entity',
    resolveDeferred(result: LookupResult): void {
      resolveDeferred(result);
    },
    async search() {
      return [];
    },
    resolve() {
      return new Promise<LookupResult>((resolve) => {
        resolveDeferred = resolve;
      });
    },
    async validate() {
      return {
        valid: true,
        issues: [],
      };
    },
  };
}

function createDeferredEnrichProvider(): DeferredEnrichProvider {
  let resolveDeferred: (values: Record<string, string>) => void = () => undefined;

  return {
    id: 'fixture.entity',
    resolveDeferred(values: Record<string, string>): void {
      resolveDeferred(values);
    },
    async search() {
      return [];
    },
    async resolve() {
      return undefined;
    },
    enrich() {
      return new Promise<Record<string, string>>((resolve) => {
        resolveDeferred = resolve;
      });
    },
    async validate() {
      return {
        valid: true,
        issues: [],
      };
    },
  };
}
