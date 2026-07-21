import type { NormalizedVariable, SheetPreview, VisualizationAggregation, VisualizationInterval } from "@/types/data-translator";

export type ChartRow = { timestamp: string; estimated?: boolean } & Record<string, number | string | boolean | null | undefined>;

const intervalMinutes: Record<VisualizationInterval, number | null> = {
  original: null,
  "1m": 1,
  "5m": 5,
  "10m": 10,
  "15m": 15,
  "30m": 30,
  "60m": 60,
  "1d": 1440,
};

function parseNumber(value: string) {
  const numeric = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function parseDate(value: string, fallbackLabel: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const today = new Date("2026-07-15T00:00:00");
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isFinite(hours) && Number.isFinite(minutes)) {
    today.setHours(hours, minutes, 0, 0);
    return today;
  }
  return new Date(fallbackLabel);
}

function bucketKey(date: Date, interval: VisualizationInterval) {
  const minutes = intervalMinutes[interval];
  if (!minutes) return date.toISOString();
  const bucket = Math.floor(date.getTime() / (minutes * 60_000)) * minutes * 60_000;
  return new Date(bucket).toISOString();
}

function methodFor(variable: NormalizedVariable, aggregation: VisualizationAggregation) {
  if (aggregation !== "automatic") return aggregation;
  return variable.defaultAggregation;
}

function aggregate(values: Array<number | null>, method: Exclude<VisualizationAggregation, "automatic">) {
  const clean = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!clean.length) return null;
  if (method === "first") return clean[0];
  if (method === "last") return clean[clean.length - 1];
  if (method === "min") return Math.min(...clean);
  if (method === "max") return Math.max(...clean);
  if (method === "sum") return clean.reduce((sum, value) => sum + value, 0);
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

export function findTimestampColumn(sheet: SheetPreview) {
  const index = sheet.headers.findIndex((header) => /time|tiempo|fecha|timestamp/i.test(header));
  return index >= 0 ? index : 0;
}

export function buildTimeSeries({
  sheet,
  variables,
  selectedIds,
  interval,
  aggregation,
  dateStart,
  dateEnd,
  timeStart,
  timeEnd,
}: {
  sheet: SheetPreview;
  variables: NormalizedVariable[];
  selectedIds: string[];
  interval: VisualizationInterval;
  aggregation: VisualizationAggregation;
  dateStart?: string;
  dateEnd?: string;
  timeStart?: string;
  timeEnd?: string;
}) {
  const selected = variables.filter((variable) => selectedIds.includes(variable.fieldId));
  const timestampIndex = findTimestampColumn(sheet);
  const dataRows = sheet.rows.slice(sheet.headerRow + 1);
  const buckets = new Map<string, { date: Date; values: Record<string, Array<number | null>> }>();

  dataRows.forEach((row, rowIndex) => {
    const timestampRaw = row[timestampIndex] || row[1] || String(rowIndex);
    const date = parseDate(timestampRaw, `2026-07-15T00:${String(rowIndex).padStart(2, "0")}:00`);
    const datePart = date.toISOString().slice(0, 10);
    const timePart = date.toTimeString().slice(0, 5);
    if (dateStart && datePart < dateStart) return;
    if (dateEnd && datePart > dateEnd) return;
    if (timeStart && timePart < timeStart) return;
    if (timeEnd && timePart > timeEnd) return;

    const key = bucketKey(date, interval);
    const bucket = buckets.get(key) ?? { date, values: {} };
    selected.forEach((variable) => {
      bucket.values[variable.fieldId] ??= [];
      bucket.values[variable.fieldId].push(parseNumber(row[variable.columnIndex]));
    });
    buckets.set(key, bucket);
  });

  return Array.from(buckets.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([, bucket]) => {
      const item: ChartRow = { timestamp: bucket.date.toISOString().slice(0, 16).replace("T", " ") };
      selected.forEach((variable) => {
        item[variable.fieldId] = aggregate(bucket.values[variable.fieldId] ?? [], methodFor(variable, aggregation));
      });
      return item;
    });
}

export function toCsv(rows: ChartRow[], variables: NormalizedVariable[]) {
  const headers = ["timestamp", ...variables.map((variable) => variable.displayName)];
  const lines = rows.map((row) =>
    ["timestamp", ...variables.map((variable) => variable.fieldId)]
      .map((key) => {
        const value = row[key];
        return `"${String(value ?? "").replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}
