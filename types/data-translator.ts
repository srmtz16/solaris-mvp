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
};

export type SheetPreview = {
  name: string;
  rows: string[][];
  headerRow: number;
  headers: string[];
  normalizedHeaders: string[];
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
