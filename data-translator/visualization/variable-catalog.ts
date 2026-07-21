import type { ColumnDataProfile, NormalizedVariable, SheetPreview, VisualizationAggregation, VisualizationCategory, VisualizationMeasurement } from "@/types/data-translator";
import { normalizeHeader } from "@/lib/data-translator";

const palette = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c", "#0891b2", "#4f46e5", "#be123c", "#0f766e", "#a16207"];

function unitFromHeader(header: string) {
  return header.match(/\(([^)]+)\)/)?.[1]?.replace("℃", "C").trim() ?? "";
}

function inferIndex(header: string) {
  return Number(header.match(/(?:mppt|vpv|ipv|ppv|string|vstr|istr)\s*_?(\d+)/i)?.[1]) || undefined;
}

function inferMeasurement(header: string, unit: string): VisualizationMeasurement {
  const compact = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (compact.includes("pf") || compact.includes("powerfactor")) return "power_factor";
  if (compact.includes("fac") || compact.includes("frequency")) return "frequency";
  if (compact.includes("temp")) return "temperature";
  if (compact.includes("energy") || compact.includes("eac") || compact.includes("epv")) return "energy";
  if (compact.includes("power") || compact.includes("pac") || compact.includes("ppv") || ["w", "kw", "var", "kvar", "va"].includes(unit.toLowerCase())) return "power";
  if (compact.includes("current") || compact.includes("iac") || compact.includes("ipv") || compact.includes("istr") || unit.toLowerCase() === "a") return "current";
  if (compact.includes("voltage") || compact.includes("vac") || compact.includes("vpv") || compact.includes("vstr") || unit.toLowerCase() === "v") return "voltage";
  if (compact.includes("status") || compact.includes("alarm") || compact.includes("fault")) return "status";
  return "unknown";
}

function inferCategory(header: string, measurement: VisualizationMeasurement): VisualizationCategory {
  const compact = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (compact.includes("mppt") || compact.includes("vpv") || compact.includes("ipv") || compact.includes("ppv")) return "MPPT";
  if (compact.includes("vac") || compact.includes("iac") || compact.includes("pac") || compact.includes("fac") || compact === "pf") return "AC";
  if (compact.includes("string") || compact.includes("vstr") || compact.includes("istr")) return "Strings";
  if (measurement === "energy") return "Energy";
  if (measurement === "temperature") return "Temperature";
  if (measurement === "status") return "Operation";
  return "Other";
}

function defaultAggregation(measurement: VisualizationMeasurement, header: string): Exclude<VisualizationAggregation, "automatic"> {
  const compact = header.toLowerCase();
  if (measurement === "energy" && (compact.includes("total") || compact.includes("acumul"))) return "last";
  if (measurement === "energy") return "sum";
  if (measurement === "status") return "last";
  return "mean";
}

function fieldIdFor(header: string, category: VisualizationCategory, measurement: VisualizationMeasurement, index?: number) {
  const normalized = normalizeHeader(header).replaceAll("-", "_");
  const unit = unitFromHeader(header).toLowerCase() || "value";
  if (index && measurement !== "unknown") return `${category.toLowerCase()}_${measurement}_${index}_${unit}`;
  return normalized || `field_${index ?? "unknown"}`;
}

function displayNameFor(header: string, category: VisualizationCategory, measurement: VisualizationMeasurement, index?: number) {
  const measurementLabel: Record<VisualizationMeasurement, string> = {
    voltage: "Voltaje",
    current: "Corriente",
    power: "Potencia",
    energy: "Energia",
    frequency: "Frecuencia",
    power_factor: "Factor de potencia",
    temperature: "Temperatura",
    status: "Estado",
    unknown: "Variable",
  };
  if (category === "MPPT" && index) return `MPPT ${index} ${measurementLabel[measurement]}`;
  if (category === "AC") return header.replace(/\([^)]*\)/g, "").trim();
  return header.replace(/\([^)]*\)/g, "").trim() || measurementLabel[measurement];
}

function qualityFor(profile?: ColumnDataProfile) {
  if (!profile) return "media";
  if (profile.nullRatio > 0.25) return "revisar";
  if (profile.nullRatio > 0.05) return "media";
  return "alta";
}

export function buildVariableCatalog(sheet: SheetPreview): NormalizedVariable[] {
  return sheet.headers.map((header, index) => {
    const profile = sheet.columnProfiles?.[index];
    const unit = profile?.detectedUnit || unitFromHeader(header);
    const measurement = inferMeasurement(header, unit);
    const category = inferCategory(header, measurement);
    const entityIndex = inferIndex(header);
    const fieldId = fieldIdFor(header, category, measurement, entityIndex);
    const displayName = displayNameFor(header, category, measurement, entityIndex);
    const standardHeader = sheet.rows[1]?.[index];
    const rawHeader = sheet.rows[2]?.[index];
    const entityType = category === "MPPT" ? "MPPT" : category === "AC" ? "AC" : category;
    const visualizable = measurement !== "unknown" && measurement !== "status";

    return {
      fieldId,
      sourceHeader: rawHeader || header,
      standardHeader,
      displayName,
      category,
      entityType,
      entityIndex,
      measurement,
      unit,
      dataType: measurement === "unknown" ? "string" : "number",
      defaultAggregation: defaultAggregation(measurement, header),
      visualizable,
      searchTerms: [displayName, header, rawHeader, standardHeader, category, entityType, entityIndex ? `${entityType}${entityIndex}` : "", unit, measurement].filter(Boolean) as string[],
      quality: qualityFor(profile),
      color: palette[index % palette.length],
      columnIndex: index,
      profile,
    };
  });
}

export function searchVariables(variables: NormalizedVariable[], query: string) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (!terms.length) return variables;
  return variables.filter((variable) => {
    const haystack = variable.searchTerms.join(" ").toLowerCase().replace(/[^a-z0-9 ]/g, " ");
    return terms.every((term) => haystack.includes(term.replace(/[^a-z0-9]/g, "")) || haystack.includes(term));
  });
}
