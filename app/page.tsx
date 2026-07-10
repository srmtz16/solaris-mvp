import { AlertTriangle, Banknote, BatteryCharging, CloudSun, Factory, Leaf, Zap } from "lucide-react";
import { DailyGenerationChart, MonthlyGenerationChart } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dailyGeneration, installations, monthlyGeneration } from "@/data/mock-data";

export default function DashboardPage() {
  const active = installations.filter((item) => item.status !== "critical").length;
  const alerts = installations.reduce((total, item) => total + item.alerts.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">Vista ejecutiva del portafolio fotovoltaico monitoreado por SOLARIS.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Potencia instalada" value="13.6 MWp" detail="10 instalaciones conectadas" icon={Factory} />
        <MetricCard title="Generacion diaria" value="64.6 MWh" detail="+8.4% contra pronostico" icon={Zap} tone="yellow" />
        <MetricCard title="Generacion mensual" value="1.85 GWh" detail="Avance del mes en curso" icon={BatteryCharging} />
        <MetricCard title="CO2 evitado" value="812 t" detail="Equivalente mensual estimado" icon={Leaf} tone="green" />
        <MetricCard title="Ahorro economico" value="$18.9 M" detail="MXN acumulado mensual" icon={Banknote} tone="green" />
        <MetricCard title="Instalaciones activas" value={`${active}/10`} detail="Disponibilidad promedio 97.3%" icon={CloudSun} />
        <MetricCard title="Alertas" value={`${alerts}`} detail="1 critica y 5 advertencias" icon={AlertTriangle} tone="red" />
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generacion diaria</CardTitle>
            <CardDescription>MWh por dia durante la ultima semana.</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyGenerationChart data={dailyGeneration} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Generacion mensual</CardTitle>
            <CardDescription>Produccion consolidada del portafolio.</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyGenerationChart data={monthlyGeneration} />
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Instalaciones principales</CardTitle>
          <CardDescription>Indicadores visuales: verde normal, amarillo advertencia, rojo critica.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instalacion</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Generacion</TableHead>
                <TableHead>Performance Ratio</TableHead>
                <TableHead>Ultima actualizacion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installations.slice(0, 7).map((installation) => (
                <TableRow key={installation.id}>
                  <TableCell className="font-medium">{installation.name}</TableCell>
                  <TableCell>{installation.client}</TableCell>
                  <TableCell>
                    <StatusBadge status={installation.status} />
                  </TableCell>
                  <TableCell>{installation.dailyGenerationMwh.toFixed(2)} MWh</TableCell>
                  <TableCell>{installation.performanceRatio.toFixed(1)}%</TableCell>
                  <TableCell className="text-muted-foreground">{installation.lastUpdate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
