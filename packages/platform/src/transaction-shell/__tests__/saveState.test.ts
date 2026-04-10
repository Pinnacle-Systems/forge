import { describe, it, expect, vi } from 'vitest';
import { createTransactionShell } from '../saveState';
import type { TransactionShellOptions } from '../types';
import type { TransactionGridEngine, GridSnapshot } from '../../transaction-grid/types';

function createMockOptions(): TransactionShellOptions {
  const mockSnapshot: GridSnapshot = {
    columns: [],
    rows: [{ id: 'row1', values: {}, metadata: {} as any }],
    mode: 'navigation',
    focus: { rowId: 'row1', columnId: 'col1' }
  };
  
  return {
    gridEngine: {
      getSnapshot: () => mockSnapshot,
    } as unknown as TransactionGridEngine,
    manifest: {} as any,
    validationHooks: {
      row: [],
      save: [],
    },
    saveHandler: vi.fn().mockResolvedValue({ ok: true }),
  };
}

describe('createTransactionShell (Save Lifecycle)', () => {
  it('initializes in idle state', () => {
    const shell = createTransactionShell(createMockOptions());
    expect(shell.getState()).toBe('idle');
  });

  it('transitions to success on successful validation and save', async () => {
    const opts = createMockOptions();
    const shell = createTransactionShell(opts);
    
    const result = await shell.requestSave();
    
    expect(result.status).toBe('saved');
    expect(shell.getState()).toBe('success');
    expect(opts.saveHandler).toHaveBeenCalled();
  });

  it('blocks save and returns to idle when sync validation has errors', async () => {
    const opts = createMockOptions();
    opts.validationHooks.row = [
      () => [{ id: '1', severity: 'error', message: 'Sync error' }]
    ];
    
    const shell = createTransactionShell(opts);
    const result = await shell.requestSave();
    
    expect(result.status).toBe('blocked');
    expect(shell.getState()).toBe('idle');
    expect(shell.getValidationSummary().isValid).toBe(false);
    expect(opts.saveHandler).not.toHaveBeenCalled();
  });

  it('transitions to confirming state when warnings are present', async () => {
    const opts = createMockOptions();
    opts.validationHooks.save = [
      async () => [{ id: '1', severity: 'warning', message: 'Async warning' }]
    ];
    
    const shell = createTransactionShell(opts);
    const result = await shell.requestSave();
    
    expect(result.status).toBe('confirming');
    expect(shell.getState()).toBe('confirming');
    expect(shell.getValidationSummary().hasWarnings).toBe(true);
    expect(opts.saveHandler).not.toHaveBeenCalled(); // Waits for confirm
  });

  it('proceeds from confirming to saving on confirmSave()', async () => {
    const opts = createMockOptions();
    opts.validationHooks.save = [
      async () => [{ id: '1', severity: 'warning', message: 'Async warning' }]
    ];
    
    const shell = createTransactionShell(opts);
    await shell.requestSave(); // Now confirming
    
    const confirmResult = await shell.confirmSave();
    expect(confirmResult.status).toBe('saved');
    expect(shell.getState()).toBe('success');
    expect(opts.saveHandler).toHaveBeenCalled();
  });

  it('clears warnings and returns to idle on cancelSave()', async () => {
    const opts = createMockOptions();
    opts.validationHooks.save = [
      async () => [{ id: '1', severity: 'warning', message: 'Async warning' }]
    ];
    
    const shell = createTransactionShell(opts);
    await shell.requestSave(); // Now confirming
    expect(shell.getState()).toBe('confirming');
    
    shell.cancelSave();
    expect(shell.getState()).toBe('idle');
    expect(shell.getValidationSummary().hasWarnings).toBe(false);
    expect(opts.saveHandler).not.toHaveBeenCalled();
  });

  it('handles saveHandler failure gracefully and transitions to error state', async () => {
    const opts = createMockOptions();
    opts.saveHandler = vi.fn().mockResolvedValue({ ok: false, error: 'Network fail' });
    
    const shell = createTransactionShell(opts);
    const result = await shell.requestSave();
    
    expect(result.status).toBe('failed');
    expect(shell.getState()).toBe('error'); // Error state strictly reserved for saveHandler failure
  });

  it('deterministically ignores duplicate/spam requests during validation or saving', async () => {
    const opts = createMockOptions();
    let resolveSave: any;
    // Induce artificial delay
    opts.saveHandler = vi.fn().mockImplementation(() => new Promise(res => {
      resolveSave = res;
    }));
    
    const shell = createTransactionShell(opts);
    
    // Fire request
    const p1 = shell.requestSave();
    // Fire immediate second request
    const p2 = shell.requestSave();
    
    expect(shell.getState()).toBe('saving'); // It went straight to saving from P1 due to no validation wait natively
    
    // Wait for the duplicate request return
    const result2 = await p2;
    expect(result2.status).toBe('blocked'); // P2 was rejected since P1 holds state 'saving'
    
    resolveSave({ ok: true });
    const result1 = await p1;
    expect(result1.status).toBe('saved');
  });
});
