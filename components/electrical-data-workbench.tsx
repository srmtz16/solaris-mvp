"use client";

import { useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Download, FileSpreadsheet, FileText, Gauge, Loader2, RefreshCw, ShieldCheck, Upload, Zap } from "lucide-react";
import * as XLSX from "xlsx";
import { ElectricalDataChart } from "@/components/electrical-data-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  aggregateReadings, defaultFilters, detectAdaptivePatterns, exportReadingsCsv, filterReadings, fromLocalInput,
  importElectricalWorkbook, readingsToChartData, summarizeAnalysis, toLocalInput, updateColumnMapping,
} from "@/lib/electrical-analysis";
import type { AdaptivePattern, AggregationMinutes, AnalysisFilters, ElectricalFamily, ElectricalPhase, ImportedDataset, Sensitivity } from "@/types/electrical-analysis";

const families: Array<{ value: ElectricalFamily; label: string }> = [
  { value: "voltage", label: "Voltaje" }, { value: "current", label: "Corriente" }, { value: "power", label: "Potencia" },
  { value: "power_factor", label: "Factor de potencia" }, { value: "frequency", label: "Frecuencia" }, { value: "energy", label: "Energía" }, { value: "other", label: "Otro" },
];
const phases: ElectricalPhase[] = ["A", "B", "C", "AB", "BC", "CA", "combined", "none"];
const severityVariant = (severity: AdaptivePattern["severity"]) => severity === "critical" ? "destructive" : severity === "warning" ? "warning" : "secondary";
const formatNumber = (value: number | null, suffix = "") => value === null ? "—" : `${value.toLocaleString("es-MX", { maximumFractionDigits: 2 })}${suffix}`;

function downloadBlob(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>{children}</button>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span><div><div className="text-xs text-muted-foreground">{label}</div><div className="text-lg font-semibold">{value}</div></div></CardContent></Card>;
}

