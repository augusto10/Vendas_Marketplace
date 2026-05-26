import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currency } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/services/dashboard-service";
import { Banknote, Boxes, CreditCard, Landmark, PackageCheck, Receipt, Scale, TrendingDown, TrendingUp, Truck, Undo2, Wallet } from "lucide-react";

const labels: Array<[keyof DashboardMetrics, string, "currency" | "number", React.ComponentType<{ className?: string }>]> = [
  ["soldAmount", "Valor vendido", "currency", TrendingUp],
  ["receivedAmount", "Valor recebido", "currency", Wallet],
  ["unitsSold", "Unidades vendidas", "number", Boxes],
  ["orders", "Pedidos", "number", PackageCheck],
  ["averageTicket", "Ticket medio", "currency", CreditCard],
  ["commission", "Comissao", "currency", Receipt],
  ["freight", "Frete", "currency", Truck],
  ["icms", "ICMS", "currency", Landmark],
  ["difal", "DIFAL", "currency", Scale],
  ["refunds", "Devolucoes", "currency", Undo2],
  ["fees", "Taxas", "currency", TrendingDown],
  ["netBalance", "Saldo liquido", "currency", Banknote]
];

export function KpiGrid({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {labels.map(([key, label, type, Icon]) => (
        <Card key={key} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {type === "currency" ? currency(metrics[key] as number) : Number(metrics[key]).toLocaleString("pt-BR")}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
