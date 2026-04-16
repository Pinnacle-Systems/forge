import type {
  SaveLifecycleState,
  SaveRequestResult,
  SaveValidationContext,
  TransactionShell,
  TransactionShellOptions,
  ValidationIssue,
  ValidationSummary,
} from './types';

import { aggregateValidations } from './validation';

export function createTransactionShell(options: TransactionShellOptions): TransactionShell {
  let state: SaveLifecycleState = 'idle';
  let validationSummary: ValidationSummary = { isValid: true, hasWarnings: false, issues: [] };
  const subscribers: Set<(state: SaveLifecycleState) => void> = new Set();
  const getHeaderValues = () => options.getHeaderValues?.() ?? {};

  const setState = (newState: SaveLifecycleState) => {
    state = newState;
    subscribers.forEach(sub => sub(state));
  };

  const executeSave = async (): Promise<SaveRequestResult> => {
    setState('saving');
    // Extract everything for the save context
    const snapshot = options.gridEngine.getSnapshot();
    const saveContext: SaveValidationContext = {
      manifest: options.manifest,
      headerValues: getHeaderValues(),
      rows: snapshot.rows,
    };

    try {
      const result = await options.saveHandler(saveContext);
      if (result.ok) {
        setState('success');
        return { status: 'saved' };
      } else {
        setState('error');
        return { status: 'failed' };
      }
    } catch (e) {
      setState('error');
      return { status: 'failed' };
    }
  };

  const validateAndRouteSave = async (): Promise<SaveRequestResult> => {
    setState('validating');

    // 1. Sync validations
    const snapshot = options.gridEngine.getSnapshot();
    const headerValues = getHeaderValues();
    const headerIssues = options.validationHooks.header
      ? options.validationHooks.header.flatMap((hook) => hook({
        manifest: options.manifest,
        headerValues,
      }))
      : [];
    const rowIssues: Record<string, ValidationIssue[]> = {};
    
    if (options.validationHooks.row) {
      for (const row of snapshot.rows) {
        rowIssues[row.id] = [];
        for (const hook of options.validationHooks.row) {
           rowIssues[row.id].push(...hook({
             row,
             manifest: options.manifest,
             headerValues,
           }));
        }
      }
    }

    const saveContext: SaveValidationContext = {
      manifest: options.manifest,
      headerValues,
      rows: snapshot.rows,
    };
    const footerIssues = options.validationHooks.footer
      ? options.validationHooks.footer.flatMap((hook) => hook(saveContext))
      : [];
    const crossFieldIssues = options.validationHooks.crossField
      ? options.validationHooks.crossField.flatMap((hook) => hook(saveContext))
      : [];

    validationSummary = aggregateValidations({
      headerIssues,
      rowIssues,
      footerIssues,
      crossFieldIssues,
    });

    if (!validationSummary.isValid) {
      setState('idle');
      return { status: 'blocked' };
    }

    // 2. Async validations
    if (options.validationHooks.save) {
      for (const asyncHook of options.validationHooks.save) {
        const issues = await asyncHook(saveContext);
        validationSummary.issues.push(...issues);
      }

      // Re-aggregate after async evaluations
      const hasErrors = validationSummary.issues.some(req => req.severity === 'error');
      const hasWarnings = validationSummary.issues.some(req => req.severity === 'warning');
      validationSummary.isValid = !hasErrors;
      validationSummary.hasWarnings = !hasErrors && hasWarnings;

      if (!validationSummary.isValid) {
        setState('idle');
        return { status: 'blocked' };
      }
    }

    // 3. Evaluate policies
    if (validationSummary.hasWarnings) {
      setState('confirming');
      return { status: 'confirming' };
    }

    // No warnings or errors
    return await executeSave();
  };

  const requestSave = async (): Promise<SaveRequestResult> => {
    // Deterministically ignore duplicate/active requests
    if (state === 'validating' || state === 'saving') {
      return { status: 'blocked' }; // Could be 'ignored', but 'blocked' fits the return type representing inability to proceed
    }
    if (state === 'success') {
      return { status: 'saved' };
    }
    return await validateAndRouteSave();
  };

  return {
    getState: () => state,
    getValidationSummary: () => validationSummary,
    requestSave,
    confirmSave: async () => {
      if (state !== 'confirming') {
         return { status: 'blocked' };
      }
      return await executeSave();
    },
    cancelSave: () => {
      // Return to idle, preserving only non-warning state (or simply resetting warnings so user can fix)
      if (state === 'confirming') {
        validationSummary.issues = validationSummary.issues.filter(i => i.severity !== 'warning');
        validationSummary.hasWarnings = false;
        setState('idle');
      }
    },
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    }
  };
}
