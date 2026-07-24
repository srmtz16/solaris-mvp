import type {
  ColumnMatchMethod,
  DetectedTranslatorMetadata,
  FileType,
  ManualMappingDraft,
  RawProcessedColumnMatch,
  SheetPreview,
  TemplateMatch,
  TemplateScope,
  TranslatorEntityType,
  TranslatorMapping,
  TranslatorMeasurementType,
  TranslatorTemplate,
} from "@/types/data-translator";
import { classifyHeader, mappingFromSemantic, semanticFromField } from "@/data-translator/parser/semantic-classifier";
import { profileColumns } from "@/data-translator/parser/data-profiler";
import { applyParameterizedRule } from "@/data-translator/rules/progressive-rules";

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

export const transformOptions = ["none", "trim", "number", "parseDate", "wToKw", "kwToW", "whToKwh", "varToKvar", "percentToDecimal"];

export const transformLabels: Record<string, string> = {
  none: "Sin conversion",
  trim: "Limpiar texto",
  number: "Convertir a numero",
  parseDate: "Normalizar fecha",
  wToKw: "Convertir W a kW",
  kwToW: "Convertir kW a W",
  whToKwh: "Convertir Wh a kWh",
  varToKvar: "Convertir var a kVAr",
  percentToDecimal: "Convertir porcentaje",
};

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
  const dataRows = stringRows.slice(headerRow + 1);
  return {
    name,
    rows: stringRows,
    headerRow,
    headers,
    normalizedHeaders: headers.map(normalizeHeader),
    columnProfiles: profileColumns(headers, dataRows),
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

function parseNumber(value: string) {
  const numeric = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function inferManufacturerFromText(text: string) {
  const clean = text.toLowerCase();
  if (clean.includes("huawei") || clean.includes("sun2000")) return "Huawei";
  if (clean.includes("growatt") || clean.includes("max")) return "Growatt";
  if (clean.includes("solis") || clean.includes("ginlong")) return "Solis";
  if (clean.includes("fronius")) return "Fronius";
  if (clean.includes("sma")) return "SMA";
  return undefined;
}

function inferMeasurementType(header: string, unit = ""): TranslatorMeasurementType {
  const clean = normalizeHeader(`${header} ${unit}`);
  if (/power-factor|pf/.test(clean)) return "powerFactor";
  if (/irradiance|irradiancia|w-m2|w-m/.test(clean)) return "irradiance";
  if (/freq|frequency|hz/.test(clean)) return "frequency";
  if (/temp|temperatura/.test(clean)) return "temperature";
  if (/energy|energia|yield|kwh|wh/.test(clean)) return "energy";
  if (/power|potencia|kw|kvar|var|pac|ppv/.test(clean)) return "power";
  if (/current|corriente|amp|iac|ipv|istr/.test(clean) || unit.toLowerCase() === "a") return "current";
  if (/voltage|voltaje|vac|vpv|vstr/.test(clean) || unit.toLowerCase() === "v") return "voltage";
  return "other";
}

function inferElectricalSide(header: string): "DC" | "AC" | undefined {
  const clean = normalizeHeader(header);
  if (/mppt|string|str|pv|dc|vpv|ipv|ppv/.test(clean)) return "DC";
  if (/ac|grid|fase|phase|l1|l2|l3|vac|iac|pac|fac|freq|pf/.test(clean)) return "AC";
  return undefined;
}

function inferEntityType(header: string): TranslatorEntityType | undefined {
  const clean = normalizeHeader(header);
  if (/mppt|pv/.test(clean)) return "mppt";
  if (/string|str/.test(clean)) return "string";
  if (/phase|fase|l1|l2|l3/.test(clean)) return "phase";
  if (/meter|medidor|grid/.test(clean)) return "meter";
  if (/inverter|inversor|serial|sn/.test(clean)) return "inverter";
  if (/plant|planta/.test(clean)) return "plant";
  return undefined;
}

function inferPhase(header: string): "L1" | "L2" | "L3" | undefined {
  const clean = normalizeHeader(header);
  if (/l1|phase-a|fase-a|r-phase|phase-r/.test(clean)) return "L1";
  if (/l2|phase-b|fase-b|s-phase|phase-s/.test(clean)) return "L2";
  if (/l3|phase-c|fase-c|t-phase|phase-t/.test(clean)) return "L3";
  return undefined;
}

function inferIndex(header: string) {
  return Number(header.match(/(?:mppt|pv|string|str|phase|fase|l)\s*_?-?(\d+)/i)?.[1]) || undefined;
}

function profileSimilarity(raw: SheetPreview, processed: SheetPreview, rawIndex: number, processedIndex: number) {
  const rawRows = raw.rows.slice(raw.headerRow + 1, raw.headerRow + 80).map((row) => parseNumber(row[rawIndex])).filter((value): value is number => value !== null);
  const processedRows = processed.rows.slice(processed.headerRow + 1, processed.headerRow + 80).map((row) => parseNumber(row[processedIndex])).filter((value): value is number => value !== null);
  const rawProfile = raw.columnProfiles?.[rawIndex];
  const processedProfile = processed.columnProfiles?.[processedIndex];
  let score = 0;
  if (rawRows.length && processedRows.length) {
    const rawAvg = rawRows.reduce((sum, value) => sum + value, 0) / rawRows.length;
    const processedAvg = processedRows.reduce((sum, value) => sum + value, 0) / processedRows.length;
    const ratio = Math.min(Math.abs(rawAvg), Math.abs(processedAvg)) / Math.max(Math.abs(rawAvg), Math.abs(processedAvg), 1);
    score += ratio * 0.45;
  }
  if (rawProfile?.candidateFamily && rawProfile.candidateFamily === processedProfile?.candidateFamily) score += 0.25;
  if (rawProfile?.detectedUnit && rawProfile.detectedUnit === processedProfile?.detectedUnit) score += 0.2;
  if (rawProfile?.possibleCumulative === processedProfile?.possibleCumulative) score += 0.1;
  return Math.min(score, 1);
}

export function detectWorkbookMetadata({ fileName, sheet }: { fileName: string; sheet: SheetPreview }): DetectedTranslatorMetadata {
  const haystack = [fileName, sheet.name, ...sheet.headers, ...sheet.rows.slice(0, 6).flat()].join(" ");
  const manufacturer = inferManufacturerFromText(haystack);
  const model = haystack.match(/\b(?:SUN2000|MAX|MIN|MID|S5|S6|SolisCloud|Fronius)\s*[-A-Z0-9]*/i)?.[0]?.trim();
  const powerCapacityKw = Number(haystack.match(/(\d+(?:\.\d+)?)\s*(?:kw|kW)/)?.[1]) || undefined;
  const inverter = haystack.match(/\b(?:INV|SN|Serial|Inverter|Inversor)[\s:_-]*([A-Z0-9-]{5,})/i)?.[1];
  const period = sheet.rows
    .slice(sheet.headerRow + 1, sheet.headerRow + 8)
    .flat()
    .find((value) => /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(value));
  const timezone = /utc|gmt/i.test(haystack) ? haystack.match(/(?:UTC|GMT)\s*[+-]?\d{0,2}:?\d{0,2}/i)?.[0] : undefined;
  const exportType = /daily|diario/i.test(haystack) ? "Daily export" : /telemetry|historical|historico|hist/i.test(haystack) ? "Historical telemetry" : "Inverter export";
  return {
    manufacturer,
    model,
    powerCapacityKw,
    inverter,
    period,
    timezone,
    exportType,
    columnStructure: `${sheet.headers.length} columnas / encabezado fila ${sheet.headerRow + 1}`,
    detectedFrom: ["nombre de archivo", "nombre de hoja", "encabezados", "primeras filas"],
  };
}

export function compareRawProcessedColumns(rawSheet: SheetPreview, processedSheet: SheetPreview): RawProcessedColumnMatch[] {
  return rawSheet.headers
    .map((rawHeader, rawIndex) => {
      const normalizedRawHeader = normalizeHeader(rawHeader);
      const rawUnit = rawSheet.columnProfiles?.[rawIndex]?.detectedUnit ?? "";
      const rawMeasurement = inferMeasurementType(rawHeader, rawUnit);
      const candidates = processedSheet.headers.map((processedHeader, processedIndex) => {
        const normalizedProcessedHeader = normalizeHeader(processedHeader);
        const processedUnit = processedSheet.columnProfiles?.[processedIndex]?.detectedUnit ?? "";
        const headerScore = tokenSimilarity(normalizedRawHeader, normalizedProcessedHeader);
        const unitScore = rawUnit && processedUnit && rawUnit === processedUnit ? 1 : 0;
        const valueScore = profileSimilarity(rawSheet, processedSheet, rawIndex, processedIndex);
        const processedMeasurement = inferMeasurementType(processedHeader, processedUnit);
        const measurementScore = rawMeasurement === processedMeasurement ? 1 : 0;
        const score = Math.round((headerScore * 0.38 + valueScore * 0.32 + unitScore * 0.16 + measurementScore * 0.14) * 100);
        return { processedHeader, processedIndex, normalizedProcessedHeader, processedUnit, score, headerScore, valueScore, unitScore };
      });
      const best = candidates.sort((first, second) => second.score - first.score)[0];
      const method: ColumnMatchMethod = best.headerScore >= 0.78 ? "header" : best.valueScore >= 0.55 ? "value_similarity" : best.unitScore ? "unit_pattern" : "manual";
      const electricalSide = inferElectricalSide(`${rawHeader} ${best.processedHeader}`);
      const entityType = inferEntityType(`${rawHeader} ${best.processedHeader}`);
      const entityIndex = inferIndex(`${rawHeader} ${best.processedHeader}`);
      return {
        id: `${normalizedRawHeader || "raw"}-${rawIndex}`,
        rawHeader,
        processedHeader: best.score >= 35 ? best.processedHeader : "",
        normalizedRawHeader,
        normalizedProcessedHeader: best.score >= 35 ? best.normalizedProcessedHeader : "",
        rawIndex,
        processedIndex: best.score >= 35 ? best.processedIndex : -1,
        score: best.score,
        method: best.score >= 35 ? method : "manual",
        unit: rawUnit || best.processedUnit,
        electricalSide,
        measurementType: inferMeasurementType(`${rawHeader} ${best.processedHeader}`, rawUnit || best.processedUnit),
        entityType,
        entityIndex,
        mpptIndex: entityType === "mppt" ? entityIndex : undefined,
        stringIndex: entityType === "string" ? entityIndex : undefined,
        phase: inferPhase(`${rawHeader} ${best.processedHeader}`),
        notes: best.score >= 35 ? `Header ${Math.round(best.headerScore * 100)}%, valores ${Math.round(best.valueScore * 100)}%, unidad ${Math.round(best.unitScore * 100)}%.` : "Sin coincidencia confiable; requiere correccion manual.",
      };
    })
    .sort((first, second) => second.score - first.score);
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
  const templateMappings = sheet.headers.map((header, index): ManualMappingDraft => {
    const normalized = normalizeHeader(header);
    const best = template.mappings
      .map((mapping) => ({
        mapping,
        score: tokenSimilarity(normalized, mapping.normalizedSourceHeader),
      }))
      .sort((first, second) => second.score - first.score)[0];

    if (best && best.score >= 0.55) {
      const semantic =
        best.mapping.semantic ??
        semanticFromField(header, best.mapping.targetField, {
          ...best.mapping,
          confidence: Math.max(best.mapping.confidence, Number(best.score.toFixed(2))),
        });
      return {
        ...best.mapping,
        id: `${normalized || "column"}-${index}`,
        sourceHeader: header,
        normalizedSourceHeader: normalized,
        targetField: semantic.fieldId,
        sourceUnit: semantic.sourceUnit ?? best.mapping.sourceUnit,
        targetUnit: semantic.standardUnit ?? best.mapping.targetUnit,
        transform: semantic.transform,
        required: semantic.required,
        confidence: Math.max(best.mapping.confidence, Number(best.score.toFixed(2))),
        semantic: { ...semantic, sourceHeader: header, normalizedHeader: normalized },
      };
    }

    const profile = sheet.columnProfiles?.[index];
    const semantic = classifyHeader(header, index, sheet.rows[sheet.headerRow + 1]?.[index]);
    const profiledSemantic = profile
      ? {
          ...semantic,
          sourceUnit: semantic.sourceUnit || profile.detectedUnit,
          index: semantic.index ?? profile.possibleIndex,
          family: semantic.family === "unknown" && profile.candidateFamily ? profile.candidateFamily : semantic.family,
          measurementType: semantic.measurementType ?? (profile.possibleCumulative ? "cumulative" : profile.detectedTypes.includes("instantaneous") ? "instantaneous" : undefined),
          inferenceReasons: [
            ...(semantic.inferenceReasons ?? []),
            `Tipo detectado: ${profile.detectedTypes.join(", ")}`,
            profile.possibleCumulative ? "Comportamiento mayormente acumulativo" : "Comportamiento instantaneo o no monotono",
          ],
        }
      : semantic;
    return {
      ...mappingFromSemantic(profiledSemantic),
      id: `${normalized || "column"}-${index}`,
      semantic: profiledSemantic,
    };
  });
  return (template.parameterizedRules ?? []).reduce(
    (current, rule) => applyParameterizedRule({ mappings: current, rule, allowOverwriteConfirmed: false }).mappings,
    templateMappings,
  );
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
  parameterizedRules = [],
  rawSheet,
  processedSheet,
  metadata,
  rawProcessedMatches = [],
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
  parameterizedRules?: TranslatorTemplate["parameterizedRules"];
  rawSheet?: SheetPreview | null;
  processedSheet?: SheetPreview | null;
  metadata?: DetectedTranslatorMetadata | null;
  rawProcessedMatches?: RawProcessedColumnMatch[];
}): TranslatorTemplate {
  const safeId = `${manufacturer}-${model}-${name}-${version}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const activeMappings: TranslatorMapping[] = mappings
    .filter((mapping) => mapping.semantic.status !== "ignored" && mapping.targetField !== "ignore" && mapping.targetField !== "unassigned")
    .map((mapping) => ({
      sourceHeader: mapping.sourceHeader,
      normalizedSourceHeader: normalizeHeader(mapping.sourceHeader),
      sourceHeaderRaw: rawProcessedMatches.find((match) => match.processedHeader === mapping.sourceHeader)?.rawHeader,
      normalizedSourceHeaderRaw: rawProcessedMatches.find((match) => match.processedHeader === mapping.sourceHeader)?.normalizedRawHeader,
      processedHeader: mapping.sourceHeader,
      normalizedProcessedHeader: normalizeHeader(mapping.sourceHeader),
      targetField: mapping.semantic.fieldId,
      electricalSide: mapping.semantic.electricalSide === "dc" ? "DC" : mapping.semantic.electricalSide === "ac" ? "AC" : rawProcessedMatches.find((match) => match.processedHeader === mapping.sourceHeader)?.electricalSide,
      measurementType: (mapping.semantic.measurementType as TranslatorMeasurementType | undefined) ?? rawProcessedMatches.find((match) => match.processedHeader === mapping.sourceHeader)?.measurementType,
      sourceUnit: mapping.semantic.sourceUnit ?? "",
      targetUnit: mapping.semantic.standardUnit ?? "",
      entityType: rawProcessedMatches.find((match) => match.processedHeader === mapping.sourceHeader)?.entityType,
      entityIndex: mapping.semantic.index ?? rawProcessedMatches.find((match) => match.processedHeader === mapping.sourceHeader)?.entityIndex,
      mpptIndex: rawProcessedMatches.find((match) => match.processedHeader === mapping.sourceHeader)?.mpptIndex,
      stringIndex: rawProcessedMatches.find((match) => match.processedHeader === mapping.sourceHeader)?.stringIndex,
      phase: rawProcessedMatches.find((match) => match.processedHeader === mapping.sourceHeader)?.phase,
      transform: mapping.semantic.transform,
      required: mapping.semantic.required,
      confidence: Number(mapping.semantic.confidence.toFixed(2)),
      matchMethod: rawProcessedMatches.find((match) => match.processedHeader === mapping.sourceHeader)?.method ?? "template",
      notes: rawProcessedMatches.find((match) => match.processedHeader === mapping.sourceHeader)?.notes,
      semantic: mapping.semantic,
    }));

  return {
    templateId: `solaris-${scope}-${safeId || "mapping"}-${Date.now()}`,
    name,
    manufacturer,
    model,
    powerCapacityKw: metadata?.powerCapacityKw,
    fileType,
    sheetName: sheet.name,
    sheetNameRaw: rawSheet?.name,
    sheetNameProcessed: processedSheet?.name ?? sheet.name,
    headerRow: sheet.headerRow + 1,
    headerRowRaw: rawSheet ? rawSheet.headerRow + 1 : undefined,
    headerRowProcessed: processedSheet ? processedSheet.headerRow + 1 : sheet.headerRow + 1,
    dateFormat: "yyyy-MM-dd HH:mm:ss",
    timezone: metadata?.timezone ?? "America/Mexico_City",
    version,
    confidence: 0.78,
    formatSignature: buildFormatSignature(sheetNames, sheet),
    detectedMetadata: metadata ?? undefined,
    scope,
    exportType,
    anonymizedSample: Object.fromEntries(sheet.headers.slice(0, 6).map((header) => [header, "<anon>"])),
    mappings: activeMappings,
    parameterizedRules,
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
