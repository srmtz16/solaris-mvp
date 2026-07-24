"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Download, Save, Search, X } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildVisualizationTemplates } from "@/data-translator/visualization/analysis-inspector";
import { buildTimeSeries, toCsv } from "@/data-translator/visualization/time-series";
import { buildVariableCatalog, searchVariables } from "@/data-translator/visualization/variable-catalog";
import type {
  SavedVisualizationView,
  SheetPreview,
  VisualizationAggregation,
  VisualizationCategory,
  VisualizationInterval,
  VisualizationMeasurement,
} from "@/types/data-translator";

type ParsedWorkbookLike = {
  fileName: string;
  sheetNames: string[];
  sheets: SheetPreview[];
};

type ElectricalMode = "DC" | "AC";

const categoryOptions: VisualizationCategory[] = ["AC", "MPPT", "Strings", "Energy", "Temperature"];
const measurementOptions: VisualizationMeasurement[] = ["voltage", "current", "power", "energy", "frequency", "power_factor", "temperature"];
const intervalOptions: Array<{ value: VisualizationInterval; label: string }> = [
  { value: "original", label: "Original" },
  { value: "1m", label: "1 minuto" },
  { value: "5m", label: "5 minutos" },
  { value: "10m", label: "10 minutos" },
  { value: "15m", label: "15 minutos" },
  { value: "30m", label: "30 minutos" },
  { value: "60m", label: "1 hora" },
  { value: "1d", label: "1 dia" },
];
const aggregationOptions: Array<{ value: VisualizationAggregation; label: string }> = [
  { value: "automatic", label: "Automatico" },
  { value: "mean", label: "Promedio" },
  { value: "min", label: "Minimo" },
  { value: "max", label: "Maximo" },
  { value: "sum", label: "Suma" },
  { value: "last", label: "Ultimo" },
  { value: "first", label: "Primero" },
];

function findSourceSheet(workbook: ParsedWorkbookLike) {
  return (
    workbook.sheets.find((sheet) => /historical data \(2\)|proces|clean|limp/i.test(sheet.name)) ??
    workbook.sheets.find((sheet) => !/analisis|análisis/i.test(sheet.name)) ??
    workbook.sheets[0]
  );
}

function findPreferredSourceSheet(workbook: ParsedWorkbookLike, preferredSheetName?: string) {
  return workbook.sheets.find((sheet) => sheet.name === preferredSheetName) ?? findSourceSheet(workbook);
}

