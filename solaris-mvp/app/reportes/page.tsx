"use client";

import { useState } from "react";
import { Download, FileDown, Mail, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const reports = ["Reporte Ejecutivo", "Reporte Tecnico", "Reporte Ambiental"];

export default function ReportsPage() {
  const [selected, setSelected] = useState(reports[0]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Reportes</h1>
        <p className="mt-2 text-sm text-muted-foreground">Generacion simulada de reportes comerciales y tecnicos.</p>
      </div>
      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tipo de reporte</CardTitle>
            <CardDescription>Selecciona una plantilla simulada.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {reports.map((report) => (
              <button
                key={report}
                onClick={() => setSelected(report)}
                className={cn(
                  "flex min-h-11 items-center justify-between rounded-md border border-border px-3 text-left text-sm font-medium transition-colors",
                  selected === report ? "border-blue-600 bg-blue-50 text-blue-700" : "bg-card hover:bg-muted",
                )}
              >
                {report}
                <PieChart className="size-4" />
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{selected}</CardTitle>
            <CardDescription>Vista previa conceptual para clientes e inversionistas.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="rounded-lg border border-border bg-muted/40 p-5">
              <div className="text-sm text-muted-foreground">Contenido incluido</div>
              <div className="mt-2 text-xl font-semibold">KPIs, graficas, alertas, recomendaciones y resumen ambiental.</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button>
                <FileDown className="size-4" />
                Exportar PDF
              </Button>
              <Button variant="outline">
                <Mail className="size-4" />
                Enviar correo
              </Button>
              <Button variant="secondary">
                <Download className="size-4" />
                Descargar
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
