import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { getSalesReport, getFiscalRules } from "@/lib/services/report-service";
import { currency, percent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FiscalPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const [invoices, rules] = await Promise.all([getSalesReport(period), getFiscalRules()]);
  const icms = invoices.reduce((sum, row) => sum + Number(row.icmsAmount), 0);
  const difal = invoices.reduce((sum, row) => sum + Number(row.estimatedDifal), 0);
  const base = invoices.reduce((sum, row) => sum + Number(row.taxableBase), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Analise fiscal" description="ICMS, base de calculo, DIFAL estimado e regras por UF." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Base de calculo</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(base)}</CardContent></Card>
        <Card><CardHeader><CardTitle>ICMS</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(icms)}</CardContent></Card>
        <Card><CardHeader><CardTitle>DIFAL estimado</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(difal)}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Regras estaduais</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>UF</TableHead><TableHead>Interna</TableHead><TableHead>Interestadual</TableHead><TableHead>FCP</TableHead><TableHead>Vigencia</TableHead></TableRow></TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.uf}</TableCell>
                  <TableCell>{percent(rule.internalRate.toString())}</TableCell>
                  <TableCell>{percent(rule.interstateRate.toString())}</TableCell>
                  <TableCell>{percent(rule.fcpRate.toString())}</TableCell>
                  <TableCell>{rule.validFrom.toLocaleDateString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
