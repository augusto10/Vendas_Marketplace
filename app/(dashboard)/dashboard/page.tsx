import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiGrid } from "@/features/dashboard/kpi-grid";
import { PeriodFilter } from "@/components/period-filter";
import { PageHeader } from "@/components/page-header";
import { getDashboardMetrics, getStateRanking } from "@/lib/services/dashboard-service";
import type { SalesConciliationDateMode } from "@/lib/services/report-service";
import { parsePeriod } from "@/lib/period";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const dateModeLabels: Record<SalesConciliationDateMode, { label: string; description: string }> = {
  erp: { label: "Notas emitidas", description: "Mostrando indicadores pela data da nota fiscal." },
  sale: { label: "Vendas Shopee", description: "Mostrando indicadores pela data da venda na Shopee." },
  payment: { label: "Pagamentos recebidos", description: "Mostrando indicadores pela data em que a Shopee liberou o pagamento." }
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string; dateMode?: string }> }) {
  const params = await searchParams;
  const period = parsePeriod(params);
  const dateMode = params.dateMode === "sale" || params.dateMode === "payment" ? params.dateMode : "erp";
  const [metrics, states] = await Promise.all([
    getDashboardMetrics(period, dateMode),
    getStateRanking(period, dateMode)
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command center"
        title="Dashboard executivo"
        description="Visao consolidada de Shopee, fiscal, taxas, recebimentos, devolucoes e DIFAL estimado."
      />
      <PeriodFilter period={period}>
        <div className="space-y-1.5">
          <label htmlFor="dateMode" className="text-sm font-medium leading-none">
            Ver relatorio por
          </label>
          <select
            id="dateMode"
            name="dateMode"
            defaultValue={dateMode}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="erp">{dateModeLabels.erp.label}</option>
            <option value="sale">{dateModeLabels.sale.label}</option>
            <option value="payment">{dateModeLabels.payment.label}</option>
          </select>
        </div>
      </PeriodFilter>
      <div className="text-sm text-muted-foreground">{dateModeLabels[dateMode].description}</div>

      <KpiGrid metrics={metrics} />

      <div className="grid gap-4">
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
    </div>
  );
}
