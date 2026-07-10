"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "@/types/solaris";

const tooltipStyle = {
  border: "1px solid #dbe3ef",
  borderRadius: 8,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.10)",
};

export function DailyGenerationChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: -12, right: 12, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="generation" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} />
        <YAxis axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="generation" name="Generacion MWh" stroke="#2563EB" strokeWidth={3} fill="url(#generation)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MonthlyGenerationChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: -12, right: 12, top: 10, bottom: 0 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} />
        <YAxis axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="generation" name="Generacion MWh" fill="#FACC15" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MiniSparkline({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={52}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="generation" stroke="#2563EB" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
