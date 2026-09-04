"use client";

import { useRef } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartDatum, ImportedColumn } from "@/types/electrical-analysis";
import { seriesColor } from "@/lib/electrical-analysis";

export function ElectricalDataChart({ data, columns, zoom, onZoom }: { data: ChartDatum[]; columns: ImportedColumn[]; zoom: { start?: string; end?: string }; onZoom: (zoom: { start?: string; end?: string }) => void }) {
  const visible = data.filter((row) => (!zoom.start || row.timestamp >= zoom.start) && (!zoom.end || row.timestamp <= zoom.end));
  const dragStart = useRef("");
  return (
    <div>
      <div className="h-[390px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visible} margin={{ top: 8, right: 12, bottom: 10, left: 0 }} onMouseDown={(event) => { dragStart.current = String(event?.activeLabel ?? ""); }} onMouseUp={(event) => { const end = String(event?.activeLabel ?? ""); const start = dragStart.current; if (start && end) onZoom({ start: start < end ? start : end, end: start < end ? end : start }); dragStart.current = ""; }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} minTickGap={36} />
            <YAxis yAxisId="left" width={58} />
            <YAxis yAxisId="right" orientation="right" width={58} />
            <Tooltip labelFormatter={(value) => new Date(String(value)).toLocaleString("es-MX")} formatter={(value, name) => [typeof value === "number" ? value.toLocaleString("es-MX", { maximumFractionDigits: 3 }) : value, columns.find((column) => column.targetId === name)?.displayName ?? name]} />
            <Legend formatter={(value) => columns.find((column) => column.targetId === value)?.displayName ?? value} />
            {columns.map((column, index) => <Line key={column.targetId} yAxisId={index % 2 ? "right" : "left"} type="monotone" dataKey={column.targetId} stroke={seriesColor(index)} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />)}
            {zoom.start && zoom.end ? <ReferenceArea x1={zoom.start} x2={zoom.end} strokeOpacity={0.2} /> : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {zoom.start ? <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => onZoom({})}>Restablecer zoom</button> : null}
    </div>
  );
}
