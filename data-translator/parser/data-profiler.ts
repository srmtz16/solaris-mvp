import type { ColumnDataProfile, DetectedDataType, SemanticFamily } from "@/types/data-translator";
import { extractUnit, normalizeSemanticHeader } from "@/data-translator/parser/header-parser";

function parseNumber(value: string) {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function isDateLike(value: string) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || /^\d+(\.\d+)?$/.test(trimmed)) return false;
  return !Number.isNaN(Date.parse(trimmed));
}

function candidateFamilyFromUnit(unit: string): SemanticFamily | undefined {
  const clean = unit.toLowerCase();
  if (clean === "v") return "voltage";
  if (clean === "a") return "current";
  if (["w", "kw", "var", "kvar"].includes(clean)) return "power";
  if (["wh", "kwh", "mwh"].includes(clean)) return "energy";
  if (["hz", "pf"].includes(clean)) return "power_quality";
  if (["c", "w/m2", "w/m²"].includes(clean)) return "environment";
  return undefined;
}

function detectTypes(values: string[], numbers: number[], monotonicity: number, cardinality: number): DetectedDataType[] {
  const types = new Set<DetectedDataType>();
  const nonEmpty = values.filter((value) => String(value ?? "").trim());
  if (!nonEmpty.length) return ["string"];
  if (numbers.length / nonEmpty.length > 0.85) {
    types.add(numbers.every((value) => Number.isInteger(value)) ? "integer" : "float");
    types.add(monotonicity > 0.8 ? "cumulative" : "instantaneous");
  }
  if (nonEmpty.filter(isDateLike).length / nonEmpty.length > 0.7) types.add(nonEmpty.some((value) => /:\d{2}/.test(value)) ? "datetime" : "date");
  if (new Set(nonEmpty.map((value) => value.toLowerCase())).size <= Math.max(6, nonEmpty.length * 0.25)) types.add("categorical");
  if (cardinality / nonEmpty.length > 0.8 && numbers.length / nonEmpty.length < 0.5) types.add("identifier");
  if (!types.size) types.add("string");
  return Array.from(types);
}

export function profileColumns(headers: string[], rows: string[][]): ColumnDataProfile[] {
  return headers.map((sourceHeader, index) => {
    const values = rows.map((row) => row[index] ?? "");
    const nonEmpty = values.filter((value) => String(value ?? "").trim());
    const numbers = nonEmpty.map(parseNumber).filter((value): value is number => value !== null);
    const increments = numbers.slice(1).map((value, valueIndex) => value - numbers[valueIndex]);
    const positiveIncrements = increments.filter((value) => value >= 0).length;
    const monotonicity = increments.length ? positiveIncrements / increments.length : 0;
    const averageIncrement = increments.length ? increments.reduce((sum, value) => sum + value, 0) / increments.length : undefined;
    const unit = extractUnit(sourceHeader);
    const cardinality = new Set(nonEmpty.map((value) => value.toLowerCase())).size;

    return {
      sourceHeader,
      normalizedHeader: normalizeSemanticHeader(sourceHeader),
      detectedTypes: detectTypes(nonEmpty, numbers, monotonicity, cardinality),
      nullRatio: values.length ? 1 - nonEmpty.length / values.length : 1,
      min: numbers.length ? Math.min(...numbers) : undefined,
      max: numbers.length ? Math.max(...numbers) : undefined,
      average: numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : undefined,
      averageIncrement,
      monotonicity,
      cardinality,
      detectedUnit: unit,
      possibleCumulative: monotonicity > 0.8 && numbers.length > 2,
      possibleIndex: Number(sourceHeader.match(/\d+/)?.[0]) || undefined,
      candidateFamily: candidateFamilyFromUnit(unit),
    };
  });
}
