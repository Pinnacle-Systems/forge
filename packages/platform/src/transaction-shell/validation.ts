import type { ValidationIssue, ValidationSummary } from './types';

export function aggregateValidations(input: {
  headerIssues: ValidationIssue[];
  rowIssues: Record<string, ValidationIssue[]>; // rowId -> issues
  footerIssues: ValidationIssue[];
  crossFieldIssues: ValidationIssue[];
}): ValidationSummary {
  const issues: ValidationIssue[] = [
    ...(input.headerIssues || []),
    ...Object.values(input.rowIssues || {}).flat(),
    ...(input.footerIssues || []),
    ...(input.crossFieldIssues || []),
  ];

  const hasErrors = issues.some(issue => issue.severity === 'error');
  const hasWarnings = issues.some(issue => issue.severity === 'warning');

  return {
    isValid: !hasErrors,
    hasWarnings: !hasErrors && hasWarnings,
    issues,
  };
}
