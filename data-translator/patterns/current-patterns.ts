import type { SemanticVariable } from "@/types/data-translator";
import { compactHeader, extractUnit, normalizePhase, normalizeSemanticHeader, transformForUnit } from "@/data-translator/parser/header-parser";
import { priorityForField } from "@/data-translator/ontology/priorities";
import { usesForField } from "@/data-translator/ontology/uses";

export function matchCurrentPattern(sourceHeader: string): SemanticVariable | null {
  const compact = compactHeader(sourceHeader);
  const normalized = normalizeSemanticHeader(sourceHeader);
  const unit = extractUnit(sourceHeader) || "A";
  const indexed =
    compact.match(/^ipv(\d+)$/) ??
    compact.match(/^mppt(\d+)current$/) ??
    compact.match(/^mpptcurrent(\d+)$/) ??
    compact.match(/^pvcurrent(\d+)$/);

  if (indexed) {
    const index = Number(indexed[1]);
    const fieldId = "mppt_current";
    return {
      sourceHeader,
      normalizedHeader: normalized,
      displayName: `Corriente FV canal ${index}`,
      fieldId,
      family: "current",
      category: "electrical",
      electricalSide: "dc",
      entity: "mppt",
      measurementType: "channel",
      index,
      sourceUnit: unit,
      standardUnit: "A",
      transform: transformForUnit(unit, "A"),
      priority: priorityForField(fieldId),
      confidence: 0.96,
      required: false,
      uses: usesForField(fieldId),
      patternId: "ipv-indexed",
      status: "auto_detected",
    };
  }

  const phaseCurrent = compact.match(/^iac([rst])$/) ?? compact.match(/^i([abc])$/) ?? compact.match(/^currentl([123])$/);
  if (phaseCurrent) {
    const phase = normalizePhase(phaseCurrent[1]);
    const fieldId = "ac_phase_current";
    return {
      sourceHeader,
      normalizedHeader: normalized,
      displayName: `Corriente AC fase ${phase}`,
      fieldId,
      family: "current",
      category: "quality",
      electricalSide: "ac",
      measurementType: "phase",
      phase,
      sourceUnit: unit,
      standardUnit: "A",
      transform: transformForUnit(unit, "A"),
      priority: priorityForField(fieldId),
      confidence: 0.96,
      required: false,
      uses: usesForField(fieldId),
      patternId: "ac-phase-current",
      status: "auto_detected",
    };
  }

  return null;
}
