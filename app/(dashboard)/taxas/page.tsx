import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { getFeesReport } from "@/lib/services/report-service";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TaxasPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const report = await getFeesReport(period);

  return (
    <div className="space-y-6">
      <PageHeader title="Taxas" description="Taxas por tipo, novas taxas detectadas e pendencias de classificacao." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-3">
        {report.totals.map((row) => (
          <Card key={row.name}>
            <CardHeader><CardTitle>{row.name}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{currency(row.amount)}</CardContent>
          </Card>
        ))}
      </div>
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
