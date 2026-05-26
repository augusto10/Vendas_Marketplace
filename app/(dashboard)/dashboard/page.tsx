import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MonthlySalesChart } from "@/components/charts/monthly-sales-chart";
import { KpiGrid } from "@/features/dashboard/kpi-grid";
import { PeriodFilter } from "@/components/period-filter";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { getDashboardMetrics, getMonthlySales, getRecentUploads, getStateRanking } from "@/lib/services/dashboard-service";
import { parsePeriod } from "@/lib/period";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const [metrics, monthly, states, uploads] = await Promise.all([
    getDashboardMetrics(period),
    getMonthlySales(period),
    getStateRanking(period),
    getRecentUploads()
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command center"
        title="Dashboard executivo"
        description="Visao consolidada de Shopee, fiscal, taxas, recebimentos, devolucoes e DIFAL estimado."
      />
      <PeriodFilter period={period} />

      <KpiGrid metrics={metrics} />

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Vendas por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlySalesChart data={monthly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking por UF</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead>DIFAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {states.map((state) => (
                  <TableRow key={state.uf}>
                    <TableCell>{period.label}</TableCell>
                    <TableCell>{state.uf}</TableCell>
                    <TableCell>{currency(state.vendas)}</TableCell>
                    <TableCell>{currency(state.difal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-4 text-xs text-muted-foreground">DIFAL estimado. Validar com contador.</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Saude das importacoes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Linhas</TableHead>
                <TableHead>Erros</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell>{upload.createdAt.toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="max-w-[360px] truncate">{upload.originalName}</TableCell>
                  <TableCell>{upload.type}</TableCell>
                  <TableCell><Badge>{upload.status}</Badge></TableCell>
                  <TableCell>{upload.rowsRead.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{upload.errorsCount.toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
