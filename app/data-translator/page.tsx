import { ArrowDown, Check, FileUp, Factory, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { DataTranslatorWorkbench } from "@/components/data-translator-workbench";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import growattTemplate from "@/data-translator/mappings/growatt/max-export.csv.json";
import huaweiTemplate from "@/data-translator/mappings/huawei/sun2000-daily-export.json";
import solisTemplate from "@/data-translator/mappings/solis/cloud-export-v1.json";
import type { TranslatorTemplate } from "@/types/data-translator";

const steps = [
  { title: "Subir archivo", icon: FileUp, detail: "CSV, XLSX o exportacion del fabricante" },
  { title: "Detectar fabricante", icon: Factory, detail: "Firma por hojas, encabezados y columnas" },
  { title: "Normalizar informacion", icon: ShieldCheck, detail: "Correccion manual de asignaciones" },
  { title: "Generar formato SOLARIS", icon: FileSpreadsheet, detail: "Plantilla JSON reusable" },
];

const brands = ["Huawei", "Growatt", "SMA", "Solis", "GoodWe", "Fronius"];

const officialTemplates = [huaweiTemplate, growattTemplate, solisTemplate] as TranslatorTemplate[];

export default function DataTranslatorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Data Translator</h1>
        <p className="mt-2 text-sm text-muted-foreground">Biblioteca de plantillas para homologar exportaciones solares sin backend.</p>
      </div>
      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Flujo de normalizacion</CardTitle>
            <CardDescription>Lectura local del archivo, deteccion de encabezados y aplicacion de la mejor plantilla.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="relative">
                    <div className="flex min-h-44 flex-col justify-between rounded-lg border border-border bg-card p-4">
                      <div className="flex size-11 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <div className="font-semibold">{step.title}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                      </div>
                    </div>
                    {index < steps.length - 1 ? (
                      <div className="hidden md:absolute md:-right-3 md:top-1/2 md:block md:-translate-y-1/2">
                        <ArrowDown className="size-5 -rotate-90 text-muted-foreground" />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Compatibilidad</CardTitle>
            <CardDescription>Fabricantes considerados para la biblioteca MVP.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {brands.map((brand) => (
              <div key={brand} className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="font-medium">{brand}</span>
                <Check className="size-4 text-green-600" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
      <DataTranslatorWorkbench officialTemplates={officialTemplates} />
    </div>
  );
}
