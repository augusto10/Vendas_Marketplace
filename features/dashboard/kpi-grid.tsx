import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currency } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/services/dashboard-service";

export function KpiGrid({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SummaryCard
        title="Vendas ERP"
        value={currency(metrics.soldAmount)}
        rows={[
          ["Pedidos ERP", metrics.orders.toLocaleString("pt-BR")],
          ["Notas emitidas", metrics.orders.toLocaleString("pt-BR")],
          ["Pagos Shopee", metrics.paidOrders.toLocaleString("pt-BR")],
          ["Ticket medio ERP", currency(metrics.averageTicket)],
          ["ICMS", currency(metrics.icms)]
        ]}
      />
      <SummaryCard
        title="Vendas Shopee"
        value={currency(metrics.shopeeSoldAmount)}
        rows={[
          ["Pedidos pagos", metrics.paidOrders.toLocaleString("pt-BR")],
          ["Pedidos nao pagos", metrics.unpaidOrders.toLocaleString("pt-BR")],
          ["Unidades vendidas", metrics.paidUnitsSold.toLocaleString("pt-BR")],
          ["Valor recebido pago", currency(metrics.receivedAmount)],
          ["Recebido por unidade", currency(metrics.paidUnitsSold ? metrics.receivedAmount / metrics.paidUnitsSold : 0)]
        ]}
      />
      <SummaryCard
        title="Descontos"
        value={currency(metrics.commission + metrics.serviceFee + metrics.affiliateCommissionFee)}
        rows={[
          ["Comissao", currency(metrics.commission)],
          ["Taxa servico", currency(metrics.serviceFee)],
          ["Afiliados", currency(metrics.affiliateCommissionFee)],
          ["DIFAL", currency(metrics.difal)]
        ]}
      />
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
