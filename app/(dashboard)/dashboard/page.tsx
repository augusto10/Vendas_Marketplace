import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const dateModeLabels: Record<SalesConciliationDateMode, { label: string; description: string }> = {
  erp: { label: "Notas emitidas", description: "Mostrando indicadores pela data da nota fiscal." },
  sale: { label: "Vendas Shopee", description: "Mostrando indicadores pela data da venda na Shopee." },
  payment: { label: "Pagamentos recebidos", description: "Mostrando indicadores pela data em que a Shopee liberou o pagamento." }
};

const printableSections = [
  { value: "overview", label: "Visao geral", checked: true },
  { value: "sales", label: "Vendas", checked: true },
  { value: "orders", label: "Pedidos", checked: false },
  { value: "products", label: "Produtos", checked: true },
  { value: "fees", label: "Taxas", checked: true },
  { value: "returns", label: "Devolucoes", checked: false },
  { value: "freight", label: "Fretes", checked: false },
  { value: "fiscal", label: "Fiscal", checked: false },
  { value: "financial", label: "Financeiro", checked: true },
  { value: "wallet", label: "Carteira Shopee", checked: false },
  { value: "accelera", label: "Acelera", checked: false },
  { value: "uploads", label: "Historico de uploads", checked: false }
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string; dateMode?: string }> }) {
  const params = await searchParams;
  const period = parsePeriod(params);
  const dateMode = params.dateMode === "sale" || params.dateMode === "payment" ? params.dateMode : "erp";
  const [metrics, states] = await Promise.all([
    getDashboardMetrics(period, dateMode),
    getStateRanking(period, dateMode)
  ]);
  const totalStateOrders = states.reduce((sum, state) => sum + state.pedidos, 0);

  return (
    <div className="space-y-5">
      <section className="space-y-4">
        <PageHeader
          title="Visao geral"
          description="Indicadores consolidados de vendas, recebimentos, taxas, devolucoes e DIFAL estimado."
        />
        <PeriodFilter period={period}>
          <div className="space-y-1.5">
            <label htmlFor="dateMode" className="text-sm font-semibold leading-none text-foreground">
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
        <div className="rounded-md border border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-[0_14px_30px_-28px_rgba(0,0,0,0.9)]">
          {dateModeLabels[dateMode].description}
        </div>
        <details className="rounded-md border border-border bg-card shadow-[0_14px_30px_-28px_rgba(0,0,0,0.9)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-card-foreground">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Gerar PDF para impressao
            </span>
            <span className="text-xs font-medium text-muted-foreground">Abrir opcoes</span>
          </summary>
          <div className="border-t border-border p-4">
            <form action="/impressao" className="space-y-4">
              <input type="hidden" name="start" value={period.query.start} />
              <input type="hidden" name="end" value={period.query.end} />
              <input type="hidden" name="dateMode" value={dateMode} />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {printableSections.map((section) => (
                  <label
                    key={section.value}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm font-medium text-card-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <input
                      type="checkbox"
                      name="sections"
                      value={section.value}
                      defaultChecked={section.checked}
                      className="h-4 w-4 accent-primary"
                    />
                    {section.label}
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <Button type="submit">
                  <FileText className="h-4 w-4" />
                  Gerar para imprimir
                </Button>
              </div>
            </form>
          </div>
        </details>
      </section>

      <KpiGrid metrics={metrics} />

      <div className="grid gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/20">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Ranking por UF</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Distribuicao de vendas e DIFAL por estado no periodo selecionado.</p>
              </div>
              <div className="rounded-md border border-border bg-muted/35 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {states.length} UFs - {totalStateOrders.toLocaleString("pt-BR")} pedidos
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {states.length ? (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periodo</TableHead>
                        <TableHead>UF</TableHead>
                        <TableHead>Pedidos</TableHead>
                        <TableHead>Vendas</TableHead>
                        <TableHead>DIFAL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {states.map((state) => (
                        <TableRow key={state.uf}>
                          <TableCell>{period.label}</TableCell>
                          <TableCell className="font-semibold">{state.uf}</TableCell>
                          <TableCell>{state.pedidos.toLocaleString("pt-BR")}</TableCell>
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
