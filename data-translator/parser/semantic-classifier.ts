import type { SemanticVariable, TranslatorMapping } from "@/types/data-translator";
import { getFieldDefinition } from "@/data-translator/ontology/fields";
import { priorityForField } from "@/data-translator/ontology/priorities";
import { usesForField } from "@/data-translator/ontology/uses";
import { compactHeader, extractUnit, normalizeSemanticHeader, transformForUnit } from "@/data-translator/parser/header-parser";
import { matchSemanticPattern } from "@/data-translator/parser/pattern-matcher";
import { matchSemanticAlias } from "@/data-translator/aliases/semantic-aliases";

const legacyFieldAliases: Record<string, string> = {
  inverterId: "inverter_id",
  voltageDc: "mppt_voltage",
  currentDc: "mppt_current",
  powerDc: "dc_power",
  voltageAcL1: "ac_phase_voltage",
  voltageAcL2: "ac_phase_voltage",
  voltageAcL3: "ac_phase_voltage",
  currentAcL1: "ac_phase_current",
  currentAcL2: "ac_phase_current",
  currentAcL3: "ac_phase_current",
  activePowerKw: "active_power",
  reactivePowerKvar: "reactive_power",
  frequencyHz: "frequency",
  powerFactor: "power_factor",
  irradianceWm2: "irradiance",
  inverterTemperatureC: "inverter_temperature",
};

function unknownSemantic(sourceHeader: string, position?: number): SemanticVariable {
  const normalized = normalizeSemanticHeader(sourceHeader);
  const unit = extractUnit(sourceHeader);
  return {
    source: "inverter_raw",
    sourceHeader,
    normalizedHeader: normalized,
    displayName: "Variable sin asignar",
    fieldId: "unassigned",
    family: "unknown",
    category: "review",
    sourceUnit: unit,
    standardUnit: unit,
    transform: "none",
    priority: "optional",
    confidence: position !== undefined && position < 3 ? 0.35 : 0.25,
    required: false,
    uses: ["Validacion"],
    description: "No se ignora automaticamente; requiere revision del usuario.",
    status: "needs_review",
  };
}

export function semanticFromField(sourceHeader: string, fieldId: string, mapping?: Partial<TranslatorMapping>): SemanticVariable {
  const resolvedFieldId = legacyFieldAliases[fieldId] ?? fieldId;
  const definition = getFieldDefinition(resolvedFieldId);
  if (!definition) return unknownSemantic(sourceHeader);
  const sourceUnit = mapping?.sourceUnit ?? extractUnit(sourceHeader);
  const standardUnit = mapping?.targetUnit || definition.standardUnit || sourceUnit;
  const confidence = mapping?.confidence ?? 0.78;
  return {
    source: mapping?.source ?? "inverter_raw",
    sourceHeader,
    normalizedHeader: normalizeSemanticHeader(sourceHeader),
    displayName: definition.label,
    fieldId: resolvedFieldId,
    family: definition.family,
    category: definition.category,
    electricalSide: definition.electricalSide,
    sourceUnit,
    standardUnit,
    transform: mapping?.transform ?? transformForUnit(sourceUnit, standardUnit),
    priority: priorityForField(fieldId),
    confidence,
    required: mapping?.required ?? priorityForField(fieldId) === "critical",
    uses: usesForField(fieldId),
    description: definition.description,
    patternId: "dictionary-field",
    status: confidence >= 0.75 ? "auto_detected" : "needs_review",
  };
}

export function classifyHeader(sourceHeader: string, position?: number, sampleValue?: string): SemanticVariable {
  const pattern = matchSemanticPattern(sourceHeader);
  if (pattern) {
    const unitBonus = pattern.sourceUnit ? 0.02 : 0;
    const positionBonus = position !== undefined && position <= 2 && ["timestamp", "serial_number", "inverter_id"].includes(pattern.fieldId) ? 0.03 : 0;
    const sampleBonus = sampleValue && /\d/.test(sampleValue) && ["power", "voltage", "current", "energy"].includes(pattern.family) ? 0.01 : 0;
    return { ...pattern, source: pattern.source ?? "inverter_raw", confidence: Math.min(0.99, Number((pattern.confidence + unitBonus + positionBonus + sampleBonus).toFixed(2))) };
  }

  const alias = matchSemanticAlias(sourceHeader);
  if (alias) return { ...alias, source: alias.source ?? "inverter_raw" };

  const compact = compactHeader(sourceHeader);
  const direct: Record<string, string> = {
    time: "timestamp",
    timestamp: "timestamp",
    datetime: "timestamp",
    serialnumber: "serial_number",
    serial: "serial_number",
    sn: "serial_number",
    devicename: "inverter_id",
    inverter: "inverter_id",
    inverterid: "inverter_id",
    manufacturer: "manufacturer",
    model: "model",
    firmware: "firmware",
    frequency: "frequency",
    frequencyhz: "frequency",
    pf: "power_factor",
    powerfactor: "power_factor",
  };

  const fieldId = direct[compact];
  if (fieldId) return semanticFromField(sourceHeader, fieldId, { confidence: 0.9 });
  return unknownSemantic(sourceHeader, position);
}

export function mappingFromSemantic(semantic: SemanticVariable): TranslatorMapping {
  return {
    source: semantic.source ?? "inverter_raw",
    sourceHeader: semantic.sourceHeader,
    normalizedSourceHeader: semantic.normalizedHeader,
    targetField: semantic.fieldId,
    sourceUnit: semantic.sourceUnit ?? "",
    targetUnit: semantic.standardUnit ?? "",
    transform: semantic.transform,
    required: semantic.required,
    confidence: semantic.confidence,
    semantic,
  };
}

export function detailForSemantic(semantic: SemanticVariable) {
  const parts = [semantic.family, semantic.electricalSide, semantic.entity, semantic.measurementType]
    .filter(Boolean)
    .map((part) => String(part).replaceAll("_", " "));
  if (semantic.index) parts.push(`canal ${semantic.index}`);
  if (semantic.phase) parts.push(`fase ${semantic.phase}`);
  if (semantic.phaseFrom && semantic.phaseTo) parts.push(`${semantic.phaseFrom}-${semantic.phaseTo}`);
  return parts.join(" / ");
}
