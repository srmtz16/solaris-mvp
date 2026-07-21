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

export type VisualizationCategory = "AC" | "MPPT" | "Strings" | "Energy" | "Temperature" | "Operation" | "Other";

export type VisualizationMeasurement = "voltage" | "current" | "power" | "energy" | "frequency" | "power_factor" | "temperature" | "status" | "unknown";

export type VisualizationInterval = "original" | "1m" | "5m" | "10m" | "15m" | "30m" | "60m" | "1d";

export type VisualizationAggregation = "automatic" | "mean" | "min" | "max" | "sum" | "last" | "first";

export type NormalizedVariable = {
  fieldId: string;
  sourceHeader: string;
  standardHeader?: string;
  displayName: string;
  category: VisualizationCategory;
  entityType?: string;
  entityIndex?: number;
  measurement: VisualizationMeasurement;
  unit: string;
  dataType: "number" | "string" | "date";
  defaultAggregation: Exclude<VisualizationAggregation, "automatic">;
  visualizable: boolean;
  searchTerms: string[];
  quality: "alta" | "media" | "revisar";
  color: string;
  columnIndex: number;
  profile?: ColumnDataProfile;
};

export type AnalysisSheetEvidence = {
  sourceSheet: string;
  range: string;
  sourceColumn?: string;
  formulaPattern?: string;
};

export type VisualizationTemplate = {
  templateId: string;
  viewName: string;
  viewType: "time_series";
  sourceSheet: string;
  category: VisualizationCategory | "Free";
  xAxisField: string;
  defaultSeries: string[];
  availableGroups: string[];
  allowMixedMeasurements: boolean;
  multiAxisByUnit: boolean;
  defaultInterval: VisualizationInterval;
  defaultAggregation: VisualizationAggregation;
  evidence: AnalysisSheetEvidence[];
};

export type SavedVisualizationView = {
  id: string;
  name: string;
  variables: string[];
  interval: VisualizationInterval;
  aggregation: VisualizationAggregation;
  dateStart?: string;
  dateEnd?: string;
  timeStart?: string;
  timeEnd?: string;
  axisMode: "auto_by_unit" | "normalized" | "separate_panels";
  order: string[];
  chartType: "line";
  createdAt: string;
};
