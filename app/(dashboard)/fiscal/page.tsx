import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { getSalesReport } from "@/lib/services/report-service";
import { currency, percent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FiscalPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const invoices = await getSalesReport(period);
  const icms = invoices.reduce((sum, row) => sum + Number(row.icmsAmount), 0);
  const difal = invoices.reduce((sum, row) => sum + Number(row.estimatedDifal), 0);
  const base = invoices.reduce((sum, row) => sum + Number(row.taxableBase), 0);
  const ufRows = getUfTaxRows(invoices);

  return (
    <div className="space-y-6">
      <PageHeader title="Analise fiscal" description="ICMS, base de calculo, DIFAL estimado e percentual por UF." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Base de calculo</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(base)}</CardContent></Card>
        <Card><CardHeader><CardTitle>ICMS</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(icms)}</CardContent></Card>
        <Card><CardHeader><CardTitle>DIFAL estimado</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(difal)}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Percentual por UF</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>UF</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Vendas</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>ICMS</TableHead>
                <TableHead>% ICMS sobre venda</TableHead>
                <TableHead>DIFAL</TableHead>
                <TableHead>% DIFAL sobre venda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ufRows.map((row) => (
                <TableRow key={row.uf}>
                  <TableCell className="font-semibold">{row.uf}</TableCell>
                  <TableCell>{row.invoices.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{currency(row.sales)}</TableCell>
                  <TableCell>{currency(row.base)}</TableCell>
                  <TableCell>{currency(row.icms)}</TableCell>
                  <TableCell>{percent(row.icmsPercent)}</TableCell>
                  <TableCell>{currency(row.difal)}</TableCell>
                  <TableCell>{percent(row.difalPercent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function getUfTaxRows(invoices: Awaited<ReturnType<typeof getSalesReport>>) {
  const grouped = new Map<string, { uf: string; invoices: number; sales: number; base: number; icms: number; difal: number }>();

  for (const invoice of invoices) {
    const uf = invoice.state || "N/D";
    const current = grouped.get(uf) ?? { uf, invoices: 0, sales: 0, base: 0, icms: 0, difal: 0 };
    current.invoices += 1;
    current.sales += Number(invoice.totalAmount ?? 0);
    current.base += Number(invoice.taxableBase ?? 0);
    current.icms += Number(invoice.icmsAmount ?? 0);
    current.difal += Number(invoice.estimatedDifal ?? 0);
    grouped.set(uf, current);
  }

  return [...grouped.values()]
    .map((row) => ({
      ...row,
      icmsPercent: row.sales ? (row.icms / row.sales) * 100 : 0,
      difalPercent: row.sales ? (row.difal / row.sales) * 100 : 0
    }))
    .sort((left, right) => right.sales - left.sales);
}