function downloadText(fileName: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function SelectablePill({ selected, children, onClick }: { selected: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-xs font-medium ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

function variableSide(variable: { category: VisualizationCategory; measurement: VisualizationMeasurement; sourceHeader: string; displayName: string }) {
  const text = `${variable.sourceHeader} ${variable.displayName}`.toLowerCase();
  if (variable.category === "MPPT" || variable.category === "Strings" || /mppt|string|pv|dc|vpv|ipv|ppv|vstr|istr/.test(text)) return "DC";
  if (variable.category === "AC" || /ac|grid|fase|phase|l1|l2|l3|vac|iac|pac|fac|freq|pf|reactive/.test(text)) return "AC";
  if (["frequency", "power_factor"].includes(variable.measurement)) return "AC";
  return "DC";
}

function filterLabel(value: string) {
  const labels: Record<string, string> = {
    mppt: "MPPT",
    string: "String",
    dc_power: "Potencia DC",
    mppt_voltage: "MPPT (V)",
    mppt_current: "MPPT (A)",
    string_voltage: "String (V)",
    string_current: "String (A)",
    l1: "Fase L1",
    l2: "Fase L2",
    l3: "Fase L3",
    ac_voltage: "Voltaje AC",
    ac_current: "Corriente AC",
    active_power: "Potencia activa",
    frequency: "Frecuencia",
    power_factor: "Factor de potencia",
    reactive_power: "Potencia reactiva",
  };
  return labels[value] ?? value;
}

function variableMatchesElectricalFilter(variable: { category: VisualizationCategory; measurement: VisualizationMeasurement; sourceHeader: string; displayName: string }, filter: string) {
  const text = `${variable.sourceHeader} ${variable.displayName}`.toLowerCase();
  if (filter === "mppt") return variable.category === "MPPT";
  if (filter === "string") return variable.category === "Strings";
  if (filter === "dc_power") return variable.category === "MPPT" && variable.measurement === "power";
  if (filter === "mppt_voltage") return variable.category === "MPPT" && variable.measurement === "voltage";
  if (filter === "mppt_current") return variable.category === "MPPT" && variable.measurement === "current";
  if (filter === "string_voltage") return variable.category === "Strings" && variable.measurement === "voltage";
  if (filter === "string_current") return variable.category === "Strings" && variable.measurement === "current";
  if (filter === "l1") return /l1|phase a|fase a|r phase|phase r/.test(text);
  if (filter === "l2") return /l2|phase b|fase b|s phase|phase s/.test(text);
  if (filter === "l3") return /l3|phase c|fase c|t phase|phase t/.test(text);
  if (filter === "ac_voltage") return variable.measurement === "voltage";
  if (filter === "ac_current") return variable.measurement === "current";
  if (filter === "active_power") return variable.measurement === "power" && !/reactive|kvar|var/.test(text);
  if (filter === "frequency") return variable.measurement === "frequency";
  if (filter === "power_factor") return variable.measurement === "power_factor";
  if (filter === "reactive_power") return variable.measurement === "power" && /reactive|kvar|var/.test(text);
  return true;
}

export function DataTranslatorExplorer({ workbook, sourceSheetName }: { workbook: ParsedWorkbookLike | null; sourceSheetName?: string }) {
  const sourceSheet = workbook ? findPreferredSourceSheet(workbook, sourceSheetName) : null;
  const variables = useMemo(() => (sourceSheet ? buildVariableCatalog(sourceSheet).filter((variable) => variable.visualizable) : []), [sourceSheet]);
  const templates = useMemo(
    () => (workbook && sourceSheet ? buildVisualizationTemplates({ sheets: workbook.sheets, variables, sourceSheetName: sourceSheet.name }) : []),
    [workbook, sourceSheet, variables],
  );
  const [activeTemplateId, setActiveTemplateId] = useState("view-free");
  const activeTemplate = templates.find((template) => template.templateId === activeTemplateId) ?? templates[0];
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<VisualizationCategory[]>([]);
  const [measurements, setMeasurements] = useState<VisualizationMeasurement[]>([]);
  const [electricalMode, setElectricalMode] = useState<ElectricalMode>("DC");
  const [dcFilters, setDcFilters] = useState<string[]>(["mppt", "dc_power"]);
  const [acFilters, setAcFilters] = useState<string[]>(["ac_voltage", "ac_current", "active_power"]);
  const [mpptIndex, setMpptIndex] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [interval, setInterval] = useState<VisualizationInterval>("original");
  const [aggregation, setAggregation] = useState<VisualizationAggregation>("automatic");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [savedViews, setSavedViews] = useState<SavedVisualizationView[]>([]);
  const [usesTemplateDefault, setUsesTemplateDefault] = useState(true);

  const templateSelection = activeTemplate?.defaultSeries ?? [];
  const sideVariables = variables.filter((variable) => variableSide(variable) === electricalMode);
  const activeElectricalFilters = electricalMode === "DC" ? dcFilters : acFilters;
  const filterMatchedVariables = sideVariables.filter((variable) => !activeElectricalFilters.length || activeElectricalFilters.some((filter) => variableMatchesElectricalFilter(variable, filter)));
  const defaultElectricalSelection = filterMatchedVariables.filter((variable) => ["voltage", "current", "power", "frequency", "power_factor"].includes(variable.measurement)).map((variable) => variable.fieldId);
  const effectiveSelected = (usesTemplateDefault ? (templateSelection.length ? templateSelection : defaultElectricalSelection) : selectedIds).filter((fieldId) =>
    filterMatchedVariables.some((variable) => variable.fieldId === fieldId),
  );
  const selectedVariables = filterMatchedVariables.filter((variable) => effectiveSelected.includes(variable.fieldId));
  const filteredVariables = searchVariables(variables, search).filter((variable) => {
    if (variableSide(variable) !== electricalMode) return false;
    if (activeElectricalFilters.length && !activeElectricalFilters.some((filter) => variableMatchesElectricalFilter(variable, filter))) return false;
    if (categories.length && !categories.includes(variable.category)) return false;
    if (measurements.length && !measurements.includes(variable.measurement)) return false;
    if (mpptIndex && String(variable.entityIndex ?? "") !== mpptIndex) return false;
    return true;
  });
  const chartRows = sourceSheet
    ? buildTimeSeries({ sheet: sourceSheet, variables, selectedIds: effectiveSelected, interval, aggregation, dateStart, dateEnd, timeStart, timeEnd })
    : [];
  const voltageVariables = selectedVariables.filter((variable) => variable.measurement === "voltage");
  const currentVariables = selectedVariables.filter((variable) => variable.measurement === "current");
  const powerVariables = selectedVariables.filter((variable) => variable.measurement === "power");
  const unitCount = new Set(selectedVariables.map((variable) => variable.unit)).size;
  const thirdUnitWarning = unitCount > 2;
  const estimatedWarning = interval === "1m";

  function toggleArrayValue<T>(current: T[], value: T, set: (value: T[]) => void) {
    set(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function toggleSelected(fieldId: string) {
    setUsesTemplateDefault(false);
    setSelectedIds((current) => (current.includes(fieldId) ? current.filter((item) => item !== fieldId) : [...current, fieldId]));
  }

  function selectFamily(measurement: VisualizationMeasurement, category?: VisualizationCategory) {
    setUsesTemplateDefault(false);
    setSelectedIds(
      variables
        .filter((variable) => variable.measurement === measurement && (!category || variable.category === category))
        .map((variable) => variable.fieldId),
    );
  }

  function saveView() {
    const name = window.prompt("Nombre de la vista", activeTemplate?.viewName ?? "Vista personalizada");
    if (!name) return;
    setSavedViews((current) => [
      {
        id: `view-${Date.now()}`,
        name,
        variables: effectiveSelected,
        interval,
        aggregation,
        dateStart,
        dateEnd,
        timeStart,
        timeEnd,
        axisMode: "auto_by_unit",
        order: effectiveSelected,
        chartType: "line",
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
  }

  if (!workbook || !sourceSheet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Explorar datos</CardTitle>
          <CardDescription>Carga un archivo para crear vistas libres, AC y MPPT.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Explorar datos</CardTitle>
            <CardDescription>Catalogo visualizable desde {sourceSheet.name}. Las hojas de analisis se usan como ejemplo, no como dependencia.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => downloadText("solaris-datos-visibles.csv", toCsv(chartRows, selectedVariables))}>
              <Download className="size-4" />
              Descargar datos visibles
            </Button>
            <Button onClick={saveView}>
              <Save className="size-4" />
              Guardar vista
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <SelectablePill
                key={template.templateId}
                selected={activeTemplate?.templateId === template.templateId}
                onClick={() => {
                  setActiveTemplateId(template.templateId);
                  setSelectedIds(template.defaultSeries);
                  setUsesTemplateDefault(false);
                  setInterval(template.defaultInterval);
                  setAggregation(template.defaultAggregation);
                }}
              >
                {template.viewName}
              </SelectablePill>
            ))}
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 font-semibold">Variables de la grafica</div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(["DC", "AC"] as ElectricalMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setElectricalMode(mode);
                    setUsesTemplateDefault(true);
                    setSelectedIds([]);
                  }}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${electricalMode === mode ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="text-xs font-semibold text-muted-foreground">{electricalMode === "DC" ? "Filtros DC" : "Filtros AC"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(electricalMode === "DC" ? ["mppt", "string", "dc_power", "mppt_voltage", "mppt_current", "string_voltage", "string_current"] : ["l1", "l2", "l3", "ac_voltage", "ac_current", "active_power", "frequency", "power_factor", "reactive_power"]).map((filter) => (
                <SelectablePill
                  key={filter}
                  selected={activeElectricalFilters.includes(filter)}
                  onClick={() => {
                    setUsesTemplateDefault(true);
                    if (electricalMode === "DC") toggleArrayValue(dcFilters, filter, setDcFilters);
                    else toggleArrayValue(acFilters, filter, setAcFilters);
                  }}
                >
                  {filterLabel(filter)}
                </SelectablePill>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-md border border-border px-2 py-2 text-sm">
              <Search className="size-4 text-muted-foreground" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="MPPT 1 voltaje, IacR, fase R" className="w-full bg-transparent outline-none" />
              {search ? <X className="size-4 cursor-pointer text-muted-foreground" onClick={() => setSearch("")} /> : null}
            </label>
            <div className="mt-3 text-xs font-semibold text-muted-foreground">Categoria</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {categoryOptions.map((category) => (
                <SelectablePill key={category} selected={categories.includes(category)} onClick={() => toggleArrayValue(categories, category, setCategories)}>
                  {category}
                </SelectablePill>
              ))}
            </div>
            <div className="mt-3 text-xs font-semibold text-muted-foreground">Magnitud</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {measurementOptions.map((measurement) => (
                <SelectablePill key={measurement} selected={measurements.includes(measurement)} onClick={() => toggleArrayValue(measurements, measurement, setMeasurements)}>
                  {measurement}
                </SelectablePill>
              ))}
            </div>
            <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Indice MPPT
              <select value={mpptIndex} onChange={(event) => setMpptIndex(event.target.value)} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground">
                <option value="">Todos</option>
                {Array.from(new Set(variables.filter((variable) => variable.category === "MPPT" && variable.entityIndex).map((variable) => variable.entityIndex))).map((index) => (
                  <option key={index} value={index}>
                    MPPT {index}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => selectFamily("voltage", "MPPT")}>Todos voltajes MPPT</Button>
              <Button size="sm" variant="outline" onClick={() => selectFamily("current", "MPPT")}>Todas corrientes MPPT</Button>
              <Button size="sm" variant="ghost" onClick={() => { setUsesTemplateDefault(false); setSelectedIds([]); }}>Limpiar seleccion</Button>
            </div>
            <div className="mt-3 max-h-80 overflow-y-auto rounded-md border border-border">
              {filteredVariables.map((variable) => (
                <label key={variable.fieldId} className="flex cursor-pointer items-start gap-2 border-t border-border px-3 py-2 text-sm first:border-t-0 hover:bg-muted/40">
                  <input type="checkbox" className="mt-1" checked={effectiveSelected.includes(variable.fieldId)} onChange={() => toggleSelected(variable.fieldId)} />
                  <span className="flex-1">
                    <span className="font-medium">{variable.displayName}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {variable.unit || "-"} · {variable.entityType ?? "-"} {variable.entityIndex ?? ""} · {variable.measurement} · calidad {variable.quality}
                    </span>
                  </span>
                  <span className="mt-1 size-3 rounded-full" style={{ backgroundColor: variable.color }} />
                </label>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Fecha inicial
              <input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Fecha final
              <input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Hora inicial
              <input type="time" value={timeStart} onChange={(event) => setTimeStart(event.target.value)} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Hora final
              <input type="time" value={timeEnd} onChange={(event) => setTimeEnd(event.target.value)} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Intervalo
              <select value={interval} onChange={(event) => setInterval(event.target.value as VisualizationInterval)} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground">
                {intervalOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Agregacion
              <select value={aggregation} onChange={(event) => setAggregation(event.target.value as VisualizationAggregation)} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground">
                {aggregationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="flex items-end gap-2 md:col-span-2">
              <Badge variant="secondary">{chartRows.length} timestamps</Badge>
              <Badge variant="secondary">{selectedVariables.length} series</Badge>
              {thirdUnitWarning ? <Badge variant="destructive">Mas de dos unidades: considera normalizar o separar paneles</Badge> : null}
            </div>
          </div>

          {estimatedWarning ? (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              El intervalo solicitado puede ser menor que la resolucion original. Los puntos adicionales no se inventan; se conservan buckets con datos existentes.
            </div>
          ) : null}

          {[
            { title: "Voltaje", unit: "V", items: voltageVariables },
            { title: "Corriente", unit: "A", items: currentVariables },
            { title: "Potencia", unit: electricalMode === "DC" ? "kW DC" : "kW / kVAr AC", items: powerVariables },
          ].map((panel) => (
            <div key={panel.title} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="font-semibold">{panel.title}</div>
                <Badge variant="secondary">{panel.items.length} series</Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartRows} syncId="solaris-electrical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" minTickGap={40} />
                    <YAxis label={{ value: panel.unit, angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Legend />
                    {panel.items.map((variable) => (
                      <Line
                        key={variable.fieldId}
                        type="monotone"
                        dataKey={variable.fieldId}
                        name={`${variable.displayName} (${variable.unit})`}
                        stroke={variable.color}
                        dot={false}
                        connectNulls={false}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[900px] text-xs">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">Timestamp</th>
                  {selectedVariables.map((variable) => (
                    <th key={variable.fieldId} className="px-2 py-2 text-left">{variable.displayName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartRows.slice(0, 120).map((row) => (
                  <tr key={row.timestamp} className="border-t border-border">
                    <td className="px-2 py-2 font-mono">{row.timestamp}</td>
                    {selectedVariables.map((variable) => (
                      <td key={variable.fieldId} className="px-2 py-2">{typeof row[variable.fieldId] === "number" ? Number(row[variable.fieldId]).toFixed(2) : "-"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {savedViews.length ? (
            <div className="rounded-lg border border-border p-3">
              <div className="font-semibold">Vistas guardadas</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {savedViews.map((view) => (
                  <button key={view.id} type="button" onClick={() => { setUsesTemplateDefault(false); setSelectedIds(view.variables); }} className="rounded-md bg-muted px-2 py-1 text-xs">
                    {view.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </CardContent>
    </Card>
  );
}
