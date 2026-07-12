import type {
  FileType,
  ManualMappingDraft,
  SheetPreview,
  TemplateMatch,
  TemplateScope,
  TranslatorMapping,
  TranslatorTemplate,
} from "@/types/data-translator";

export const targetFields = [
  "timestamp",
  "plantId",
  "inverterId",
  "voltageDc",
  "currentDc",
  "powerDc",
  "voltageAcL1",
  "voltageAcL2",
  "voltageAcL3",
  "currentAcL1",
  "currentAcL2",
  "currentAcL3",
  "activePowerKw",
  "reactivePowerKvar",
  "frequencyHz",
  "powerFactor",
  "irradianceWm2",
  "inverterTemperatureC",
  "ignore",
];

export const transformOptions = ["none", "trim", "number", "parseDate", "wToKw", "kwToW", "percentToDecimal"];

export function normalizeHeader(header: string) {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function inferFileType(fileName: string): FileType {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "xls") return "xls";
  if (extension === "xlsx") return "xlsx";
  return "csv";
}

export function locateHeaderRow(rows: string[][]) {
  let bestIndex = 0;
  let bestScore = -1;

  rows.slice(0, 20).forEach((row, index) => {
    const filled = row.map((cell) => String(cell ?? "").trim()).filter(Boolean);
    const normalized = new Set(filled.map(normalizeHeader).filter(Boolean));
    const keywordHits = Array.from(normalized).filter((header) =>
      ["time", "date", "timestamp", "power", "voltage", "current", "serial", "device", "inverter"].some((keyword) => header.includes(keyword)),
    ).length;
    const score = normalized.size * 2 + keywordHits * 3;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

export function buildSheetPreview(name: string, rows: unknown[][]): SheetPreview {
  const stringRows = rows.map((row) => row.map((cell) => String(cell ?? "").trim()));
  const headerRow = locateHeaderRow(stringRows);
  const headers = (stringRows[headerRow] ?? []).filter(Boolean);
  return {
    name,
    rows: stringRows.slice(0, 8),
    headerRow,
    headers,
    normalizedHeaders: headers.map(normalizeHeader),
  };
}

export function buildFormatSignature(sheetNames: string[], sheet: SheetPreview) {
  const sheetPart = sheetNames.map((name) => normalizeHeader(name)).join(",");
  return `sheets:${sheetPart}|active:${normalizeHeader(sheet.name)}|cols:${sheet.headers.length}|headers:${sheet.normalizedHeaders.join(",")}`;
}

function tokenSimilarity(source: string, target: string) {
  if (source === target) return 1;
  if (source.includes(target) || target.includes(source)) return 0.82;
  const sourceTokens = new Set(source.split("-").filter(Boolean));
  const targetTokens = new Set(target.split("-").filter(Boolean));
  const intersection = Array.from(sourceTokens).filter((token) => targetTokens.has(token)).length;
  const union = new Set([...sourceTokens, ...targetTokens]).size;
  return union ? intersection / union : 0;
}

export function compareTemplate(template: TranslatorTemplate, sheet: SheetPreview): TemplateMatch {
  const fileHeaders = sheet.normalizedHeaders;
  const templateHeaders = template.mappings.map((mapping) => mapping.normalizedSourceHeader);
  let weightedScore = 0;
  let possibleScore = 0;
  let matchedHeaders = 0;

  template.mappings.forEach((mapping) => {
    const weight = mapping.required ? 1.4 : 1;
    const best = Math.max(...fileHeaders.map((header) => tokenSimilarity(header, mapping.normalizedSourceHeader)), 0);
    weightedScore += best * weight;
    possibleScore += weight;
    if (best >= 0.75) matchedHeaders += 1;
  });

  const overlapBonus = Math.min(1, matchedHeaders / Math.max(templateHeaders.length, 1));
  const score = Math.round(((weightedScore / Math.max(possibleScore, 1)) * 0.86 + overlapBonus * 0.14) * 100);

  return {
    template,
    score,
    matchedHeaders,
    totalTemplateHeaders: templateHeaders.length,
    totalFileHeaders: fileHeaders.length,
  };
}

export function rankTemplates(templates: TranslatorTemplate[], sheet: SheetPreview) {
  return templates.map((template) => compareTemplate(template, sheet)).sort((first, second) => second.score - first.score);
}

export function applyTemplate(template: TranslatorTemplate, sheet: SheetPreview): ManualMappingDraft[] {
  return sheet.headers.map((header, index) => {
    const normalized = normalizeHeader(header);
    const best = template.mappings
      .map((mapping) => ({
        mapping,
        score: tokenSimilarity(normalized, mapping.normalizedSourceHeader),
      }))
      .sort((first, second) => second.score - first.score)[0];

    return {
      id: `${normalized || "column"}-${index}`,
      sourceHeader: header,
      normalizedSourceHeader: normalized,
      targetField: best && best.score >= 0.55 ? best.mapping.targetField : "ignore",
      sourceUnit: best && best.score >= 0.55 ? best.mapping.sourceUnit : "",
      targetUnit: best && best.score >= 0.55 ? best.mapping.targetUnit : "",
      transform: best && best.score >= 0.55 ? best.mapping.transform : "none",
      required: Boolean(best && best.score >= 0.75 && best.mapping.required),
      confidence: best ? Number(best.score.toFixed(2)) : 0,
    };
  });
}

export function createTemplateFromMappings({
  name,
  manufacturer,
  model,
  exportType,
  version,
  scope,
  fileType,
  sheet,
  sheetNames,
  mappings,
}: {
  name: string;
  manufacturer: string;
  model: string;
  exportType: string;
  version: string;
  scope: TemplateScope;
  fileType: FileType;
  sheet: SheetPreview;
  sheetNames: string[];
  mappings: ManualMappingDraft[];
}): TranslatorTemplate {
  const safeId = `${manufacturer}-${model}-${name}-${version}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const activeMappings: TranslatorMapping[] = mappings
    .filter((mapping) => mapping.targetField !== "ignore")
    .map((mapping) => ({
      sourceHeader: mapping.sourceHeader,
      normalizedSourceHeader: normalizeHeader(mapping.sourceHeader),
      targetField: mapping.targetField,
      sourceUnit: mapping.sourceUnit,
      targetUnit: mapping.targetUnit,
      transform: mapping.transform,
      required: mapping.required,
      confidence: Number(mapping.confidence.toFixed(2)),
    }));

  return {
    templateId: `solaris-${scope}-${safeId || "mapping"}-${Date.now()}`,
    name,
    manufacturer,
    model,
    fileType,
    sheetName: sheet.name,
    headerRow: sheet.headerRow + 1,
    dateFormat: "yyyy-MM-dd HH:mm:ss",
    timezone: "America/Mexico_City",
    version,
    confidence: 0.78,
    formatSignature: buildFormatSignature(sheetNames, sheet),
    scope,
    exportType,
    anonymizedSample: Object.fromEntries(sheet.headers.slice(0, 6).map((header) => [header, "<anon>"])),
    mappings: activeMappings,
  };
}

export function downloadJson(fileName: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
