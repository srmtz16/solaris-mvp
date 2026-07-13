import type { SemanticVariable } from "@/types/data-translator";
import { compactHeader, extractUnit, normalizeSemanticHeader, transformForUnit } from "@/data-translator/parser/header-parser";
import { priorityForField } from "@/data-translator/ontology/priorities";
import { usesForField } from "@/data-translator/ontology/uses";

export function matchOperationPattern(sourceHeader: string): SemanticVariable | null {
  const compact = compactHeader(sourceHeader);
  const normalized = normalizeSemanticHeader(sourceHeader);
  const unit = extractUnit(sourceHeader);
  const direct: Record<string, { fieldId: string; displayName: string }> = {
    timetotal: { fieldId: "operating_hours", displayName: "Horas de operacion acumuladas" },
    runtime: { fieldId: "operating_hours", displayName: "Horas de operacion" },
    operatinghours: { fieldId: "operating_hours", displayName: "Horas de operacion" },
    totalrunningtime: { fieldId: "operating_hours", displayName: "Horas de operacion acumuladas" },
    status: { fieldId: "status", displayName: "Estado operativo" },
    alarmcode: { fieldId: "alarm_code", displayName: "Codigo de alarma" },
    warningcode: { fieldId: "warning_code", displayName: "Codigo de advertencia" },
    faultcode: { fieldId: "fault_code", displayName: "Codigo de falla" },
  };
  const found = direct[compact];
  if (!found) return null;

  return {
    sourceHeader,
    normalizedHeader: normalized,
    displayName: found.displayName,
    fieldId: found.fieldId,
    family: found.fieldId === "status" ? "identification" : "operation",
    category: found.fieldId === "operating_hours" ? "operation" : "events",
    sourceUnit: unit || (found.fieldId === "operating_hours" ? "H" : ""),
    standardUnit: found.fieldId === "operating_hours" ? "h" : "",
    transform: found.fieldId === "operating_hours" ? transformForUnit(unit || "H", "h") : "trim",
    priority: priorityForField(found.fieldId),
    confidence: 0.93,
    required: found.fieldId === "status",
    uses: usesForField(found.fieldId),
    patternId: found.fieldId,
    status: "auto_detected",
  };
}
