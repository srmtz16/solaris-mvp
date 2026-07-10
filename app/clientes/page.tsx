import { clients } from "@/data/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ClientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Clientes</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cartera comercial simulada con indicadores agregados.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Resumen por cliente</CardTitle>
          <CardDescription>Potencia, generacion, ahorro y alertas operativas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Instalaciones</TableHead>
                <TableHead>Potencia total</TableHead>
                <TableHead>Generacion mensual</TableHead>
                <TableHead>Ahorro</TableHead>
                <TableHead>Alertas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.name}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.installations}</TableCell>
                  <TableCell>{client.totalCapacityKw.toLocaleString("es-MX")} kWp</TableCell>
                  <TableCell>{client.monthlyGenerationMwh.toLocaleString("es-MX")} MWh</TableCell>
                  <TableCell>${client.savingsMxn.toLocaleString("es-MX")} MXN</TableCell>
                  <TableCell>{client.alerts}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
