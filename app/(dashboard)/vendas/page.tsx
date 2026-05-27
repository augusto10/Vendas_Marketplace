import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSalesConciliationReport, type SalesConciliationDateMode } from "@/lib/services/report-service";
import { parsePeriod } from "@/lib/period";
import { cn, currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const dateModeLabels: Record<SalesConciliationDateMode, { label: string; description: string }> = {
  erp: { label: "Notas emitidas", description: "Mostrando pedidos pela data da nota fiscal." },
  sale: { label: "Vendas Shopee", description: "Mostrando pedidos pela data da venda na Shopee." },
  payment: { label: "Pagamentos recebidos", description: "Mostrando pedidos pela data em que a Shopee liberou o pagamento." }
};

export default async function VendasPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string; page?: string; status?: string; dateMode?: string }> }) {
  const params = await searchParams;
  const period = parsePeriod(params);
  const page = Number(params.page ?? 1);
  const status = params.status === "matched" || params.status === "missing" ? params.status : "all";
  const dateMode = params.dateMode === "sale" || params.dateMode === "payment" ? params.dateMode : "erp";
  const { rows, summary, pagination } = await getSalesConciliationReport(period, Number.isFinite(page) ? page : 1, 50, status, dateMode);
  const pageHref = (targetPage: number) => `/vendas?start=${period.query.start}&end=${period.query.end}&dateMode=${dateMode}&status=${status}&page=${targetPage}`;
  const statusHref = (targetStatus: string) => `/vendas?start=${period.query.start}&end=${period.query.end}&dateMode=${dateMode}&status=${targetStatus}&page=1`;
  return (
    <div className="space-y-6">
      <PageHeader title="Vendas">
        <Button asChild variant="outline">
          <a href={`/api/v1/reports?type=sales&format=xlsx&start=${period.query.start}&end=${period.query.end}&dateMode=${dateMode}`}>
            <Download className="h-4 w-4" />
            Excel
          </a>
        </Button>
      </PageHeader>
      <PeriodFilter period={period}>
        <input type="hidden" name="status" value={status} />
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

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          title="Vendas ERP"
          value={currency(summary.fiscalTotal)}
          rows={[
            ["Pedidos ERP", summary.fiscalOrders.toLocaleString("pt-BR")],
            ["Notas emitidas", summary.fiscalOrders.toLocaleString("pt-BR")],
            ["Pagos Shopee", summary.reconciledOrders.toLocaleString("pt-BR")],
            ["Ticket medio ERP", currency(summary.fiscalOrders ? summary.fiscalTotal / summary.fiscalOrders : 0)],
            ["ICMS", currency(summary.icms)]
          ]}
        />
        <SummaryCard
          title="Vendas Shopee"
          value={currency(summary.shopeeGross)}
          rows={[
            ["Pedidos pagos", summary.reconciledOrders.toLocaleString("pt-BR")],
            ["Pedidos nao pagos", summary.fiscalOnlyOrders.toLocaleString("pt-BR")],
            ["Unidades vendidas", summary.reconciledUnitsSold.toLocaleString("pt-BR")],
            ["Pedidos Shopee", summary.shopeeOrders.toLocaleString("pt-BR")],
            ["Valor recebido pago", currency(summary.reconciledReleasedAmount)],
            ["Recebido por unidade", currency(summary.reconciledUnitsSold ? summary.reconciledReleasedAmount / summary.reconciledUnitsSold : 0)]
          ]}
        />
        <SummaryCard
          title="Descontos"
          value={currency(summary.commission + summary.serviceFee + summary.affiliateCommissionFee)}
          rows={[
            ["Comissao", currency(summary.commission)],
            ["Taxa servico", currency(summary.serviceFee)],
            ["Afiliados", currency(summary.affiliateCommissionFee)],
            ["DIFAL", currency(summary.difal)]
          ]}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Conciliacao por pedido</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Button asChild variant={status === "all" ? "default" : "outline"} size="sm">
              <Link href={statusHref("all")}>ERP</Link>
            </Button>
            <Button asChild variant={status === "matched" ? "default" : "outline"} size="sm">
              <Link href={statusHref("matched")}>Pagos</Link>
            </Button>
            <Button asChild variant={status === "missing" ? "default" : "outline"} size="sm">
              <Link href={statusHref("missing")}>Nao pagos</Link>
            </Button>
            <span>
              Pagina {pagination.page} de {pagination.totalPages} - {pagination.totalRows.toLocaleString("pt-BR")} registros
            </span>
            <Button asChild variant="outline" size="sm" className={pagination.page <= 1 ? "pointer-events-none opacity-50" : undefined}>
              <Link href={pageHref(Math.max(1, pagination.page - 1))}>
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className={pagination.page >= pagination.totalPages ? "pointer-events-none opacity-50" : undefined}>
              <Link href={pageHref(Math.min(pagination.totalPages, pagination.page + 1))}>
                Proxima
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emissao</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Data Shopee</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Nota ERP</TableHead>
                <TableHead>Frete nota</TableHead>
                <TableHead>Produto ERP</TableHead>
                <TableHead>Venda Shopee</TableHead>
                <TableHead>Valor recebido</TableHead>
                <TableHead>Comissao</TableHead>
                <TableHead>Taxa serviÃ§o</TableHead>
                <TableHead>Taxa transaÃ§Ã£o</TableHead>
                <TableHead>Afiliados</TableHead>
                <TableHead>DIFAL</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 100).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.emissionDate.toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{row.marketplaceId}</TableCell>
                  <TableCell>{row.orderCreatedAt?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{row.paidAt?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{row.products || "-"}</TableCell>
                  <TableCell>{currency(row.fiscalTotal)}</TableCell>
                  <TableCell>{currency(row.fiscalFreight)}</TableCell>
                  <TableCell>{currency(row.fiscalProductTotal)}</TableCell>
                  <TableCell>{currency(row.shopeeGross)}</TableCell>
                  <TableCell>{currency(row.releasedAmount)}</TableCell>
                  <TableCell>{currency(row.commission)}</TableCell>
                  <TableCell>{currency(row.serviceFee)}</TableCell>
                  <TableCell>{currency(row.transactionFee)}</TableCell>
                  <TableCell>{currency(row.affiliateCommissionFee)}</TableCell>
                  <TableCell>{currency(row.difal)}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        row.status === "Conciliado" && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
                        row.status !== "Conciliado" && "bg-amber-100 text-amber-700 hover:bg-amber-100"
                      )}
                    >
                      {row.status === "Conciliado" ? "Concluido" : "Pendente"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  rows
}: {
  title: string;
  value: string;
  rows: Array<[string, string]>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="mt-4 space-y-2 text-sm">
          {rows.map(([label, rowValue]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-t pt-2 first:border-t-0 first:pt-0">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{rowValue}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
