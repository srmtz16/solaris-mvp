import { Bot, CheckCircle2, TrendingDown, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const recommendations = [
  {
    title: "Limpieza de modulos",
    detail: "Programar limpieza en Hospital San Gabriel y Logistica Centro para recuperar entre 4% y 7% de produccion.",
    icon: CheckCircle2,
  },
  {
    title: "Revision de inversor principal",
    detail: "Priorizar la Planta Industrial por perdida acumulada estimada de 18.4 MWh durante la semana.",
    icon: Wrench,
  },
  {
    title: "Analisis de sombreado",
    detail: "Validar obstrucciones temporales en Corporativo Santa Fe durante la ventana de 13:00 a 15:00.",
    icon: TrendingDown,
  },
];

export default function AiAnalysisPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Analisis IA</h1>
        <p className="mt-2 text-sm text-muted-foreground">Demostracion conceptual con diagnosticos simulados, sin conexion a IA real.</p>
      </div>
      <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50">
        <CardHeader>
          <div className="flex size-11 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Bot className="size-5" />
          </div>
          <CardTitle className="mt-4 text-xl">Analisis automatico del portafolio</CardTitle>
          <CardDescription>Resultado generado con reglas simuladas para fines de demostracion comercial.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="max-w-4xl text-lg leading-8 text-slate-800">
            El rendimiento promedio del portafolio es del 84%. Tres instalaciones presentan perdidas superiores al 15%.
            Se recomienda limpieza de modulos y revision del inversor principal. La disponibilidad general permanece estable,
            pero la Planta Industrial debe atenderse como prioridad operativa.
          </p>
        </CardContent>
      </Card>
      <section className="grid gap-4 lg:grid-cols-3">
        {recommendations.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-md bg-yellow-50 text-yellow-700">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
