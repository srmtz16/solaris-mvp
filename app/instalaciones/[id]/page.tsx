import { notFound } from "next/navigation";
import { AlertTriangle, Gauge, PlugZap, SunMedium } from "lucide-react";
import { ElectricalAnalysisPanel } from "@/components/electrical-analysis-panel";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { detectedPatterns, electricalData, inverters } from "@/data/electrical-data";
import { installations } from "@/data/mock-data";

export default async function InstallationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const installation = installations.find((item) => item.id === id);

  if (!installation) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">{installation.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {installation.client} · {installation.location} · {installation.inverterBrand}
          </p>
        </div>
        <StatusBadge status={installation.status} />
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Potencia instalada" value={`${installation.capacityKw.toLocaleString("es-MX")} kWp`} detail="Capacidad nominal" icon={SunMedium} />
        <MetricCard title="Potencia actual" value={`${installation.currentPowerKw.toLocaleString("es-MX")} kW`} detail="Lectura simulada en vivo" icon={PlugZap} />
        <MetricCard title="Performance Ratio" value={`${installation.performanceRatio.toFixed(1)}%`} detail="Objetivo comercial 85%" icon={Gauge} tone={installation.performanceRatio >= 85 ? "green" : "yellow"} />
        <MetricCard title="Alertas" value={`${installation.alerts.length}`} detail="Eventos operativos activos" icon={AlertTriangle} tone={installation.alerts.length ? "red" : "green"} />
      </section>
      <ElectricalAnalysisPanel
        initialPlantId={installation.id}
        plants={installations}
        inverters={inverters}
        electricalData={electricalData}
        patterns={detectedPatterns}
      />
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
            <CardDescription>Diagnosticos activos para el sitio.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {installation.alerts.length ? (
              installation.alerts.map((alert) => (
                <div key={alert} className="rounded-md border border-border bg-muted/40 p-3 text-sm">{alert}</div>
              ))
            ) : (
              <div className="rounded-md border border-border bg-green-50 p-3 text-sm text-green-700">Sin alertas activas.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Equipos instalados</CardTitle>
            <CardDescription>Inventario tecnico simulado.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {installation.equipment.map((item) => (
              <div key={item} className="rounded-md border border-border bg-card p-3 text-sm">{item}</div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
