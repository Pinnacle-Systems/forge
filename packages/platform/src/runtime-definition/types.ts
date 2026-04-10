export type TransactionElementId = string;
export type HookRef = string;

export type OverrideProperty =
  | 'visible'
  | 'label'
  | 'width'
  | 'editable'
  | 'required'
  | 'order';

export type OverridePermissions = Partial<Record<OverrideProperty, boolean>>;

export type BusinessLogicOverrideProperty =
  | 'calculationRef'
  | 'validationRefs'
  | 'lookupProviderRef'
  | 'cascadeRefs'
  | 'hooks'
  | 'persistence'
  | 'kind'
  | 'id';

export type DiagnosticProperty =
  | OverrideProperty
  | BusinessLogicOverrideProperty
  | (string & {});

export type FieldKind =
  | 'text'
  | 'date'
  | 'number'
  | 'currency'
  | 'lookup';

export type MergeDiagnosticSeverity = 'warning';

export interface MergeDiagnostic {
  severity: MergeDiagnosticSeverity;
  code:
    | 'UNKNOWN_TARGET'
    | 'UNKNOWN_OVERRIDE_PROPERTY'
    | 'OVERRIDE_NOT_PERMITTED'
    | 'BUSINESS_LOGIC_OVERRIDE_IGNORED'
    | 'INVALID_OVERRIDE_VALUE';
  targetId?: TransactionElementId;
  property?: DiagnosticProperty;
  message: string;
}

export interface BaseManifestElement {
  id: TransactionElementId;
  label: string;
  visible?: boolean;
  editable?: boolean;
  required?: boolean;
  order?: number;
  overridePermissions?: OverridePermissions;
}

export interface ManifestField extends BaseManifestElement {
  kind: FieldKind;
  width?: number;
  lookupProviderRef?: HookRef;
  calculationRef?: HookRef;
  validationRefs?: HookRef[];
}

export interface ManifestGridColumn extends ManifestField {
  cascadeRefs?: HookRef[];
}

export interface ManifestFooterField extends BaseManifestElement {
  kind: 'currency' | 'number';
  calculationRef?: HookRef;
}

export type ManifestElementIndex = Record<
  TransactionElementId,
  ManifestField | ManifestGridColumn | ManifestFooterField
>;

export interface TransactionManifest {
  transactionType: string;
  version: string;
  title: string;
  header: {
    fields: ManifestField[];
  };
  grid: {
    columns: ManifestGridColumn[];
  };
  footer: {
    fields: ManifestFooterField[];
  };
  hooks?: {
    calculations?: HookRef[];
    validations?: HookRef[];
    lookupProviders?: HookRef[];
    persistence?: HookRef;
  };
}

export interface InstanceOverride {
  visible?: boolean;
  label?: string;
  width?: number;
  editable?: boolean;
  required?: boolean;
  order?: number;
}

export interface TransactionInstanceConfig {
  transactionType: string;
  overrides?: Record<TransactionElementId, InstanceOverride>;
}

export interface ResolvedField {
  id: TransactionElementId;
  label: string;
  kind: FieldKind;
  visible: boolean;
  editable: boolean;
  required: boolean;
  order: number;
  width?: number;
  lookupProviderRef?: HookRef;
  calculationRef?: HookRef;
  validationRefs: HookRef[];
}

export interface ResolvedGridColumn extends ResolvedField {
  cascadeRefs: HookRef[];
}

export interface ResolvedFooterField {
  id: TransactionElementId;
  label: string;
  kind: 'currency' | 'number';
  visible: boolean;
  editable: boolean;
  required: boolean;
  order: number;
  calculationRef?: HookRef;
}

export interface ResolvedTransactionDefinition {
  transactionType: string;
  version: string;
  title: string;
  header: {
    fields: ResolvedField[];
  };
  grid: {
    columns: ResolvedGridColumn[];
  };
  footer: {
    fields: ResolvedFooterField[];
  };
  hooks: {
    calculations: HookRef[];
    validations: HookRef[];
    lookupProviders: HookRef[];
    persistence?: HookRef;
  };
  diagnostics: MergeDiagnostic[];
}
