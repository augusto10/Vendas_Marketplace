import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiGrid } from "@/features/dashboard/kpi-grid";
import { PeriodFilter } from "@/components/period-filter";
import { PageHeader } from "@/components/page-header";
import { StateRankingPieChart } from "@/components/charts/state-ranking-pie-chart";
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
    <div className="space-y-5">
      <section className="space-y-4">
        <PageHeader
          title="Visao geral"
          description="Indicadores consolidados de vendas, recebimentos, taxas, devolucoes e DIFAL estimado."
        />
        <PeriodFilter period={period}>
          <div className="space-y-1.5">
            <label htmlFor="dateMode" className="text-sm font-semibold leading-none text-slate-900">
              Ver relatorio por
            </label>
            <select
              id="dateMode"
              name="dateMode"
              defaultValue={dateMode}
              className="form-select"
            >
              <option value="erp">{dateModeLabels.erp.label}</option>
              <option value="sale">{dateModeLabels.sale.label}</option>
              <option value="payment">{dateModeLabels.payment.label}</option>
            </select>
          </div>
        </PeriodFilter>
        <div className="rounded-md border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-[0_12px_26px_-28px_rgba(18,32,48,0.5)]">
          {dateModeLabels[dateMode].description}
        </div>
      </section>

      <KpiGrid metrics={metrics} />

      <div className="grid gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Ranking por UF</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Distribuicao de vendas e DIFAL por estado no periodo selecionado.</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                {states.length} UFs
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {states.length ? (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <div className="overflow-x-auto">
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
                          <TableCell className="font-semibold">{state.uf}</TableCell>
                          <TableCell>{currency(state.vendas)}</TableCell>
                          <TableCell>{currency(state.difal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="min-w-0">
                  <div className="mb-2 text-sm font-semibold">Participacao por UF</div>
                  <StateRankingPieChart data={states.map((state) => ({ uf: state.uf, vendas: state.vendas }))} />
                </div>
              </div>
            ) : (
              <EmptyState title="Nenhuma UF encontrada" description="Ajuste o periodo ou importe planilhas para visualizar o ranking fiscal." />
            )}
            <p className="mt-4 text-xs text-muted-foreground">DIFAL estimado. Validar com contador.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
