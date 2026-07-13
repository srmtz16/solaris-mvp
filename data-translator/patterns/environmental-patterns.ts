import type { SemanticVariable } from "@/types/data-translator";
import { compactHeader, extractUnit, normalizeSemanticHeader, transformForUnit } from "@/data-translator/parser/header-parser";
import { priorityForField } from "@/data-translator/ontology/priorities";
import { usesForField } from "@/data-translator/ontology/uses";

export function matchEnvironmentalPattern(sourceHeader: string): SemanticVariable | null {
  const compact = compactHeader(sourceHeader);
  const normalized = normalizeSemanticHeader(sourceHeader);
  const unit = extractUnit(sourceHeader);
  const fieldId = compact.includes("irradiance") ? "irradiance" : compact.includes("temperature") || compact === "temp" ? "inverter_temperature" : "";
  if (!fieldId) return null;

  return {
    sourceHeader,
    normalizedHeader: normalized,
    displayName: fieldId === "irradiance" ? "Irradiancia" : "Temperatura del inversor",
    fieldId,
    family: "environment",
    category: fieldId === "irradiance" ? "weather" : "thermal",
    entity: fieldId === "irradiance" ? "sensor" : "inverter",
    sourceUnit: unit || (fieldId === "irradiance" ? "W/m2" : "C"),
    standardUnit: fieldId === "irradiance" ? "W/m2" : "C",
    transform: transformForUnit(unit, fieldId === "irradiance" ? "W/m2" : "C"),
    priority: priorityForField(fieldId),
    confidence: 0.88,
    required: false,
    uses: usesForField(fieldId),
    patternId: fieldId,
    status: "auto_detected",
  };
}
