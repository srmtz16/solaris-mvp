import * as XLSX from "xlsx";
import type {
  AdaptivePattern,
  AggregationMinutes,
  AnalysisFilters,
  AnalysisSummary,
  ChartDatum,
  ElectricalFamily,
  ElectricalPhase,
  ImportedColumn,
  ImportedDataset,
  NormalizedReading,
  Sensitivity,
} from "@/types/electrical-analysis";

type WorkbookLike = XLSX.WorkBook;

const HEADER_HINTS = ["time", "fecha", "voltage", "voltaje", "current", "corriente", "power", "potencia", "frequency", "factor", "energy", "energia"];
const PALETTE = ["#2563eb", "#f59e0b", "#16a34a", "#dc2626", "#8b5cf6", "#0891b2", "#db2777", "#64748b"];

const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const finite = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, "").replace(/[^0-9eE+.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

function phaseFromHeader(header: string): ElectricalPhase {
  const h = normalize(header);
  if (/\buab\b|line voltage ab|phase ab/.test(h)) return "AB";
  if (/\bubc\b|line voltage bc|phase bc/.test(h)) return "BC";
  if (/\buca\b|line voltage ca|phase ca/.test(h)) return "CA";
  if (/phase a|\bua\b|\bia\b/.test(h)) return "A";
  if (/phase b|\bub\b|\bib\b/.test(h)) return "B";
  if (/phase c|\buc\b|\bic\b/.test(h)) return "C";
  if (/combined|convergence|total/.test(h)) return "combined";
  return "none";
}

export function classifyColumn(sourceHeader: string, index: number): ImportedColumn {
  const h = normalize(sourceHeader);
  if (/^datalog sn$|^data log sn$|^serial number$|^numero de serie$/.test(h)) {
    return { index, sourceHeader, targetId: "serial_number", displayName: "Número de serie", family: "other", phase: "none", sourceUnit: "", standardUnit: "", multiplier: 1, recognized: true };
  }
  if (/^time$|^timestamp$|^fecha hora$|^fecha y hora$/.test(h)) {
    return { index, sourceHeader, targetId: "timestamp", displayName: "Fecha y hora", family: "other", phase: "none", sourceUnit: "datetime", standardUnit: "datetime", multiplier: 1, recognized: true };
  }
  let family: ElectricalFamily = "other";
  if (/voltage|voltaje/.test(h)) family = "voltage";
  else if (/current|corriente/.test(h)) family = "current";
  else if (/power factor|factor de potencia|convergence power factor/.test(h)) family = "power_factor";
  else if (/frequency|frecuencia/.test(h)) family = "frequency";
  else if (/energy|energia/.test(h)) family = "energy";
  else if (/power|potencia/.test(h)) family = "power";
  const sourceUnit = /\(v\)|voltage|voltaje/.test(h) ? "V" : /\(a\)|current|corriente/.test(h) ? "A" : /power factor|factor/.test(h) ? "" : /frequency|frecuencia/.test(h) ? "Hz" : /energy|energia/.test(h) ? "kWh" : /\(w\)|power|potencia/.test(h) ? "W" : "";
  const standardUnit = family === "power" && sourceUnit === "W" ? "kW" : sourceUnit;
  const multiplier = family === "power" && sourceUnit === "W" ? 0.001 : 1;
  const phase = phaseFromHeader(sourceHeader);
  const recognized = family !== "other" || /time|fecha|datalog|device|serial|isagain/.test(h);
  const slug = h.replace(/\s+/g, "_") || `column_${index + 1}`;
  return { index, sourceHeader, targetId: slug, displayName: sourceHeader, family, phase, sourceUnit, standardUnit, multiplier, recognized };
}

function findHeaderRow(rows: unknown[][]) {
  let best = { index: 0, score: -1 };
  rows.slice(0, 30).forEach((row, index) => {
    const cells = row.map(normalize);
    const score = cells.filter((cell) => HEADER_HINTS.some((hint) => cell.includes(hint))).length * 4 + cells.filter(Boolean).length;
    if (score > best.score) best = { index, score };
  });
  return best.index;
}

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && value > 20_000) return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
  const parsed = new Date(String(value ?? "").replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function quantile(values: number[], q: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)))];
}

