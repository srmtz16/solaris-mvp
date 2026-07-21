import type { AnalysisSheetEvidence, NormalizedVariable, SheetPreview, VisualizationTemplate } from "@/types/data-translator";

function templateId(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isAnalysisSheet(sheet: SheetPreview, type: "AC" | "MPPT") {
  const name = sheet.name.toLowerCase();
  if (type === "AC") return name.includes("analisis ac") || name.includes("análisis ac");
  return name.includes("analisis mppt") || name.includes("análisis mppt");
}

function evidenceFromSheet(sheet: SheetPreview, sourceSheetName: string): AnalysisSheetEvidence[] {
  return sheet.headers.map((header, index) => ({
    sourceSheet: sourceSheetName,
    range: `${sheet.name}!${index + 1}`,
    sourceColumn: header,
    formulaPattern: "Encabezados y formulas de hoja de analisis cuando el parser las expone",
  }));
}

function fieldIds(variables: NormalizedVariable[], predicate: (variable: NormalizedVariable) => boolean) {
  return variables.filter((variable) => variable.visualizable && predicate(variable)).map((variable) => variable.fieldId);
}

export function buildVisualizationTemplates({
  sheets,
  variables,
  sourceSheetName,
}: {
  sheets: SheetPreview[];
  variables: NormalizedVariable[];
  sourceSheetName: string;
}): VisualizationTemplate[] {
  const templates: VisualizationTemplate[] = [];
  const acSheet = sheets.find((sheet) => isAnalysisSheet(sheet, "AC"));
  const mpptSheet = sheets.find((sheet) => isAnalysisSheet(sheet, "MPPT"));

  if (acSheet) {
    templates.push({
      templateId: `view-${templateId(acSheet.name)}`,
      viewName: "Analisis AC",
      viewType: "time_series",
      sourceSheet: acSheet.name,
      category: "AC",
      xAxisField: "timestamp",
      defaultSeries: fieldIds(variables, (variable) => variable.category === "AC" && variable.measurement === "voltage").slice(0, 3),
      availableGroups: ["AC Voltage", "AC Current", "Power", "Frequency", "Power Factor"],
      allowMixedMeasurements: true,
      multiAxisByUnit: true,
      defaultInterval: "original",
      defaultAggregation: "automatic",
      evidence: evidenceFromSheet(acSheet, sourceSheetName),
    });
  }

  if (mpptSheet) {
    const mpptVoltage = fieldIds(variables, (variable) => variable.category === "MPPT" && variable.measurement === "voltage");
    const mpptCurrentOne = fieldIds(variables, (variable) => variable.category === "MPPT" && variable.measurement === "current" && variable.entityIndex === 1);
    templates.push({
      templateId: `view-${templateId(mpptSheet.name)}`,
      viewName: "Analisis MPPT",
      viewType: "time_series",
      sourceSheet: mpptSheet.name,
      category: "MPPT",
      xAxisField: "timestamp",
      defaultSeries: [...mpptVoltage.slice(0, 1), ...mpptCurrentOne].filter(Boolean),
      availableGroups: ["MPPT Voltage", "MPPT Current", "MPPT Power"],
      allowMixedMeasurements: true,
      multiAxisByUnit: true,
      defaultInterval: "original",
      defaultAggregation: "automatic",
      evidence: evidenceFromSheet(mpptSheet, sourceSheetName),
    });
  }

  templates.unshift({
    templateId: "view-free",
    viewName: "Vista libre",
    viewType: "time_series",
    sourceSheet: sourceSheetName,
    category: "Free",
    xAxisField: "timestamp",
    defaultSeries: variables.filter((variable) => variable.visualizable).slice(0, 3).map((variable) => variable.fieldId),
    availableGroups: ["AC", "MPPT", "Strings", "Energy", "Temperature"],
    allowMixedMeasurements: true,
    multiAxisByUnit: true,
    defaultInterval: "original",
    defaultAggregation: "automatic",
    evidence: [],
  });

  return templates;
}
