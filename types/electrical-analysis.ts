export type ElectricalFamily = "voltage" | "current" | "power" | "power_factor" | "frequency" | "energy" | "other";
export type ElectricalPhase = "A" | "B" | "C" | "AB" | "BC" | "CA" | "combined" | "none";
export type ReadingQuality = "valid" | "retransmission" | "invalid";
export type AggregationMinutes = 0 | 5 | 15 | 30 | 60;
export type Sensitivity = "low" | "normal" | "high";

export type ImportIssue = {
  id: string;
  severity: "info" | "warning" | "error";
  message: string;
  column?: string;
};

export type ImportedColumn = {
  index: number;
  sourceHeader: string;
  targetId: string;
  displayName: string;
  family: ElectricalFamily;
  phase: ElectricalPhase;
  sourceUnit: string;
  standardUnit: string;
  multiplier: number;
  recognized: boolean;
};

export type NormalizedReading = {
  sourceFile: string;
  timestamp: string;
  deviceId: string;
  variableId: string;
  sourceHeader: string;
  displayName: string;
  family: ElectricalFamily;
  phase: ElectricalPhase;
  value: number;
  rawValue: number;
  unit: string;
  sourceUnit: string;
  quality: ReadingQuality;
  sourceRow: number;
};

export type ImportedDataset = {
  fileName: string;
  fileNames: string[];
  sheetName: string;
  headerRow: number;
  timezone: string;
  metadata: Record<string, string>;
  columns: ImportedColumn[];
  issues: ImportIssue[];
  readings: NormalizedReading[];
  rowCount: number;
  validRowCount: number;
  retransmissionCount: number;
  invalidRowCount: number;
  intervalMinutes: number;
  start: string;
  end: string;
};

export type AnalysisFilters = {
  start: string;
  end: string;
  deviceIds: string[];
  families: ElectricalFamily[];
  phases: ElectricalPhase[];
  variableIds: string[];
  includeRetransmissions: boolean;
  aggregationMinutes: AggregationMinutes;
};

export type PatternEvidence = {
  metric: string;
  observed: number;
  baseline?: number;
  unit?: string;
  detail: string;
};

export type AdaptivePattern = {
  id: string;
  kind: "gap" | "outlier" | "sudden_change" | "imbalance" | "flatline" | "counter_reset" | "baseline_deviation";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  recommendation: string;
  start: string;
  end: string;
  variableIds: string[];
  phases: ElectricalPhase[];
  evidence: PatternEvidence[];
};

export type AnalysisSummary = {
  start: string;
  end: string;
  readingCount: number;
  validRowCount: number;
  intervalMinutes: number;
  maxPowerKw: number | null;
  averagePowerKw: number | null;
  periodEnergyKwh: number | null;
  averagePowerFactor: number | null;
  phaseBalancePercent: number | null;
  patternCount: number;
};

export type ChartDatum = {
  timestamp: string;
  label: string;
  [variableId: string]: string | number | null;
};
