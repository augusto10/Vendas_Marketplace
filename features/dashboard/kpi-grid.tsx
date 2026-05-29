import type { ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgePercent, Banknote, ReceiptText } from "lucide-react";
import { currency } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/services/dashboard-service";

export function KpiGrid({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SummaryCard
        title="Vendas ERP"
        description="Base fiscal emitida"
        icon={ReceiptText}
        value={currency(metrics.soldAmount)}
        tone="primary"
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
        description="Performance conciliada"
        icon={Banknote}
        value={currency(metrics.shopeeSoldAmount)}
        tone="accent"
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
        description="Custos e impostos"
        icon={BadgePercent}
        value={currency(metrics.commission + metrics.serviceFee + metrics.affiliateCommissionFee)}
        tone="warning"
        rows={[
          ["Comissao", currency(metrics.commission)],
          ["Taxa servico", currency(metrics.serviceFee)],
          ["Afiliados", currency(metrics.affiliateCommissionFee)],
          ["Taxas totais", currency(metrics.fees)],
          ["DIFAL", currency(metrics.difal)]
        ]}
      />
    </div>
  );
}

function SummaryCard({
  title,
  description,
  icon: Icon,
  value,
  rows,
  tone
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  value: string;
  rows: Array<[string, string]>;
  tone: "primary" | "accent" | "warning";
}) {
  const toneClass = {
    primary: "bg-card text-card-foreground",
    accent: "bg-card text-card-foreground",
    warning: "bg-card text-card-foreground"
  }[tone];
  const iconClass = {
    primary: "border-accent/15 bg-accent/10 text-accent",
    accent: "border-primary/25 bg-primary/10 text-primary",
    warning: "border-primary/25 bg-primary/10 text-primary"
  }[tone];
  const stripeClass = tone === "primary" ? "bg-accent" : "bg-primary";
  const titleClass = "text-muted-foreground";
  const descriptionClass = "text-muted-foreground";
  const valueClass = "text-card-foreground";
  const rowClass = "border-border bg-muted/35 text-muted-foreground";
  const rowValueClass = "text-card-foreground";

  return (
    <Card className={`group overflow-hidden ${toneClass} transition-all hover:-translate-y-0.5 hover:border-primary/35`}>
      <div className={`h-1 ${stripeClass}`} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className={`text-sm font-semibold uppercase ${titleClass}`}>{title}</CardTitle>
            <p className={`mt-1 text-xs ${descriptionClass}`}>{description}</p>
          </div>
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-sm border ${iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-[1.7rem] font-semibold tracking-tight ${valueClass}`}>{value}</div>
        <div className="mt-4 space-y-2 text-sm">
          {rows.map(([label, rowValue]) => (
            <div key={label} className={`flex items-center justify-between gap-4 rounded-md border px-3 py-2 ${rowClass}`}>
              <span>{label}</span>
              <span className={`font-semibold ${rowValueClass}`}>{rowValue}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