export function ElectricalDataWorkbench() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dataset, setDataset] = useState<ImportedDataset | null>(null);
  const [filters, setFilters] = useState<AnalysisFilters | null>(null);
  const [sensitivity, setSensitivity] = useState<Sensitivity>("normal");
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [zoom, setZoom] = useState<{ start?: string; end?: string }>({});
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"review" | "analysis">("review");

  async function loadFile(file: File) {
    if (!/\.(xls|xlsx|csv)$/i.test(file.name)) { setStatus("error"); setMessage("Formato no compatible. Usa XLS, XLSX o CSV."); return; }
    if (file.size > 35 * 1024 * 1024) { setStatus("error"); setMessage("El archivo supera 35 MB. Divide la exportación en periodos más cortos."); return; }
    setStatus("loading"); setMessage(""); setStep("review");
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const imported = importElectricalWorkbook(workbook, file.name);
      setDataset(imported); setFilters(defaultFilters(imported));
      const preferred = imported.columns.filter((column) => column.recognized && column.family !== "other").slice(0, 6).map((column) => column.targetId);
      setSelectedVariables(preferred); setStatus("ready");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "No fue posible leer el archivo."); }
  }

  const filtered = useMemo(() => dataset && filters ? filterReadings(dataset.readings, filters) : [], [dataset, filters]);
  const aggregated = useMemo(() => filters ? aggregateReadings(filtered, filters.aggregationMinutes) : filtered, [filtered, filters]);
  const analysisBase = useMemo(() => dataset && filters ? filterReadings(dataset.readings, { ...filters, families: [], phases: [], variableIds: [], aggregationMinutes: 0 }) : [], [dataset, filters]);
  const patterns = useMemo(() => dataset ? detectAdaptivePatterns(analysisBase, dataset.intervalMinutes, sensitivity) : [], [analysisBase, dataset, sensitivity]);
  const summary = useMemo(() => dataset ? summarizeAnalysis(dataset, analysisBase, patterns) : null, [dataset, analysisBase, patterns]);
  const chartReadings = aggregated.filter((reading) => selectedVariables.includes(reading.variableId));
  const chartData = readingsToChartData(chartReadings);
  const chartColumns = dataset?.columns.filter((column) => selectedVariables.includes(column.targetId)) ?? [];
  const availableColumns = dataset?.columns.filter((column) => column.family !== "other") ?? [];

  function patchFilters(patch: Partial<AnalysisFilters>) { setFilters((current) => current ? { ...current, ...patch } : current); setZoom({}); }
  function toggleFilter<K extends "families" | "phases">(key: K, value: AnalysisFilters[K][number]) {
    if (!filters) return;
    const current = filters[key] as Array<typeof value>;
    patchFilters({ [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] } as Partial<AnalysisFilters>);
  }
  function exportCsv() { downloadBlob(`solaris-${dataset?.fileName.replace(/\.[^.]+$/, "") ?? "datos"}.csv`, exportReadingsCsv(aggregated), "text/csv;charset=utf-8"); }
  async function exportPdf() {
    if (!dataset || !summary) return;
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFillColor(15, 23, 42); pdf.rect(0, 0, 210, 28, "F"); pdf.setTextColor(255, 255, 255); pdf.setFontSize(18); pdf.text("SOLARIS · Análisis eléctrico", 14, 18);
    pdf.setTextColor(15, 23, 42); pdf.setFontSize(10); let y = 38;
    const lines = [`Archivo: ${dataset.fileName}`, `Hoja: ${dataset.sheetName} · encabezado fila ${dataset.headerRow}`, `Periodo: ${new Date(summary.start).toLocaleString("es-MX")} — ${new Date(summary.end).toLocaleString("es-MX")}`, `Registros: ${dataset.rowCount} · retransmisiones: ${dataset.retransmissionCount} · intervalo típico: ${dataset.intervalMinutes} min`, `Potencia máxima: ${formatNumber(summary.maxPowerKw, " kW")} · promedio: ${formatNumber(summary.averagePowerKw, " kW")}`, `Energía del periodo: ${formatNumber(summary.periodEnergyKwh, " kWh")} · FP promedio: ${formatNumber(summary.averagePowerFactor)}`, `Balance entre fases: ${formatNumber(summary.phaseBalancePercent, "%")} · patrones: ${patterns.length}`];
    lines.forEach((line) => { pdf.text(line, 14, y); y += 6; });
    const powerTrend = analysisBase.filter((reading) => reading.family === "power" && reading.phase === "combined");
    if (powerTrend.length > 1) {
      y += 3; pdf.setFontSize(11); pdf.text("Tendencia de potencia combinada", 14, y); y += 4;
      const sampled = powerTrend.filter((_, index) => index % Math.max(1, Math.ceil(powerTrend.length / 120)) === 0);
      const values = sampled.map((reading) => reading.value), min = Math.min(...values), max = Math.max(...values), span = Math.max(max - min, 1);
      pdf.setDrawColor(219, 227, 239); pdf.rect(14, y, 180, 34); pdf.setDrawColor(37, 99, 235); pdf.setLineWidth(.45);
      sampled.slice(1).forEach((reading, index) => { const x1 = 14 + index / (sampled.length - 1) * 180, x2 = 14 + (index + 1) / (sampled.length - 1) * 180; const y1 = y + 32 - (sampled[index].value - min) / span * 30, y2 = y + 32 - (reading.value - min) / span * 30; pdf.line(x1, y1, x2, y2); });
      pdf.setFontSize(7); pdf.setTextColor(100); pdf.text(`${min.toFixed(1)}—${max.toFixed(1)} kW`, 15, y + 39); pdf.setTextColor(15, 23, 42); y += 45;
    }
    y += 2; pdf.setFontSize(13); pdf.text("Hallazgos adaptativos", 14, y); y += 7; pdf.setFontSize(9);
    (patterns.length ? patterns : [{ title: "Sin hallazgos relevantes", description: "No se detectaron desviaciones persistentes con la sensibilidad seleccionada.", recommendation: "Continuar observando periodos adicionales." }]).slice(0, 18).forEach((pattern) => { const text = pdf.splitTextToSize(`${pattern.title}: ${pattern.description} Recomendación: ${pattern.recommendation}`, 178); if (y + text.length * 4 > 278) { pdf.addPage(); y = 18; } pdf.text(text, 16, y); y += text.length * 4 + 4; });
    if (y > 255) { pdf.addPage(); y = 18; } pdf.setFontSize(8); pdf.setTextColor(100); pdf.text(pdf.splitTextToSize("Análisis estadístico comparativo. No constituye certificación, dictamen normativo ni diagnóstico eléctrico definitivo.", 180), 14, 280);
    pdf.save(`solaris-${dataset.fileName.replace(/\.[^.]+$/, "")}.pdf`);
  }

  if (!dataset) return (
    <div className="mx-auto grid min-h-[70vh] max-w-5xl place-items-center">
      <Card className="w-full overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-12 text-white md:px-12">
          <Badge className="mb-5 bg-white/10 text-blue-100">Procesamiento 100% local</Badge>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">Convierte una exportación Growatt en evidencia eléctrica comprensible.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">Carga un XLS, XLSX o CSV para validar columnas, comparar fases, explorar tendencias y detectar patrones adaptativos. El archivo nunca sale de tu navegador.</p>
        </div>
        <CardContent className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div><div className="font-semibold">Inicia un análisis</div><div className="mt-1 text-sm text-muted-foreground">Máximo 35 MB. Compatible con encabezados desplazados y metadatos preliminares.</div>{message ? <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</div> : null}</div>
          <input ref={inputRef} type="file" className="hidden" accept=".xls,.xlsx,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) loadFile(file); }} />
          <Button className="h-12 px-6" onClick={() => inputRef.current?.click()} disabled={status === "loading"}>{status === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{status === "loading" ? "Analizando…" : "Seleccionar archivo"}</Button>
        </CardContent>
      </Card>
    </div>
  );

  return <div className="flex flex-col gap-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-primary"><Activity className="size-4" />Análisis activo</div><h1 className="mt-2 text-3xl font-semibold">{dataset.fileName}</h1><p className="mt-2 text-sm text-muted-foreground">{dataset.sheetName} · {dataset.rowCount.toLocaleString("es-MX")} registros · {dataset.columns.length} columnas · datos locales</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setDataset(null); setFilters(null); setMessage(""); }}><RefreshCw className="size-4" />Nuevo archivo</Button>{step === "analysis" ? <><Button variant="outline" onClick={exportCsv}><Download className="size-4" />CSV filtrado</Button><Button onClick={exportPdf}><FileText className="size-4" />Reporte PDF</Button></> : null}</div>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      {[{ n: 1, title: "Importar", done: true }, { n: 2, title: "Validar y mapear", done: step === "analysis" }, { n: 3, title: "Analizar y exportar", done: false }].map((item) => <div key={item.n} className={`flex items-center gap-3 rounded-lg border p-3 ${item.done ? "border-green-200 bg-green-50/60" : "border-border bg-card"}`}><span className={`grid size-8 place-items-center rounded-full text-sm font-semibold ${item.done ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"}`}>{item.done ? <CheckCircle2 className="size-4" /> : item.n}</span><span className="text-sm font-medium">{item.title}</span></div>)}
    </div>

    {step === "review" ? <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Filas detectadas" value={String(dataset.rowCount)} icon={FileSpreadsheet} /><Metric label="Intervalo típico" value={`${dataset.intervalMinutes} min`} icon={Activity} /><Metric label="Retransmisiones" value={String(dataset.retransmissionCount)} icon={RefreshCw} /><Metric label="Variables eléctricas" value={String(availableColumns.length)} icon={Zap} /><Metric label="Periodo" value={`${new Date(dataset.start).toLocaleDateString("es-MX")} · 1 archivo`} icon={ShieldCheck} /></section>
      {dataset.issues.length ? <Card><CardHeader><CardTitle>Observaciones de importación</CardTitle></CardHeader><CardContent className="grid gap-2">{dataset.issues.map((issue) => <div key={issue.id} className="flex gap-2 rounded-md bg-muted/60 p-3 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />{issue.message}</div>)}</CardContent></Card> : null}
      <Card><CardHeader><CardTitle>Revisión de columnas</CardTitle><CardDescription>Confirma la familia y la fase antes de iniciar. Las columnas desconocidas quedan fuera del análisis.</CardDescription></CardHeader><CardContent><div className="max-h-[520px] overflow-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Origen</TableHead><TableHead>Familia</TableHead><TableHead>Fase</TableHead><TableHead>Unidad</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{dataset.columns.map((column) => <TableRow key={`${column.index}-${column.sourceHeader}`}><TableCell className="min-w-64 font-medium">{column.sourceHeader}</TableCell><TableCell><select className="h-9 rounded-md border border-border bg-card px-2 text-sm" value={column.family} onChange={(event) => setDataset(updateColumnMapping(dataset, column.index, event.target.value as ElectricalFamily, column.phase))}>{families.map((family) => <option key={family.value} value={family.value}>{family.label}</option>)}</select></TableCell><TableCell><select className="h-9 rounded-md border border-border bg-card px-2 text-sm" value={column.phase} onChange={(event) => setDataset(updateColumnMapping(dataset, column.index, column.family, event.target.value as ElectricalPhase))}>{phases.map((phase) => <option key={phase} value={phase}>{phase === "none" ? "Sin fase" : phase === "combined" ? "Combinada" : phase}</option>)}</select></TableCell><TableCell>{column.standardUnit || "—"}{column.multiplier !== 1 ? <div className="text-xs text-muted-foreground">{column.sourceUnit} × {column.multiplier}</div> : null}</TableCell><TableCell><Badge variant={column.recognized ? "success" : "secondary"}>{column.recognized ? "Reconocida" : "Omitida"}</Badge></TableCell></TableRow>)}</TableBody></Table></div><div className="mt-5 flex justify-end"><Button onClick={() => setStep("analysis")}><BarChart3 className="size-4" />Iniciar análisis</Button></div></CardContent></Card>
    </> : null}

    {step === "analysis" && filters && summary ? <>
      <Card><CardHeader><CardTitle>Filtros del análisis</CardTitle><CardDescription>Los cálculos, gráficas y exportaciones reflejan esta selección.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label className="text-xs font-medium text-muted-foreground">Desde<input className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" type="datetime-local" value={toLocalInput(filters.start)} onChange={(event) => patchFilters({ start: fromLocalInput(event.target.value) })} /></label><label className="text-xs font-medium text-muted-foreground">Hasta<input className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" type="datetime-local" value={toLocalInput(filters.end)} onChange={(event) => patchFilters({ end: fromLocalInput(event.target.value) })} /></label><label className="text-xs font-medium text-muted-foreground">Resolución<select className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" value={filters.aggregationMinutes} onChange={(event) => patchFilters({ aggregationMinutes: Number(event.target.value) as AggregationMinutes })}><option value={0}>Original</option><option value={5}>5 minutos</option><option value={15}>15 minutos</option><option value={30}>30 minutos</option><option value={60}>60 minutos</option></select></label><label className="text-xs font-medium text-muted-foreground">Sensibilidad<select className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" value={sensitivity} onChange={(event) => setSensitivity(event.target.value as Sensitivity)}><option value="low">Baja</option><option value="normal">Normal</option><option value="high">Alta</option></select></label></div><div><div className="mb-2 text-xs font-medium text-muted-foreground">Familias</div><div className="flex flex-wrap gap-2">{families.filter((item) => item.value !== "other").map((item) => <Toggle key={item.value} active={filters.families.includes(item.value)} onClick={() => toggleFilter("families", item.value)}>{item.label}</Toggle>)}</div></div><div><div className="mb-2 text-xs font-medium text-muted-foreground">Fases</div><div className="flex flex-wrap gap-2">{phases.filter((phase) => phase !== "none").map((phase) => <Toggle key={phase} active={filters.phases.includes(phase)} onClick={() => toggleFilter("phases", phase)}>{phase === "combined" ? "Combinada" : phase}</Toggle>)}</div></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.includeRetransmissions} onChange={(event) => patchFilters({ includeRetransmissions: event.target.checked })} />Incluir registros marcados IsAgain</label></CardContent></Card>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Potencia máxima" value={formatNumber(summary.maxPowerKw, " kW")} icon={Zap} /><Metric label="Potencia promedio" value={formatNumber(summary.averagePowerKw, " kW")} icon={Activity} /><Metric label="Energía del periodo" value={formatNumber(summary.periodEnergyKwh, " kWh")} icon={Gauge} /><Metric label="FP promedio" value={formatNumber(summary.averagePowerFactor)} icon={ShieldCheck} /><Metric label="Balance de fases" value={formatNumber(summary.phaseBalancePercent, "%")} icon={BarChart3} /></section>
      <Card><CardHeader><CardTitle>Series temporales</CardTitle><CardDescription>Selecciona hasta ocho variables. Arrastra horizontalmente sobre la gráfica para acercar el periodo.</CardDescription></CardHeader><CardContent><div className="mb-4 flex max-h-28 flex-wrap gap-2 overflow-auto">{availableColumns.map((column) => <Toggle key={column.targetId} active={selectedVariables.includes(column.targetId)} onClick={() => setSelectedVariables((current) => current.includes(column.targetId) ? current.filter((id) => id !== column.targetId) : current.length < 8 ? [...current, column.targetId] : current)}>{column.displayName}</Toggle>)}</div>{chartData.length && chartColumns.length ? <ElectricalDataChart data={chartData} columns={chartColumns} zoom={zoom} onZoom={setZoom} /> : <div className="grid h-72 place-items-center rounded-md bg-muted/40 text-sm text-muted-foreground">Selecciona variables compatibles con los filtros.</div>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Patrones detectados</CardTitle><CardDescription>Desviaciones relativas al comportamiento del archivo; no son límites normativos.</CardDescription></CardHeader><CardContent>{patterns.length ? <div className="grid gap-3 lg:grid-cols-2">{patterns.map((pattern) => <article key={pattern.id} className="rounded-lg border border-border p-4"><div className="flex items-center justify-between gap-3"><Badge variant={severityVariant(pattern.severity)}>{pattern.severity === "critical" ? "Crítico" : pattern.severity === "warning" ? "Advertencia" : "Información"}</Badge><span className="text-xs text-muted-foreground">{new Date(pattern.start).toLocaleString("es-MX")}</span></div><h3 className="mt-3 font-semibold">{pattern.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{pattern.description}</p>{pattern.evidence.map((evidence) => <div key={`${evidence.metric}-${evidence.observed}`} className="mt-3 rounded-md bg-muted/60 p-3 text-sm"><span className="font-semibold">{evidence.metric}: </span>{evidence.observed.toLocaleString("es-MX", { maximumFractionDigits: 2 })} {evidence.unit}{evidence.baseline !== undefined ? ` · línea base ${evidence.baseline.toLocaleString("es-MX", { maximumFractionDigits: 2 })}` : ""}<div className="mt-1 text-xs text-muted-foreground">{evidence.detail}</div></div>)}<p className="mt-3 text-sm"><span className="font-semibold">Recomendación: </span>{pattern.recommendation}</p></article>)}</div> : <div className="grid min-h-40 place-items-center rounded-md bg-green-50 text-sm text-green-800"><div className="text-center"><CheckCircle2 className="mx-auto mb-2 size-6" />No se detectaron desviaciones persistentes con esta sensibilidad.</div></div>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Datos filtrados</CardTitle><CardDescription>{aggregated.length.toLocaleString("es-MX")} lecturas normalizadas. Vista limitada a 200 filas.</CardDescription></CardHeader><CardContent><div className="max-h-[420px] overflow-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Variable</TableHead><TableHead>Fase</TableHead><TableHead>Valor</TableHead><TableHead>Calidad</TableHead></TableRow></TableHeader><TableBody>{aggregated.slice(0, 200).map((reading, index) => <TableRow key={`${reading.timestamp}-${reading.variableId}-${index}`}><TableCell className="whitespace-nowrap">{new Date(reading.timestamp).toLocaleString("es-MX")}</TableCell><TableCell>{reading.displayName}</TableCell><TableCell>{reading.phase}</TableCell><TableCell className="font-mono">{reading.value.toLocaleString("es-MX", { maximumFractionDigits: 3 })} {reading.unit}</TableCell><TableCell><Badge variant={reading.quality === "valid" ? "success" : "warning"}>{reading.quality === "valid" ? "Válida" : "Retransmisión"}</Badge></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
    </> : null}
  </div>;
}
