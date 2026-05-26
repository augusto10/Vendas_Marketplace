import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSalesReport } from "@/lib/services/report-service";
import { parsePeriod } from "@/lib/period";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VendasPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const rows = await getSalesReport(period);
  const total = rows.reduce((sum, row) => sum + Number(row.totalAmount), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Vendas fiscais" description="Notas, pedidos, unidades, frete, ICMS e DIFAL por periodo.">
        <Button asChild variant="outline">
          <a href={`/api/v1/reports?type=sales&format=xlsx&start=${period.query.start}&end=${period.query.end}`}>
            <Download className="h-4 w-4" />
            Excel
          </a>
        </Button>
      </PageHeader>
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Total vendido</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(total)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Notas</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{rows.length}</CardContent></Card>
        <Card><CardHeader><CardTitle>Unidades</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{rows.reduce((sum, row) => sum + row.quantity, 0)}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Detalhamento fiscal</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Emissao</TableHead><TableHead>Documento</TableHead><TableHead>Pedido</TableHead><TableHead>UF</TableHead><TableHead>Qtde</TableHead><TableHead>Total</TableHead><TableHead>ICMS</TableHead><TableHead>DIFAL</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.slice(0, 100).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.emissionDate.toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{row.documentNumber}</TableCell>
                  <TableCell>{row.customerOrder}</TableCell>
                  <TableCell>{row.state}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                  <TableCell>{currency(row.totalAmount.toString())}</TableCell>
                  <TableCell>{currency(row.icmsAmount.toString())}</TableCell>
                  <TableCell>{currency(row.estimatedDifal.toString())}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
