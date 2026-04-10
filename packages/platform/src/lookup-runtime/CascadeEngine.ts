import type { GridValue, TransactionElementId } from '../transaction-grid';
import type {
  CascadeDecision,
  CascadePlan,
  CascadeResult,
} from './types';

export class CascadeEngine {
  apply(
    plan: CascadePlan | undefined,
    currentValues: Record<TransactionElementId, GridValue>,
    incomingValues: Record<TransactionElementId, GridValue>,
  ): CascadeResult {
    const result: CascadeResult = {
      valuesToWrite: {},
      valuesToClear: [],
      preservedStaleFields: [],
      prompts: [],
    };

    if (!plan) {
      return result;
    }

    for (const rule of plan.rules) {
      const mode = rule.mode ?? 'preserve';
      const targetFieldId = rule.targetFieldId;
      const currentValue = currentValues[targetFieldId];
      const incomingValue = incomingValues[targetFieldId];
      const currentEmpty = isEmptyGridValue(currentValue);
      const incomingEmpty = isEmptyGridValue(incomingValue);
      const differs = !Object.is(currentValue, incomingValue);

      if (mode === 'reset') {
        if (incomingEmpty) {
          result.valuesToClear.push(targetFieldId);
        } else {
          result.valuesToWrite[targetFieldId] = clone(incomingValue);
        }
        continue;
      }

      if (mode === 'prompt' && !currentEmpty && differs) {
        result.prompts.push(createDecision(
          targetFieldId,
          mode,
          currentValue,
          incomingValue,
          'prompt',
          false,
        ));
        continue;
      }

      if (mode === 'preserve' && !currentEmpty && differs) {
        result.preservedStaleFields.push(targetFieldId);
        continue;
      }

      if (!incomingEmpty) {
        result.valuesToWrite[targetFieldId] = clone(incomingValue);
      } else if (mode === 'prompt' && currentEmpty) {
        result.valuesToClear.push(targetFieldId);
      }
    }

    return result;
  }
}

function createDecision(
  targetFieldId: TransactionElementId,
  mode: 'prompt',
  currentValue: GridValue,
  incomingValue: GridValue,
  action: 'prompt',
  markStale: boolean,
): CascadeDecision {
  return {
    targetFieldId,
    mode,
    currentValue: clone(currentValue),
    incomingValue: clone(incomingValue),
    action,
    markStale,
  };
}

function isEmptyGridValue(value: GridValue): boolean {
  return value === undefined || value === null || value === '';
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
