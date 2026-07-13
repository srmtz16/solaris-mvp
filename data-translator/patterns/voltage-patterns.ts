import type { SemanticVariable } from "@/types/data-translator";
import { compactHeader, extractUnit, normalizePhase, normalizeSemanticHeader, transformForUnit } from "@/data-translator/parser/header-parser";
import { priorityForField } from "@/data-translator/ontology/priorities";
import { usesForField } from "@/data-translator/ontology/uses";

export function matchVoltagePattern(sourceHeader: string): SemanticVariable | null {
  const compact = compactHeader(sourceHeader);
  const normalized = normalizeSemanticHeader(sourceHeader);
  const unit = extractUnit(sourceHeader) || "V";
  const indexed =
    compact.match(/^vpv(\d+)$/) ??
    compact.match(/^mppt(\d+)voltage$/) ??
    compact.match(/^mpptvoltage(\d+)$/) ??
    compact.match(/^pvvoltage(\d+)$/);

  if (indexed) {
    const index = Number(indexed[1]);
    const fieldId = "mppt_voltage";
    return {
      sourceHeader,
      normalizedHeader: normalized,
      displayName: `Voltaje FV canal ${index}`,
      fieldId,
      family: "voltage",
      category: "electrical",
      electricalSide: "dc",
      entity: "mppt",
      measurementType: "channel",
      index,
      sourceUnit: unit,
      standardUnit: "V",
      transform: transformForUnit(unit, "V"),
      priority: priorityForField(fieldId),
      confidence: 0.96,
      required: false,
      uses: usesForField(fieldId),
      patternId: "vpv-indexed",
      status: "auto_detected",
    };
  }

  const line = compact.match(/^vac([rstl123abc])([rstl123abc])$/) ?? compact.match(/^v([abc])([abc])$/) ?? compact.match(/^voltagel([123])l([123])$/);
  if (line) {
    const phaseFrom = normalizePhase(line[1]);
    const phaseTo = normalizePhase(line[2]);
    const fieldId = "ac_line_voltage";
    return {
      sourceHeader,
      normalizedHeader: normalized,
      displayName: `Voltaje AC entre fases ${phaseFrom}-${phaseTo}`,
      fieldId,
      family: "voltage",
      category: "quality",
      electricalSide: "ac",
      measurementType: "line_to_line",
      phaseFrom,
      phaseTo,
      sourceUnit: unit,
      standardUnit: "V",
      transform: transformForUnit(unit, "V"),
      priority: priorityForField(fieldId),
      confidence: 0.98,
      required: false,
      uses: usesForField(fieldId),
      patternId: "ac-line-voltage",
      status: "auto_detected",
    };
  }

  const phaseNeutral = compact.match(/^vac([rst])$/) ?? compact.match(/^v([abc])n$/) ?? compact.match(/^voltagel([123])n$/);
  if (phaseNeutral) {
    const phase = normalizePhase(phaseNeutral[1]);
    const fieldId = "ac_phase_voltage";
    return {
      sourceHeader,
      normalizedHeader: normalized,
      displayName: `Voltaje AC fase ${phase}-N`,
      fieldId,
      family: "voltage",
      category: "quality",
      electricalSide: "ac",
      measurementType: "phase_to_neutral",
      phase,
      sourceUnit: unit,
      standardUnit: "V",
      transform: transformForUnit(unit, "V"),
      priority: priorityForField(fieldId),
      confidence: 0.94,
      required: false,
      uses: usesForField(fieldId),
      patternId: "ac-phase-voltage",
      status: "auto_detected",
    };
  }

  return null;
}
