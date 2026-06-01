import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, MetricCard, MetricCardContent, MetricCardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { getFeesReport } from "@/lib/services/report-service";
import { cn, currency, moneyToneClass, signedCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TaxasPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const report = await getFeesReport(period);
  const totalFees = report.totals.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Taxas e tarifas" description="Taxas por tipo, novas ocorrencias detectadas e pendencias de classificacao." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-3">
        {report.totals.slice(0, 6).map((row) => (
          <MetricCard key={`${row.source}-${row.name}`}>
            <MetricCardHeader>
              <CardTitle>{row.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{row.count.toLocaleString("pt-BR")} ocorrencias</p>
            </MetricCardHeader>
            <MetricCardContent className={moneyToneClass(row.amount)}>{signedCurrency(row.amount)}</MetricCardContent>
          </MetricCard>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Taxas no periodo</CardTitle>
          <p className="text-sm text-muted-foreground">Valores somados por tipo de taxa dentro do periodo filtrado.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Origem</TableHead><TableHead>Taxa</TableHead><TableHead>Ocorrencias</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader>
            <TableBody>
              {report.totals.map((row) => (
                <TableRow key={`${row.source}-${row.name}`}>
                  <TableCell>{row.source}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.count.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className={cn("font-semibold", moneyToneClass(row.amount))}>{signedCurrency(row.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="sticky bottom-0 bg-muted font-semibold">Total</TableCell>
                <TableCell className={cn("sticky bottom-0 bg-muted font-semibold", moneyToneClass(totalFees))}>{signedCurrency(totalFees)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Taxas detectadas automaticamente</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Origem</TableHead><TableHead>Taxa</TableHead><TableHead>Status</TableHead><TableHead>Primeira vez</TableHead><TableHead>Ultima vez</TableHead></TableRow></TableHeader>
            <TableBody>
              {report.detected.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.source}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell><Badge>{row.status}</Badge></TableCell>
                  <TableCell>{row.firstSeenAt.toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{row.lastSeenAt.toLocaleDateString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
