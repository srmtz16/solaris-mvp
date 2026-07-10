import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { installations } from "@/data/mock-data";

export default function InstallationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Instalaciones</h1>
        <p className="mt-2 text-sm text-muted-foreground">Portafolio simulado con detalle operativo por sitio.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado de instalaciones</CardTitle>
          <CardDescription>Selecciona una instalacion para abrir su vista tecnica.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instalacion</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Ubicacion</TableHead>
                <TableHead>Potencia</TableHead>
                <TableHead>Inversor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Generacion</TableHead>
                <TableHead>PR</TableHead>
                <TableHead>Disponibilidad</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {installations.map((installation) => (
                <TableRow key={installation.id}>
                  <TableCell className="font-medium">{installation.name}</TableCell>
                  <TableCell>{installation.client}</TableCell>
                  <TableCell>{installation.location}</TableCell>
                  <TableCell>{installation.capacityKw.toLocaleString("es-MX")} kWp</TableCell>
                  <TableCell>{installation.inverterBrand}</TableCell>
                  <TableCell>
                    <StatusBadge status={installation.status} />
                  </TableCell>
                  <TableCell>{installation.dailyGenerationMwh.toFixed(2)} MWh</TableCell>
                  <TableCell>{installation.performanceRatio.toFixed(1)}%</TableCell>
                  <TableCell>{installation.availability.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/instalaciones/${installation.id}`}>
                      Ver
                      <ArrowUpRight className="size-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
