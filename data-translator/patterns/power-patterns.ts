import type { SemanticVariable } from "@/types/data-translator";
import { compactHeader, extractUnit, normalizeSemanticHeader, transformForUnit } from "@/data-translator/parser/header-parser";
import { priorityForField } from "@/data-translator/ontology/priorities";
import { usesForField } from "@/data-translator/ontology/uses";

export function matchPowerPattern(sourceHeader: string): SemanticVariable | null {
  const compact = compactHeader(sourceHeader);
  const normalized = normalizeSemanticHeader(sourceHeader);
  const unit = extractUnit(sourceHeader);
  const indexed =
    compact.match(/^ppv(\d+)$/) ??
    compact.match(/^pvpower(\d+)$/) ??
    compact.match(/^mppt(\d+)power$/) ??
    compact.match(/^mpptpower(\d+)$/);

  if (indexed) {
    const index = Number(indexed[1]);
    const fieldId = "dc_input_power";
    return {
      sourceHeader,
      normalizedHeader: normalized,
      displayName: `Potencia FV canal ${index}`,
      fieldId,
      family: "power",
      category: "production",
      electricalSide: "dc",
      entity: compact.includes("mppt") ? "mppt" : "pv_input",
      measurementType: "channel",
      index,
      sourceUnit: unit || "W",
      standardUnit: "kW",
      transform: transformForUnit(unit || "W", "kW"),
      priority: priorityForField(fieldId),
      confidence: 0.96,
      required: false,
      uses: usesForField(fieldId),
      description: "Potencia parametrizada por entrada FV o MPPT; no crea campos individuales por indice.",
      patternId: "ppv-indexed",
      status: "auto_detected",
    };
  }

  if (/^(ppv|pvpower|dcpower|inputpower)$/.test(compact)) {
    const fieldId = "dc_power";
    return {
      sourceHeader,
      normalizedHeader: normalized,
      displayName: "Potencia FV total",
      fieldId,
      family: "power",
      category: "production",
      electricalSide: "dc",
      entity: "pv",
      measurementType: "total",
      sourceUnit: unit || "W",
      standardUnit: "kW",
      transform: transformForUnit(unit || "W", "kW"),
      priority: priorityForField(fieldId),
      confidence: 0.92,
      required: false,
      uses: usesForField(fieldId),
      patternId: "dc-power-total",
      status: "auto_detected",
    };
  }

  if (/^(pac|activepower|outputpower|power)$/.test(compact)) {
    const fieldId = "active_power";
    return {
      sourceHeader,
      normalizedHeader: normalized,
      displayName: "Potencia activa AC",
      fieldId,
      family: "power",
      category: "production",
      electricalSide: "ac",
      measurementType: "active",
      sourceUnit: unit || "W",
      standardUnit: "kW",
      transform: transformForUnit(unit || "W", "kW"),
      priority: priorityForField(fieldId),
      confidence: 0.94,
      required: true,
      uses: usesForField(fieldId),
      patternId: "active-power",
      status: "auto_detected",
    };
  }

  if (/^(qac|reactivepower)$/.test(compact)) {
    const fieldId = "reactive_power";
    return {
      sourceHeader,
      normalizedHeader: normalized,
      displayName: "Potencia reactiva AC",
      fieldId,
      family: "power",
      category: "quality",
      electricalSide: "ac",
      measurementType: "reactive",
      sourceUnit: unit || "var",
      standardUnit: "kVAr",
      transform: transformForUnit(unit || "var", "kVAr"),
      priority: priorityForField(fieldId),
      confidence: 0.9,
      required: false,
      uses: usesForField(fieldId),
      patternId: "reactive-power",
      status: "auto_detected",
    };
  }

  return null;
}
