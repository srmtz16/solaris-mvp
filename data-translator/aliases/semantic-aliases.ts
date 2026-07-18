import type { SemanticVariable } from "@/types/data-translator";
import { compactHeader, extractUnit, normalizeSemanticHeader, transformForUnit } from "@/data-translator/parser/header-parser";
import { getFieldDefinition } from "@/data-translator/ontology/fields";
import { priorityForField } from "@/data-translator/ontology/priorities";
import { usesForField } from "@/data-translator/ontology/uses";

type AliasDefinition = {
  aliases: string[];
  fieldId: string;
  label: string;
  measurementType: string;
};

const aliasDefinitions: AliasDefinition[] = [
  { aliases: ["vmax", "vmaxv", "v_max", "voltagemax", "maxvoltage"], fieldId: "voltage_max", label: "Voltaje maximo", measurementType: "maximum" },
  { aliases: ["vmin", "vminv", "v_min", "voltagemin", "minvoltage"], fieldId: "voltage_min", label: "Voltaje minimo", measurementType: "minimum" },
  { aliases: ["pmax", "pmaxw", "p_max", "powermax", "maxpower"], fieldId: "power_max", label: "Potencia maxima", measurementType: "maximum" },
  { aliases: ["eactotal", "eac_total", "totalyield", "lifetimeenergy"], fieldId: "energy_total", label: "Energia AC acumulada", measurementType: "cumulative" },
];

export function matchSemanticAlias(sourceHeader: string): SemanticVariable | null {
  const compact = compactHeader(sourceHeader);
  const alias = aliasDefinitions.find((definition) => definition.aliases.some((candidate) => compact === compactHeader(candidate)));
  if (!alias) return null;

  const definition = getFieldDefinition(alias.fieldId);
  const unit = extractUnit(sourceHeader);
  const standardUnit = definition?.standardUnit ?? unit;

  return {
    sourceHeader,
    normalizedHeader: normalizeSemanticHeader(sourceHeader),
    displayName: definition?.label ?? alias.label,
    fieldId: alias.fieldId,
    family: definition?.family ?? "unknown",
    category: definition?.category,
    electricalSide: definition?.electricalSide,
    measurementType: alias.measurementType,
    sourceUnit: unit,
    standardUnit,
    transform: transformForUnit(unit, standardUnit),
    priority: priorityForField(alias.fieldId),
    confidence: 0.86,
    required: priorityForField(alias.fieldId) === "critical",
    uses: usesForField(alias.fieldId),
    description: definition?.description ?? "Variable resuelta desde biblioteca de alias semanticos.",
    patternId: "semantic-alias",
    status: "auto_detected",
    inferenceReasons: ["Alias exacto o normalizado", unit ? `Unidad detectada: ${unit}` : "Sin unidad explicita"],
  };
}
