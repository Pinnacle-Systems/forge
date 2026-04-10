import { describe, it, expect } from 'vitest';
import { aggregateValidations } from '../validation';
import type { ValidationIssue } from '../types';

describe('aggregateValidations', () => {
  it('combines header, row, footer, and crossField issues', () => {
    const r = aggregateValidations({
      headerIssues: [{ id: '1', severity: 'warning', message: 'H1' } as ValidationIssue],
      rowIssues: {
        'row1': [{ id: '2', severity: 'info', message: 'R1' } as ValidationIssue],
        'row2': [{ id: '3', severity: 'error', message: 'R2' } as ValidationIssue],
      },
      footerIssues: [{ id: '4', severity: 'warning', message: 'F1' } as ValidationIssue],
      crossFieldIssues: [{ id: '5', severity: 'info', message: 'C1' } as ValidationIssue],
    });

    expect(r.issues.length).toBe(5);
    expect(r.issues.map(i => i.id)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('sets isValid to false when any error is present', () => {
    const r = aggregateValidations({
      headerIssues: [],
      rowIssues: { 'row1': [{ id: '1', severity: 'error', message: 'E1' } as ValidationIssue] },
      footerIssues: [],
      crossFieldIssues: [],
    });

    expect(r.isValid).toBe(false);
    expect(r.hasWarnings).toBe(false);
  });

  it('sets hasWarnings to true and isValid to true if only warnings are present', () => {
    const r = aggregateValidations({
      headerIssues: [{ id: '1', severity: 'warning', message: 'W1' } as ValidationIssue],
      rowIssues: {},
      footerIssues: [],
      crossFieldIssues: [],
    });

    expect(r.isValid).toBe(true);
    expect(r.hasWarnings).toBe(true);
  });

  it('prioritizes errors over warnings for hasWarnings flag', () => {
    const r = aggregateValidations({
      headerIssues: [{ id: '1', severity: 'warning', message: 'W1' } as ValidationIssue],
      rowIssues: { 'row1': [{ id: '2', severity: 'error', message: 'E1' } as ValidationIssue] },
      footerIssues: [],
      crossFieldIssues: [],
    });

    expect(r.isValid).toBe(false);
    // Even though there are warnings, if isValid=false the warning path is blocked
    expect(r.hasWarnings).toBe(false);
  });

  it('is valid and has no warnings when empty', () => {
    const r = aggregateValidations({
      headerIssues: [],
      rowIssues: {},
      footerIssues: [],
      crossFieldIssues: [],
    });

    expect(r.isValid).toBe(true);
    expect(r.hasWarnings).toBe(false);
    expect(r.issues.length).toBe(0);
  });
});
