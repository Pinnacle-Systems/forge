import { describe, expect, it } from 'vitest';
import { CascadeEngine } from '../CascadeEngine';

describe('CascadeEngine', () => {
  it('defaults unspecified rules to preserve', () => {
    const engine = new CascadeEngine();

    const result = engine.apply(
      {
        sourceFieldId: 'lookupField',
        rules: [{ targetFieldId: 'manualOverride' }],
      },
      { manualOverride: 'manual value' },
      { manualOverride: 'incoming value' },
    );

    expect(result).toMatchObject({
      valuesToWrite: {},
      preservedStaleFields: ['manualOverride'],
      prompts: [],
    });
  });

  it('preserve writes into empty targets', () => {
    const engine = new CascadeEngine();

    const result = engine.apply(
      {
        sourceFieldId: 'lookupField',
        rules: [{ targetFieldId: 'dependentValue', mode: 'preserve' }],
      },
      { dependentValue: '' },
      { dependentValue: 'incoming value' },
    );

    expect(result.valuesToWrite).toEqual({ dependentValue: 'incoming value' });
    expect(result.preservedStaleFields).toEqual([]);
  });

  it('reset replaces existing values', () => {
    const engine = new CascadeEngine();

    const result = engine.apply(
      {
        sourceFieldId: 'lookupField',
        rules: [{ targetFieldId: 'dependentValue', mode: 'reset' }],
      },
      { dependentValue: 'manual value' },
      { dependentValue: 'incoming value' },
    );

    expect(result.valuesToWrite).toEqual({ dependentValue: 'incoming value' });
    expect(result.preservedStaleFields).toEqual([]);
  });

  it('reset clears when incoming value is empty', () => {
    const engine = new CascadeEngine();

    const result = engine.apply(
      {
        sourceFieldId: 'lookupField',
        rules: [{ targetFieldId: 'dependentValue', mode: 'reset' }],
      },
      { dependentValue: 'manual value' },
      { dependentValue: undefined },
    );

    expect(result.valuesToClear).toEqual(['dependentValue']);
    expect(result.valuesToWrite).toEqual({});
  });

  it('prompt returns decisions without writing conflicting values', () => {
    const engine = new CascadeEngine();

    const result = engine.apply(
      {
        sourceFieldId: 'lookupField',
        rules: [{ targetFieldId: 'manualOverride', mode: 'prompt' }],
      },
      { manualOverride: 'manual value' },
      { manualOverride: 'incoming value' },
    );

    expect(result.valuesToWrite).toEqual({});
    expect(result.prompts).toEqual([{
      targetFieldId: 'manualOverride',
      mode: 'prompt',
      currentValue: 'manual value',
      incomingValue: 'incoming value',
      action: 'prompt',
      markStale: false,
    }]);
  });
});
