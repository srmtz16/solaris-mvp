import type { SemanticVariable } from "@/types/data-translator";
import { compactHeader, extractUnit, normalizeSemanticHeader, transformForUnit } from "@/data-translator/parser/header-parser";
import { priorityForField } from "@/data-translator/ontology/priorities";
import { usesForField } from "@/data-translator/ontology/uses";

export function matchEnergyPattern(sourceHeader: string): SemanticVariable | null {
  const compact = compactHeader(sourceHeader);
  const normalized = normalizeSemanticHeader(sourceHeader);
  const unit = extractUnit(sourceHeader) || "kWh";
  const isPv = compact.includes("epv") || compact.includes("pv");
  const isAc = compact.includes("eac") || compact.includes("yield") || compact.includes("etoday") || compact.includes("etotal");
  const isDaily = compact.includes("today") || compact.includes("daily") || compact === "etoday";
  const isTotal = compact.includes("total") || compact === "etotal";

  if ((isPv || isAc) && (isDaily || isTotal)) {
    const fieldId = isPv ? (isDaily ? "pv_energy_daily" : "pv_energy_total") : isDaily ? "energy_daily" : "energy_total";
    return {
      sourceHeader,
      normalizedHeader: normalized,
      displayName: `${isPv ? "Energia FV" : "Energia AC"} ${isDaily ? "diaria" : "acumulada"}`,
      fieldId,
      family: "energy",
      category: "production",
      electricalSide: isPv ? "dc" : "ac",
      entity: isPv ? "pv" : "grid",
      measurementType: isDaily ? "daily" : "cumulative",
      sourceUnit: unit,
      standardUnit: "kWh",
      transform: transformForUnit(unit, "kWh"),
      priority: priorityForField(fieldId),
      confidence: 0.98,
      required: true,
      uses: usesForField(fieldId),
      patternId: isDaily ? "energy-daily" : "energy-total",
      status: "auto_detected",
    };
  }

  return null;
}
