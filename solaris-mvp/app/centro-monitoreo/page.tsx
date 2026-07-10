import { MiniSparkline } from "@/components/charts";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dailyGeneration, installations, recentAlerts } from "@/data/mock-data";

export default function MonitoringCenterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Centro de Monitoreo</h1>
        <p className="mt-2 text-sm text-muted-foreground">Vista tipo centro de control para supervision operativa.</p>
      </div>
      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {installations.map((installation) => (
            <Card key={installation.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{installation.name}</CardTitle>
                    <CardDescription>{installation.location}</CardDescription>
                  </div>
                  <StatusBadge status={installation.status} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Potencia actual</div>
                    <div className="font-semibold">{installation.currentPowerKw} kW</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Generacion</div>
                    <div className="font-semibold">{installation.dailyGenerationMwh.toFixed(2)} MWh</div>
                  </div>
                </div>
                <MiniSparkline data={dailyGeneration} />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Alertas recientes</CardTitle>
            <CardDescription>Eventos priorizados del portafolio.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentAlerts.map((alert) => (
              <div key={`${alert.site}-${alert.time}`} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{alert.site}</div>
                  <div className="text-xs text-muted-foreground">{alert.time}</div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{alert.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
