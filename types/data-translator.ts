export type TemplateScope = "official" | "private" | "custom";

export type FileType = "csv" | "xls" | "xlsx";

export type TranslatorMapping = {
  sourceHeader: string;
  normalizedSourceHeader: string;
  targetField: string;
  sourceUnit: string;
  targetUnit: string;
  transform: string;
  required: boolean;
  confidence: number;
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
};
