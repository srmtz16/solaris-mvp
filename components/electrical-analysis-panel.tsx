"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Activity, BarChart3, Gauge, Thermometer, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  DetectedPattern,
  ElectricalDataPoint,
  ElectricalMetric,
  ElectricalSide,
  ElectricalViewMode,
  Inverter,
  Installation,
  MpptId,
  Phase,
} from "@/types/solaris";

type Period = "today" | "yesterday" | "week" | "month" | "custom";
type Resolution = "5m" | "15m" | "hour" | "day";
type Series = { key: string; name: string; color: string };
type ChartRow = Record<string, number | string> & {
  timestamp: string;
  time: string;
  frequencyHz: number;
  powerFactor: number;
  reactivePowerKvar: number;
  inverterTemperatureC: number;
  irradianceWm2: number;
};

const colors = ["#2563EB", "#FACC15", "#16A34A", "#DC2626", "#7C3AED", "#0891B2"];
const phases: Phase[] = ["L1", "L2", "L3"];
const mpptOptions: Array<MpptId | "all"> = ["all", "MPPT 1", "MPPT 2", "MPPT 3", "MPPT 4"];

const periodLabels: Record<Period, string> = {
  today: "Hoy",
  yesterday: "Ayer",
  week: "Semana",
  month: "Mes",
  custom: "Personalizado",
};

const resolutionLabels: Record<Resolution, string> = {
  "5m": "5 minutos",
  "15m": "15 minutos",
  hour: "Hora",
  day: "Dia",
};

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function getPointMetric(point: ElectricalDataPoint, metric: "voltage" | "current" | "power", side: ElectricalSide, phase: Phase) {
  if (side === "dc") {
    if (metric === "voltage") return point.voltageDc;
    if (metric === "current") return point.currentDc;
    return point.powerDc;
  }

  if (metric === "voltage") return point[`voltageAc${phase}`];
  if (metric === "current") return point[`currentAc${phase}`];
  return point.activePowerKw;
}

function aggregateRows(rows: ChartRow[], resolution: Resolution) {
  const groupSize = resolution === "day" ? rows.length : resolution === "hour" ? 4 : 1;
  if (groupSize <= 1) return rows;

  const grouped: ChartRow[] = [];
  for (let index = 0; index < rows.length; index += groupSize) {
    const group = rows.slice(index, index + groupSize);
    const keys = Object.keys(group[0] ?? {}).filter((key) => !["timestamp", "time"].includes(key));
    const row: ChartRow = {
      timestamp: String(group[0]?.timestamp ?? ""),
      time: resolution === "day" ? "Dia" : String(group[0]?.time ?? ""),
      frequencyHz: 0,
      powerFactor: 0,
      reactivePowerKvar: 0,
      inverterTemperatureC: 0,
      irradianceWm2: 0,
    };

    keys.forEach((key) => {
      row[key] = round(average(group.map((item) => Number(item[key] ?? 0))), key.includes("powerFactor") ? 3 : 2);
    });
    grouped.push(row);
  }
  return grouped;
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground outline-none transition-colors focus:border-blue-500"
      >
        {children}
      </select>
    </label>
  );
}

function SegmentedButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-md border border-border px-3 text-sm font-medium transition-colors",
        active ? "border-blue-600 bg-blue-50 text-blue-700" : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SynchronizedTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-56 rounded-lg border border-border bg-white p-3 text-xs shadow-lg">
      <div className="mb-2 font-semibold text-foreground">{label}</div>
      <div className="flex flex-col gap-1">
        {payload.map((item) => (
          <div key={`${item.name}-${item.color}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="font-mono font-semibold text-foreground">{typeof item.value === "number" ? round(item.value, 2) : item.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-border pt-2 text-muted-foreground">Tooltip sincronizado por timestamp.</div>
    </div>
  );
}

function ElectricalChart({
  title,
  unit,
  data,
  series,
  syncId,
  highlighted = false,
}: {
  title: string;
  unit: string;
  data: ChartRow[];
  series: Series[];
  syncId: string;
  highlighted?: boolean;
}) {
  return (
    <Card className={highlighted ? "border-blue-300 shadow-md shadow-blue-100" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          {highlighted ? <Badge>Variable seleccionada</Badge> : null}
        </div>
        <CardDescription>Eje vertical independiente en {unit}. Comparte eje de tiempo con las otras graficas.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} syncId={syncId} margin={{ left: -8, right: 12, top: 10, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis axisLine={false} tickLine={false} width={54} unit={` ${unit}`} />
            <Tooltip content={<SynchronizedTooltip />} />
            <Legend iconType="circle" />
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={`${item.name} (${unit})`}
                stroke={item.color}
                strokeWidth={2.2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function severityVariant(severity: DetectedPattern["severity"]) {
  if (severity === "critical") return "destructive";
  if (severity === "warning") return "warning";
  return "success";
}

export function ElectricalAnalysisPanel({
  initialPlantId,
  plants,
  inverters,
  electricalData,
  patterns,
}: {
  initialPlantId: string;
  plants: Installation[];
  inverters: Inverter[];
  electricalData: ElectricalDataPoint[];
  patterns: DetectedPattern[];
}) {
  const [plantId, setPlantId] = useState(initialPlantId);
  const plantInverters = useMemo(() => inverters.filter((inverter) => inverter.plantId === plantId), [inverters, plantId]);
  const [viewMode, setViewMode] = useState<ElectricalViewMode>("plant");
  const [side, setSide] = useState<ElectricalSide>("dc");
  const [phase, setPhase] = useState<Phase>("L1");
  const [mppt, setMppt] = useState<MpptId | "all">("all");
  const [period, setPeriod] = useState<Period>("today");
  const [resolution, setResolution] = useState<Resolution>("15m");
  const [compareMetric, setCompareMetric] = useState<ElectricalMetric>("power");
  const [normalizePower, setNormalizePower] = useState(false);
  const [selectedInverterId, setSelectedInverterId] = useState(plantInverters[0]?.id ?? "");

  const selectedPlant = plants.find((plant) => plant.id === plantId) ?? plants[0];
  const selectedInverter = plantInverters.find((inverter) => inverter.id === selectedInverterId) ?? plantInverters[0];

  const effectiveInverterId = selectedInverter?.id ?? "";

  const filteredRawData = useMemo(
    () => electricalData.filter((point) => point.plantId === plantId),
    [electricalData, plantId],
  );

  const { voltageRows, currentRows, powerRows, voltageSeries, currentSeries, powerSeries, secondary } = useMemo(() => {
    const timestamps = Array.from(new Set(filteredRawData.map((point) => point.timestamp))).sort();
    const baseSecondary = {
      frequencyHz: 0,
      powerFactor: 0,
      reactivePowerKvar: 0,
      inverterTemperatureC: 0,
      irradianceWm2: 0,
    };

    if (viewMode === "compare") {
      const visibleInverters = plantInverters;
      const voltageSeries = visibleInverters.map((inverter, index) => ({ key: `voltage_${inverter.id}`, name: inverter.name, color: colors[index % colors.length] }));
      const currentSeries = visibleInverters.map((inverter, index) => ({ key: `current_${inverter.id}`, name: inverter.name, color: colors[index % colors.length] }));
      const powerSeries = visibleInverters.map((inverter, index) => ({ key: `power_${inverter.id}`, name: inverter.name, color: colors[index % colors.length] }));

      const rows = timestamps.map((timestamp) => {
        const points = filteredRawData.filter((point) => point.timestamp === timestamp);
        const voltageRow: ChartRow = { timestamp, time: formatTime(timestamp), ...baseSecondary };
        const currentRow: ChartRow = { timestamp, time: formatTime(timestamp), ...baseSecondary };
        const powerRow: ChartRow = { timestamp, time: formatTime(timestamp), ...baseSecondary };

        visibleInverters.forEach((inverter) => {
          const point = points.find((item) => item.inverterId === inverter.id);
          if (!point) return;
          const normalizedPower = normalizePower ? (point.activePowerKw / inverter.nominalPowerKw) * 100 : point.activePowerKw;
          voltageRow[`voltage_${inverter.id}`] = getPointMetric(point, "voltage", side, phase);
          currentRow[`current_${inverter.id}`] = getPointMetric(point, "current", side, phase);
          powerRow[`power_${inverter.id}`] = side === "dc" ? point.powerDc : round(normalizedPower, 2);
        });

        const secondaryPoints = points.filter((point) => point.activePowerKw > 0);
        voltageRow.frequencyHz = round(average(secondaryPoints.map((point) => point.frequencyHz)), 2);
        voltageRow.powerFactor = round(average(secondaryPoints.map((point) => point.powerFactor)), 3);
        voltageRow.reactivePowerKvar = round(secondaryPoints.reduce((sum, point) => sum + point.reactivePowerKvar, 0), 2);
        voltageRow.inverterTemperatureC = round(average(secondaryPoints.map((point) => point.inverterTemperatureC)), 1);
        voltageRow.irradianceWm2 = round(average(points.map((point) => point.irradianceWm2)), 0);
        Object.assign(currentRow, {
          frequencyHz: voltageRow.frequencyHz,
          powerFactor: voltageRow.powerFactor,
          reactivePowerKvar: voltageRow.reactivePowerKvar,
          inverterTemperatureC: voltageRow.inverterTemperatureC,
          irradianceWm2: voltageRow.irradianceWm2,
        });
        Object.assign(powerRow, {
          frequencyHz: voltageRow.frequencyHz,
          powerFactor: voltageRow.powerFactor,
          reactivePowerKvar: voltageRow.reactivePowerKvar,
          inverterTemperatureC: voltageRow.inverterTemperatureC,
          irradianceWm2: voltageRow.irradianceWm2,
        });
        return { voltageRow, currentRow, powerRow };
      });

      const secondaryLast = rows.findLast((row) => Number(row.powerRow.irradianceWm2) > 0)?.powerRow ?? rows.at(-1)?.powerRow ?? { ...baseSecondary };
      return {
        voltageRows: aggregateRows(rows.map((row) => row.voltageRow), resolution),
        currentRows: aggregateRows(rows.map((row) => row.currentRow), resolution),
        powerRows: aggregateRows(rows.map((row) => row.powerRow), resolution),
        voltageSeries,
        currentSeries,
        powerSeries,
        secondary: secondaryLast,
      };
    }

    const rows = timestamps.map((timestamp) => {
      const points = filteredRawData.filter((point) => point.timestamp === timestamp);
      const activePoints = viewMode === "plant" ? points : points.filter((point) => point.inverterId === effectiveInverterId);
      const voltageRow: ChartRow = { timestamp, time: formatTime(timestamp), ...baseSecondary };
      const currentRow: ChartRow = { timestamp, time: formatTime(timestamp), ...baseSecondary };
      const powerRow: ChartRow = { timestamp, time: formatTime(timestamp), ...baseSecondary };

      if (viewMode === "plant") {
        const totalActivePower = activePoints.reduce((sum, point) => sum + point.activePowerKw, 0);
        const totalDcPower = activePoints.reduce((sum, point) => sum + point.powerDc, 0);
        const producing = activePoints.filter((point) => point.activePowerKw > 0);
        const avgAcVoltage = average(producing.flatMap((point) => [point.voltageAcL1, point.voltageAcL2, point.voltageAcL3]));
        const avgPowerFactor = average(producing.map((point) => point.powerFactor)) || 0.97;
        const meterCurrent = avgAcVoltage > 0 ? (totalActivePower * 1000) / (Math.sqrt(3) * avgAcVoltage * avgPowerFactor) : 0;

        voltageRow.voltage = side === "ac" ? round(avgAcVoltage + 2.5 * Math.sin(new Date(timestamp).getUTCMinutes()), 1) : round(average(producing.map((point) => point.voltageDc)), 1);
        currentRow.current = side === "ac" ? round(meterCurrent, 1) : round(average(producing.map((point) => point.currentDc)), 1);
        powerRow.power = side === "ac" ? round(totalActivePower, 2) : round(totalDcPower, 2);
      } else {
        const point = activePoints[0];
        if (point && side === "dc") {
          const selectedMppts = mppt === "all" ? point.mpptValues : point.mpptValues.filter((value) => value.mpptId === mppt);
          selectedMppts.forEach((value, index) => {
            voltageRow[`voltage_${value.mpptId}`] = value.voltageDc;
            currentRow[`current_${value.mpptId}`] = value.currentDc;
            powerRow[`power_${value.mpptId}`] = value.powerDc;
            voltageRow[`seriesName_${index}`] = value.mpptId;
          });
        }
        if (point && side === "ac") {
          const selectedPhases = phase ? [phase] : phases;
          selectedPhases.forEach((selectedPhase) => {
            voltageRow[`voltage_${selectedPhase}`] = point[`voltageAc${selectedPhase}`];
            currentRow[`current_${selectedPhase}`] = point[`currentAc${selectedPhase}`];
          });
          powerRow.power = point.activePowerKw;
        }
      }

      const secondaryPoints = activePoints.filter((point) => point.activePowerKw > 0);
      voltageRow.frequencyHz = round(average(secondaryPoints.map((point) => point.frequencyHz)), 2);
      voltageRow.powerFactor = round(average(secondaryPoints.map((point) => point.powerFactor)), 3);
      voltageRow.reactivePowerKvar = round(secondaryPoints.reduce((sum, point) => sum + point.reactivePowerKvar, 0), 2);
      voltageRow.inverterTemperatureC = round(average(secondaryPoints.map((point) => point.inverterTemperatureC)), 1);
      voltageRow.irradianceWm2 = round(average(activePoints.map((point) => point.irradianceWm2)), 0);
      Object.assign(currentRow, {
        frequencyHz: voltageRow.frequencyHz,
        powerFactor: voltageRow.powerFactor,
        reactivePowerKvar: voltageRow.reactivePowerKvar,
        inverterTemperatureC: voltageRow.inverterTemperatureC,
        irradianceWm2: voltageRow.irradianceWm2,
      });
      Object.assign(powerRow, {
        frequencyHz: voltageRow.frequencyHz,
        powerFactor: voltageRow.powerFactor,
        reactivePowerKvar: voltageRow.reactivePowerKvar,
        inverterTemperatureC: voltageRow.inverterTemperatureC,
        irradianceWm2: voltageRow.irradianceWm2,
      });
      return { voltageRow, currentRow, powerRow };
    });

    const voltageSeries =
      viewMode === "plant"
        ? [{ key: "voltage", name: side === "ac" ? "Medidor principal" : "Promedio inversores", color: "#2563EB" }]
        : side === "dc"
          ? (mppt === "all" ? mpptOptions.filter((item) => item !== "all") : [mppt]).map((item, index) => ({
              key: `voltage_${item}`,
              name: String(item),
              color: colors[index % colors.length],
            }))
          : [phase].map((item, index) => ({ key: `voltage_${item}`, name: item, color: colors[index % colors.length] }));
    const currentSeries =
      viewMode === "plant"
        ? [{ key: "current", name: side === "ac" ? "Medidor principal" : "Promedio inversores", color: "#16A34A" }]
        : side === "dc"
          ? (mppt === "all" ? mpptOptions.filter((item) => item !== "all") : [mppt]).map((item, index) => ({
              key: `current_${item}`,
              name: String(item),
              color: colors[index % colors.length],
            }))
          : [phase].map((item, index) => ({ key: `current_${item}`, name: item, color: colors[index % colors.length] }));
    const powerSeries =
      viewMode === "plant"
        ? [{ key: "power", name: side === "ac" ? "Potencia activa total" : "Potencia DC total", color: "#FACC15" }]
        : side === "dc"
          ? (mppt === "all" ? mpptOptions.filter((item) => item !== "all") : [mppt]).map((item, index) => ({
              key: `power_${item}`,
              name: String(item),
              color: colors[index % colors.length],
            }))
          : [{ key: "power", name: "Potencia activa", color: "#FACC15" }];

    const secondaryLast = rows.findLast((row) => Number(row.powerRow.irradianceWm2) > 0)?.powerRow ?? rows.at(-1)?.powerRow ?? { ...baseSecondary };
    return {
      voltageRows: aggregateRows(rows.map((row) => row.voltageRow), resolution),
      currentRows: aggregateRows(rows.map((row) => row.currentRow), resolution),
      powerRows: aggregateRows(rows.map((row) => row.powerRow), resolution),
      voltageSeries,
      currentSeries,
      powerSeries,
      secondary: secondaryLast,
    };
  }, [effectiveInverterId, filteredRawData, mppt, normalizePower, phase, plantInverters, resolution, side, viewMode]);

  function handlePlantChange(nextPlantId: string) {
    setPlantId(nextPlantId);
    const nextInverter = inverters.find((inverter) => inverter.plantId === nextPlantId);
    setSelectedInverterId(nextInverter?.id ?? "");
  }

  const plantNote =
    viewMode === "plant" && side === "dc"
      ? "Planta completa: potencia DC total sumada; voltaje y corriente DC mostrados como promedio de inversores, no como total."
      : viewMode === "plant"
        ? "Planta completa: potencia activa total sumada; voltaje y corriente provienen del medidor principal simulado."
        : viewMode === "compare"
          ? "Comparar inversores: cada serie representa un inversor. La normalizacion convierte potencia AC en porcentaje de potencia nominal."
          : "Vista de inversor: se muestran exclusivamente las mediciones del inversor seleccionado.";

  const highlightedUnit = compareMetric === "power" ? (normalizePower ? "%" : "kW") : compareMetric === "current" ? "A" : "V";
  const chartDefinitions = [
    {
      metric: "voltage" as const,
      title: side === "dc" ? "Voltaje DC" : "Voltaje AC",
      unit: "V",
      data: voltageRows,
      series: voltageSeries,
    },
    {
      metric: "current" as const,
      title: side === "dc" ? "Corriente DC" : "Corriente AC",
      unit: "A",
      data: currentRows,
      series: currentSeries,
    },
    {
      metric: "power" as const,
      title: side === "dc" ? "Potencia DC" : normalizePower && viewMode === "compare" ? "Potencia normalizada" : "Potencia activa",
      unit: normalizePower && viewMode === "compare" && side === "ac" ? "%" : "kW",
      data: powerRows,
      series: powerSeries,
    },
  ].sort((first, second) => {
    if (viewMode !== "compare") return 0;
    if (first.metric === compareMetric) return -1;
    if (second.metric === compareMetric) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Detalle electrico por planta e inversor</CardTitle>
          <CardDescription>Jerarquia Cliente → Planta → Inversor → MPPT / Fase, con datos simulados de 15 minutos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SelectField label="Planta" value={plantId} onChange={handlePlantChange}>
              {plants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Inversor" value={effectiveInverterId} onChange={setSelectedInverterId}>
              {plantInverters.map((inverter) => (
                <option key={inverter.id} value={inverter.id}>
                  {inverter.name} · {inverter.nominalPowerKw} kW
                </option>
              ))}
            </SelectField>
            <SelectField label="Periodo" value={period} onChange={(value) => setPeriod(value as Period)}>
              {Object.entries(periodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <SelectField label="Resolucion" value={resolution} onChange={(value) => setResolution(value as Resolution)}>
              {Object.entries(resolutionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr]">
            <div className="flex flex-wrap gap-2">
              <SegmentedButton active={viewMode === "plant"} onClick={() => setViewMode("plant")}>
                Planta completa
              </SegmentedButton>
              <SegmentedButton active={viewMode === "inverter"} onClick={() => setViewMode("inverter")}>
                Inversor
              </SegmentedButton>
              <SegmentedButton active={viewMode === "compare"} onClick={() => setViewMode("compare")}>
                Comparar inversores
              </SegmentedButton>
            </div>
            <div className="flex flex-wrap gap-2">
              <SegmentedButton active={side === "dc"} onClick={() => setSide("dc")}>
                Lado DC
              </SegmentedButton>
              <SegmentedButton active={side === "ac"} onClick={() => setSide("ac")}>
                Lado AC
              </SegmentedButton>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <SelectField label="Fase" value={phase} onChange={(value) => setPhase(value as Phase)}>
                {phases.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>
              <SelectField label="MPPT" value={mppt} onChange={(value) => setMppt(value as MpptId | "all")}>
                {mpptOptions.map((item) => (
                  <option key={item} value={item}>
                    {item === "all" ? "Todos" : item}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          {period === "custom" ? (
            <div className="grid gap-3 rounded-lg border border-border bg-muted/40 p-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Desde
                <input className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground" type="date" defaultValue="2026-07-10" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Hasta
                <input className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground" type="date" defaultValue="2026-07-10" />
              </label>
            </div>
          ) : null}

          {viewMode === "compare" ? (
            <div className="grid gap-3 rounded-lg border border-border bg-muted/40 p-3 lg:grid-cols-[220px_1fr]">
              <SelectField label="Variable destacada" value={compareMetric} onChange={(value) => setCompareMetric(value as ElectricalMetric)}>
                <option value="power">Potencia</option>
                <option value="current">Corriente</option>
                <option value="voltage">Voltaje</option>
              </SelectField>
              <label className="flex items-center gap-3 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={normalizePower}
                  onChange={(event) => setNormalizePower(event.target.checked)}
                  className="size-4 rounded border-border"
                />
                Normalizar por capacidad {compareMetric === "power" ? `(${highlightedUnit})` : "(aplica a potencia)"}
              </label>
            </div>
          ) : null}

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">{plantNote}</div>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Activity className="size-5 text-blue-600" />
            <div>
              <div className="text-xs text-muted-foreground">Frecuencia</div>
              <div className="font-semibold">{round(Number(secondary.frequencyHz), 2)} Hz</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Gauge className="size-5 text-green-600" />
            <div>
              <div className="text-xs text-muted-foreground">Factor de potencia</div>
              <div className="font-semibold">{round(Number(secondary.powerFactor), 3)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Zap className="size-5 text-yellow-600" />
            <div>
              <div className="text-xs text-muted-foreground">Reactiva</div>
              <div className="font-semibold">{round(Number(secondary.reactivePowerKvar), 1)} kVAr</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Thermometer className="size-5 text-red-600" />
            <div>
              <div className="text-xs text-muted-foreground">Temp. inversor</div>
              <div className="font-semibold">{round(Number(secondary.inverterTemperatureC), 1)} C</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <BarChart3 className="size-5 text-blue-600" />
            <div>
              <div className="text-xs text-muted-foreground">Irradiancia</div>
              <div className="font-semibold">{round(Number(secondary.irradianceWm2), 0)} W/m2</div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4">
        {chartDefinitions.map((chart) => (
          <ElectricalChart
            key={chart.metric}
            title={chart.title}
            unit={chart.unit}
            data={chart.data}
            series={chart.series}
            syncId="electrical-detail"
            highlighted={viewMode === "compare" && chart.metric === compareMetric}
          />
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Patrones detectados</CardTitle>
          <CardDescription>Hallazgos simulados para explicar el potencial analitico de SOLARIS.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {patterns.map((pattern) => (
            <div key={pattern.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant={severityVariant(pattern.severity)}>
                  <AlertTriangle className="size-3" />
                  {pattern.severity === "critical" ? "Critica" : pattern.severity === "warning" ? "Advertencia" : "Normal"}
                </Badge>
                <span className="text-xs text-muted-foreground">{pattern.detectedPeriod}</span>
              </div>
              <div className="mt-3 text-sm font-semibold">{pattern.affectedEquipment}</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{pattern.description}</p>
              <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                <span className="font-semibold">Recomendacion: </span>
                {pattern.recommendation}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Datos mostrados para {selectedPlant.name}
        {selectedInverter ? ` · ${selectedInverter.name}` : ""}. Periodo seleccionado: {periodLabels[period]}; resolucion: {resolutionLabels[resolution]}.
      </div>
    </div>
  );
}
