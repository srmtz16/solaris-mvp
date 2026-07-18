export type TemplateScope = "official" | "private" | "custom";

export type FileType = "csv" | "xls" | "xlsx";

export type SemanticFamily =
  | "identification"
  | "energy"
  | "power"
  | "voltage"
  | "current"
  | "power_quality"
  | "environment"
  | "operation"
  | "unknown";

export type ElectricalSide = "dc" | "ac" | "grid" | "none";

export type SemanticPriority = "critical" | "important" | "complementary" | "optional" | "ignore";

export type SemanticStatus = "auto_detected" | "needs_review" | "confirmed" | "unassigned" | "ignored";

export type DetectedDataType =
  | "integer"
  | "float"
  | "string"
  | "boolean"
  | "date"
  | "datetime"
  | "categorical"
  | "identifier"
  | "cumulative"
  | "instantaneous";

export type RuleScope = "current_file" | "manufacturer" | "manufacturer_model" | "global";

export type RuleStatus = "draft" | "validated" | "suggested";

export type RuleCreatedBy = "system" | "user" | "ai";

export type SemanticVariable = {
  sourceHeader: string;
  normalizedHeader: string;
  displayName: string;
  fieldId: string;
  family: SemanticFamily;
  category?: string;
  electricalSide?: ElectricalSide;
  entity?: string;
  measurementType?: string;
  index?: number;
  phase?: string;
  phaseFrom?: string;
  phaseTo?: string;
  sourceUnit?: string;
  standardUnit?: string;
  transform: string;
  priority: SemanticPriority;
  confidence: number;
  required: boolean;
  uses: string[];
  description?: string;
  patternId?: string;
  status: SemanticStatus;
  inferenceReasons?: string[];
};

export type ColumnDataProfile = {
  sourceHeader: string;
  normalizedHeader: string;
  detectedTypes: DetectedDataType[];
  nullRatio: number;
  min?: number;
  max?: number;
  average?: number;
  averageIncrement?: number;
  monotonicity?: number;
  cardinality: number;
  detectedUnit?: string;
  possibleCumulative: boolean;
  possibleIndex?: number;
  candidateFamily?: SemanticFamily;
};

export type ParameterizedRule = {
  id: string;
  name: string;
  manufacturer: string;
  modelScope: string | null;
  sourcePattern: string;
  displayPattern: string;
  targetField: string;
  family: SemanticFamily;
  electricalSide?: ElectricalSide;
  entity?: string;
  indexCaptureGroup: number;
  detectedUnit: string;
  standardUnit: string;
  conversion: string;
  importance: SemanticPriority;
  measurementType?: string;
  status: RuleStatus;
  scope: RuleScope;
  createdBy: RuleCreatedBy;
  createdAt: string;
  updatedAt: string;
};

export type RulePreviewMatch = {
  mappingIndex: number;
  sourceHeader: string;
  suggestedField: string;
  displayName: string;
  entity?: string;
  index: number;
  unit: string;
  confidence: number;
  action: "apply" | "skip" | "conflict";
  conflictReason?: string;
};

export type RelatedFamilySuggestion = {
  id: string;
  label: string;
  sourcePattern: string;
  displayPattern: string;
  targetField: string;
  family: SemanticFamily;
  electricalSide?: ElectricalSide;
  entity?: string;
  standardUnit: string;
  conversion: string;
  matches: RulePreviewMatch[];
};

export type RuleProposal = {
  baseMappingIndex: number;
  baseHeader: string;
  rule: ParameterizedRule;
  confidence: number;
  copiedConfiguration: SemanticVariable;
  matches: RulePreviewMatch[];
  relatedSuggestions: RelatedFamilySuggestion[];
  conflicts: RulePreviewMatch[];
};

export type TranslatorAuditEntry = {
  id: string;
  action: "manual_save" | "rule_proposed" | "batch_apply" | "rule_saved" | "undo";
  baseHeader: string;
  ruleId?: string;
  ruleScope?: RuleScope;
  confirmedBy: string;
  affectedHeaders: string[];
  previousValues: ManualMappingDraft[];
  nextValues: ManualMappingDraft[];
  createdAt: string;
};

export type TranslatorMapping = {
  sourceHeader: string;
  normalizedSourceHeader: string;
  targetField: string;
  sourceUnit: string;
  targetUnit: string;
  transform: string;
  required: boolean;
  confidence: number;
  semantic?: SemanticVariable;
};

export type TranslatorTemplate = {
  templateId: string;
  name: string;
  manufacturer: string;
  model: string;
  fileType: FileType;
  sheetName: string;
  headerRow: number;
  dateFormat: string;
  timezone: string;
  version: string;
  confidence: number;
  formatSignature: string;
  scope: TemplateScope;
  exportType?: string;
  anonymizedSample?: Record<string, string | number | null>;
  mappings: TranslatorMapping[];
  parameterizedRules?: ParameterizedRule[];
};

export type SheetPreview = {
  name: string;
  rows: string[][];
  headerRow: number;
  headers: string[];
  normalizedHeaders: string[];
  columnProfiles?: ColumnDataProfile[];
};

export type TemplateMatch = {
  template: TranslatorTemplate;
  score: number;
  matchedHeaders: number;
  totalTemplateHeaders: number;
  totalFileHeaders: number;
};

export type ManualMappingDraft = TranslatorMapping & {
  id: string;
  semantic: SemanticVariable;
};
