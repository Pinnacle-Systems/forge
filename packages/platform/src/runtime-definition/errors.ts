import type { MergeDiagnostic } from './types';

export class ManifestValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid transaction manifest: ${issues.join('; ')}`);
    this.name = 'ManifestValidationError';
    this.issues = issues;
  }
}

export class ConfigValidationWarning extends Error {
  readonly diagnostics: MergeDiagnostic[];

  constructor(diagnostics: MergeDiagnostic[]) {
    super(`Invalid transaction instance config: ${diagnostics.length} warning(s)`);
    this.name = 'ConfigValidationWarning';
    this.diagnostics = diagnostics;
  }
}

export class ConfigVersionMismatchError extends Error {
  readonly diagnostics: MergeDiagnostic[];

  constructor(diagnostics: MergeDiagnostic[]) {
    super(`Transaction instance config targets an incompatible manifest version: ${diagnostics.map((diagnostic) => diagnostic.message).join('; ')}`);
    this.name = 'ConfigVersionMismatchError';
    this.diagnostics = diagnostics;
  }
}