export function importElectricalWorkbook(workbook: WorkbookLike, fileName: string, timezone = "America/Mexico_City"): ImportedDataset {
  const candidates = workbook.SheetNames.map((name) => {
    const rows = (XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: null, blankrows: true }) as unknown[][]);
    const headerRow = findHeaderRow(rows);
    return { name, rows, headerRow, score: (rows[headerRow] ?? []).filter(Boolean).length + rows.length / 1000 };
  }).sort((a, b) => b.score - a.score);
  const selected = candidates[0];
  if (!selected || !selected.rows.length) throw new Error("No se encontró una hoja con datos legibles.");
  const headers = (selected.rows[selected.headerRow] ?? []).map((value, index) => String(value ?? `Columna ${index + 1}`).trim());
  const columns = headers.map(classifyColumn);
  const timeIndex = headers.findIndex((header) => /\btime\b|fecha|timestamp/.test(normalize(header)));
  const deviceIndex = headers.findIndex((header) => /datalog|device|serial|inverter|medidor/.test(normalize(header)));
  const retransmissionIndex = headers.findIndex((header) => /isagain|retrans/.test(normalize(header)));
  if (timeIndex < 0) throw new Error("No se encontró una columna de fecha y hora.");
  const metadata: Record<string, string> = {};
  for (let rowIndex = 0; rowIndex + 1 < selected.headerRow; rowIndex += 2) {
    const labels = selected.rows[rowIndex] ?? [];
    const values = selected.rows[rowIndex + 1] ?? [];
    labels.forEach((label, index) => { if (label && values[index] !== null && values[index] !== undefined) metadata[String(label)] = String(values[index]); });
  }
  const readings: NormalizedReading[] = [];
  const rowTimes: number[] = [];
  let retransmissionCount = 0;
  let invalidRowCount = 0;
  const dataRows = selected.rows.slice(selected.headerRow + 1).filter((row) => row.some((value) => value !== null && value !== ""));
  dataRows.forEach((row, dataIndex) => {
    const date = dateValue(row[timeIndex]);
    if (!date) { invalidRowCount += 1; return; }
    const retransmission = /true|1|yes|si/i.test(String(row[retransmissionIndex] ?? ""));
    if (retransmission) retransmissionCount += 1;
    rowTimes.push(date.getTime());
    columns.forEach((column) => {
      if (column.family === "other") return;
      const rawValue = finite(row[column.index]);
      if (rawValue === null) return;
      readings.push({
        timestamp: date.toISOString(), deviceId: String(row[deviceIndex] ?? metadata["datalog_sn"] ?? "Dispositivo"), variableId: column.targetId,
        sourceHeader: column.sourceHeader, displayName: column.displayName, family: column.family, phase: column.phase,
        value: rawValue * column.multiplier, rawValue, unit: column.standardUnit, sourceUnit: column.sourceUnit,
        quality: retransmission ? "retransmission" : "valid", sourceRow: selected.headerRow + dataIndex + 2,
      });
    });
  });
  const sortedTimes = [...new Set(rowTimes)].sort((a, b) => a - b);
  const intervals = sortedTimes.slice(1).map((time, index) => (time - sortedTimes[index]) / 60_000).filter((value) => value > 0.25);
  const intervalMinutes = Math.round(median(intervals) * 100) / 100;
  const unrecognized = columns.filter((column) => !column.recognized && column.sourceHeader).length;
  const issues = [
    ...(retransmissionCount ? [{ id: "retransmissions", severity: "info" as const, message: `${retransmissionCount} registros están marcados como retransmisiones (IsAgain).` }] : []),
    ...(unrecognized ? [{ id: "unrecognized", severity: "warning" as const, message: `${unrecognized} columnas no fueron reconocidas y se conservarán fuera del análisis.` }] : []),
    ...(invalidRowCount ? [{ id: "invalid-dates", severity: "error" as const, message: `${invalidRowCount} filas no tienen una fecha válida.` }] : []),
  ];
  return {
    fileName, sheetName: selected.name, headerRow: selected.headerRow + 1, timezone, metadata, columns, issues, readings,
    rowCount: dataRows.length, validRowCount: dataRows.length - invalidRowCount, retransmissionCount, invalidRowCount, intervalMinutes,
    start: sortedTimes.length ? new Date(sortedTimes[0]).toISOString() : "", end: sortedTimes.length ? new Date(sortedTimes.at(-1)!).toISOString() : "",
  };
}

export function updateColumnMapping(dataset: ImportedDataset, columnIndex: number, family: ElectricalFamily, phase: ElectricalPhase): ImportedDataset {
  const oldColumn = dataset.columns[columnIndex];
  const columns = dataset.columns.map((column, index) => index === columnIndex ? { ...column, family, phase, recognized: family !== "other" } : column);
  const readings = dataset.readings.map((reading) => reading.sourceHeader === oldColumn.sourceHeader ? { ...reading, family, phase } : reading);
  return { ...dataset, columns, readings };
}

export function defaultFilters(dataset: ImportedDataset): AnalysisFilters {
  return { start: dataset.start, end: dataset.end, deviceIds: [], families: [], phases: [], variableIds: [], includeRetransmissions: false, aggregationMinutes: 0 };
}

export function filterReadings(readings: NormalizedReading[], filters: AnalysisFilters) {
  const start = filters.start ? new Date(filters.start).getTime() : -Infinity;
  const end = filters.end ? new Date(filters.end).getTime() : Infinity;
  return readings.filter((reading) => {
    const time = new Date(reading.timestamp).getTime();
    return time >= start && time <= end && (filters.includeRetransmissions || reading.quality !== "retransmission")
      && (!filters.deviceIds.length || filters.deviceIds.includes(reading.deviceId))
      && (!filters.families.length || filters.families.includes(reading.family))
      && (!filters.phases.length || filters.phases.includes(reading.phase))
      && (!filters.variableIds.length || filters.variableIds.includes(reading.variableId));
  });
}

export function aggregateReadings(readings: NormalizedReading[], minutes: AggregationMinutes) {
  if (!minutes) return [...readings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const bucketMs = minutes * 60_000;
  const groups = new Map<string, NormalizedReading[]>();
  readings.forEach((reading) => {
    const bucket = Math.floor(new Date(reading.timestamp).getTime() / bucketMs) * bucketMs;
    const key = `${bucket}|${reading.deviceId}|${reading.variableId}`;
    groups.set(key, [...(groups.get(key) ?? []), reading]);
  });
  return [...groups.entries()].map(([key, group]) => {
    const bucket = Number(key.split("|")[0]);
    const first = group[0];
    const cumulative = first.family === "energy" && /total/.test(normalize(first.sourceHeader));
    const value = cumulative ? group.at(-1)!.value : group.reduce((sum, item) => sum + item.value, 0) / group.length;
    return { ...first, timestamp: new Date(bucket).toISOString(), value, rawValue: first.value ? value / first.value * first.rawValue : value };
  }).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function readingsToChartData(readings: NormalizedReading[]): ChartDatum[] {
  const rows = new Map<string, ChartDatum>();
  readings.forEach((reading) => {
    const row = rows.get(reading.timestamp) ?? { timestamp: reading.timestamp, label: new Date(reading.timestamp).toLocaleString("es-MX", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }) };
    row[reading.variableId] = reading.value;
    rows.set(reading.timestamp, row);
  });
  return [...rows.values()].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
}

function byVariable(readings: NormalizedReading[]) {
  const groups = new Map<string, NormalizedReading[]>();
  readings.forEach((reading) => groups.set(reading.variableId, [...(groups.get(reading.variableId) ?? []), reading]));
  groups.forEach((group) => group.sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
  return groups;
}

export function detectAdaptivePatterns(readings: NormalizedReading[], expectedInterval: number, sensitivity: Sensitivity = "normal") {
  if (!readings.length) return [];
  const patterns: AdaptivePattern[] = [];
  const factor = sensitivity === "high" ? 1.15 : sensitivity === "low" ? 2.25 : 1.5;
  const times = [...new Set(readings.map((reading) => new Date(reading.timestamp).getTime()))].sort((a, b) => a - b);
  times.slice(1).forEach((time, index) => {
    const gap = (time - times[index]) / 60_000;
    if (expectedInterval && gap > expectedInterval * 1.6) patterns.push({ id: `gap-${time}`, kind: "gap", severity: gap > expectedInterval * 4 ? "critical" : "warning", title: "Hueco de medición", description: `Se observó un intervalo de ${gap.toFixed(1)} min frente a una cadencia típica de ${expectedInterval.toFixed(1)} min.`, recommendation: "Revisar conectividad y disponibilidad del registrador durante este periodo.", start: new Date(times[index]).toISOString(), end: new Date(time).toISOString(), variableIds: [], phases: [], evidence: [{ metric: "intervalo", observed: gap, baseline: expectedInterval, unit: "min", detail: "Separación entre muestras consecutivas" }] });
  });
  byVariable(readings).forEach((group, variableId) => {
    if (group.length < 12) return;
    const values = group.map((reading) => reading.value);
    const center = median(values);
    const q1 = quantile(values, .25), q3 = quantile(values, .75), spread = Math.max(q3 - q1, Math.abs(center) * .01, .0001);
    const outliers = group.filter((reading) => reading.value < q1 - factor * spread || reading.value > q3 + factor * spread);
    if (outliers.length >= 2 && outliers.length <= group.length * .2) {
      const extreme = outliers.reduce((best, item) => Math.abs(item.value - center) > Math.abs(best.value - center) ? item : best, outliers[0]);
      patterns.push({ id: `outlier-${variableId}`, kind: "outlier", severity: Math.abs(extreme.value - center) > spread * factor * 2 ? "critical" : "warning", title: `Valores atípicos en ${group[0].displayName}`, description: `${outliers.length} muestras se apartan de la distribución habitual de esta variable.`, recommendation: "Contrastar el periodo con carga, maniobras y eventos del medidor.", start: outliers[0].timestamp, end: outliers.at(-1)!.timestamp, variableIds: [variableId], phases: [group[0].phase], evidence: [{ metric: group[0].displayName, observed: extreme.value, baseline: center, unit: group[0].unit, detail: `Mediana ${center.toFixed(2)}; rango intercuartil ${spread.toFixed(2)}` }] });
    }
    const deltas = group.slice(1).map((reading, index) => ({ reading, delta: Math.abs(reading.value - group[index].value) }));
    const deltaValues = deltas.map((item) => item.delta), deltaQ3 = quantile(deltaValues, .75), deltaSpread = Math.max(deltaQ3 - quantile(deltaValues, .25), Math.abs(center) * .005, .0001);
    const jumps = deltas.filter((item) => item.delta > deltaQ3 + factor * 2 * deltaSpread);
    if (jumps.length >= 2 && jumps.length <= group.length * .15) patterns.push({ id: `jump-${variableId}`, kind: "sudden_change", severity: "warning", title: `Cambios bruscos en ${group[0].displayName}`, description: `${jumps.length} transiciones superan la variación habitual entre muestras.`, recommendation: "Revisar si coinciden con conmutaciones, arranques o pérdidas momentáneas.", start: jumps[0].reading.timestamp, end: jumps.at(-1)!.reading.timestamp, variableIds: [variableId], phases: [group[0].phase], evidence: [{ metric: "cambio máximo", observed: Math.max(...jumps.map((item) => item.delta)), baseline: median(deltaValues), unit: group[0].unit, detail: "Diferencia absoluta entre muestras consecutivas" }] });
    let longest = 1, current = 1, flatStart = 0, bestStart = 0;
    for (let index = 1; index < values.length; index += 1) { if (Math.abs(values[index] - values[index - 1]) < Math.max(Math.abs(center) * .0001, .00001)) current += 1; else { current = 1; flatStart = index; } if (current > longest) { longest = current; bestStart = flatStart; } }
    if (longest >= 12 && new Set(values).size > 1) patterns.push({ id: `flat-${variableId}`, kind: "flatline", severity: "warning", title: `Señal congelada en ${group[0].displayName}`, description: `${longest} muestras consecutivas repiten prácticamente el mismo valor.`, recommendation: "Comprobar sensor, comunicación y resolución del registro.", start: group[bestStart].timestamp, end: group[Math.min(group.length - 1, bestStart + longest - 1)].timestamp, variableIds: [variableId], phases: [group[0].phase], evidence: [{ metric: "muestras repetidas", observed: longest, detail: "Secuencia de valores sin variación apreciable" }] });
    if (group[0].family === "energy" && /total/.test(normalize(group[0].sourceHeader))) {
      const resets = group.slice(1).filter((reading, index) => reading.value < group[index].value - spread);
      if (resets.length) patterns.push({ id: `reset-${variableId}`, kind: "counter_reset", severity: "critical", title: `Retroceso del contador ${group[0].displayName}`, description: "El acumulado disminuyó respecto a la muestra anterior.", recommendation: "Validar reinicio, reemplazo del medidor o transformación de unidades.", start: resets[0].timestamp, end: resets.at(-1)!.timestamp, variableIds: [variableId], phases: [group[0].phase], evidence: [{ metric: "retrocesos", observed: resets.length, detail: "Descensos en una variable acumulativa" }] });
    }
  });
  (["voltage", "current", "power"] as ElectricalFamily[]).forEach((family) => {
    const familyReadings = readings.filter((reading) => reading.family === family && ["A", "B", "C"].includes(reading.phase));
    const timestampGroups = new Map<string, NormalizedReading[]>();
    familyReadings.forEach((reading) => timestampGroups.set(reading.timestamp, [...(timestampGroups.get(reading.timestamp) ?? []), reading]));
    const scores = [...timestampGroups.entries()].map(([timestamp, group]) => { const vals = group.map((item) => Math.abs(item.value)); const avg = vals.reduce((sum, value) => sum + value, 0) / vals.length; return { timestamp, score: avg ? (Math.max(...vals) - Math.min(...vals)) / avg * 100 : 0, group }; }).filter((item) => item.group.length >= 3);
    if (scores.length >= 12) { const baseline = median(scores.map((item) => item.score)), threshold = quantile(scores.map((item) => item.score), .75) + factor * Math.max(quantile(scores.map((item) => item.score), .75) - quantile(scores.map((item) => item.score), .25), .25); const abnormal = scores.filter((item) => item.score > threshold); if (abnormal.length >= 2 && abnormal.length <= scores.length * .2) { const max = abnormal.reduce((best, item) => item.score > best.score ? item : best, abnormal[0]); patterns.push({ id: `imbalance-${family}`, kind: "imbalance", severity: max.score > threshold * 1.8 ? "critical" : "warning", title: `Desbalance atípico de ${family === "power" ? "potencia" : family === "current" ? "corriente" : "voltaje"}`, description: `${abnormal.length} instantes muestran una separación entre fases superior a su comportamiento habitual.`, recommendation: "Comparar cargas por fase y revisar conexiones durante el intervalo.", start: abnormal[0].timestamp, end: abnormal.at(-1)!.timestamp, variableIds: [...new Set(max.group.map((item) => item.variableId))], phases: ["A", "B", "C"], evidence: [{ metric: "desbalance", observed: max.score, baseline, unit: "%", detail: "Rango entre fases relativo a su promedio" }] }); } }
  });
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return patterns.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.start.localeCompare(b.start));
}

export function summarizeAnalysis(dataset: ImportedDataset, readings: NormalizedReading[], patterns: AdaptivePattern[]): AnalysisSummary {
  const power = readings.filter((reading) => reading.family === "power" && reading.phase === "combined").map((reading) => reading.value);
  const pf = readings.filter((reading) => reading.family === "power_factor" && reading.phase === "combined").map((reading) => reading.value);
  const totalEnergyGroups = byVariable(readings.filter((reading) => reading.family === "energy" && /total/.test(normalize(reading.sourceHeader))));
  const energyDeltas = [...totalEnergyGroups.values()].map((group) => group.length > 1 ? group.at(-1)!.value - group[0].value : 0).filter((value) => value >= 0);
  const phaseByTime = new Map<string, number[]>();
  readings.filter((reading) => reading.family === "current" && ["A", "B", "C"].includes(reading.phase)).forEach((reading) => phaseByTime.set(reading.timestamp, [...(phaseByTime.get(reading.timestamp) ?? []), Math.abs(reading.value)]));
  const balances = [...phaseByTime.values()].filter((values) => values.length >= 3).map((values) => { const avg = values.reduce((sum, value) => sum + value, 0) / values.length; return avg ? Math.max(0, 100 - (Math.max(...values) - Math.min(...values)) / avg * 100) : 100; });
  const times = readings.map((reading) => reading.timestamp).sort();
  return { start: times[0] ?? dataset.start, end: times.at(-1) ?? dataset.end, readingCount: readings.length, validRowCount: dataset.validRowCount, intervalMinutes: dataset.intervalMinutes, maxPowerKw: power.length ? Math.max(...power) : null, averagePowerKw: power.length ? power.reduce((sum, value) => sum + value, 0) / power.length : null, periodEnergyKwh: energyDeltas.length ? energyDeltas.reduce((sum, value) => sum + value, 0) : null, averagePowerFactor: pf.length ? pf.reduce((sum, value) => sum + value, 0) / pf.length : null, phaseBalancePercent: balances.length ? balances.reduce((sum, value) => sum + value, 0) / balances.length : null, patternCount: patterns.length };
}

export function seriesColor(index: number) { return PALETTE[index % PALETTE.length]; }

export function exportReadingsCsv(readings: NormalizedReading[]) {
  const header = ["timestamp", "device_id", "variable_id", "variable", "family", "phase", "value", "unit", "raw_value", "source_unit", "quality", "source_row"];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return "\ufeff" + [header, ...readings.map((reading) => [reading.timestamp, reading.deviceId, reading.variableId, reading.displayName, reading.family, reading.phase, reading.value, reading.unit, reading.rawValue, reading.sourceUnit, reading.quality, reading.sourceRow])].map((row) => row.map(escape).join(",")).join("\r\n");
}

export function toLocalInput(iso: string) { if (!iso) return ""; const date = new Date(iso); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
export function fromLocalInput(value: string) { return value ? new Date(value).toISOString() : ""; }
