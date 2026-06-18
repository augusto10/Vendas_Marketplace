import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PeriodFilter } from "@/components/period-filter";
import { listPedidos } from "@/lib/atacado/service";
import { parsePeriod } from "@/lib/period";
import { currency } from "@/lib/utils";
import { AtacadoStatusBadge, statusLabel } from "@/features/atacado/status";

export const dynamic = "force-dynamic";

const statusOrder = [
  "AGUARDANDO_SEPARACAO",
  "SEPARADO",
  "AGUARDANDO_PAGAMENTO",
  "EM_ENTREGA",
  "ENTREGUE"
];

export default async function AtacadoPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string; preset?: string }> }) {
  const params = await searchParams;
  const period = parsePeriod(params);
  const pedidos = await listPedidos({ start: period.start, end: period.end });
  const resumo = {
    pedidos: pedidos.length,
    vendidos: pedidos.reduce((sum, pedido) => sum + Number(pedido.valorTotal), 0),
    pendentes: pedidos.filter((pedido) => pedido.status === "AGUARDANDO_PAGAMENTO").length
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Atacado" description="Operacao de pedidos, separacao, pagamento e entrega no atacado.">
        <Button asChild>
          <Link href="/atacado/pedidos">Novo pedido</Link>
        </Button>
      </PageHeader>

      <PeriodFilter period={period} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="metric-card">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Pedidos no periodo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{resumo.pedidos}</div>
          </CardContent>
        </Card>
        <Card className="metric-card">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Total vendido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{currency(resumo.vendidos.toString())}</div>
          </CardContent>
        </Card>
        <Card className="metric-card">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{resumo.pendentes}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statusOrder.map((status) => (
          <Card key={status}>
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-sm">{statusLabel(status)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{pedidos.filter((pedido) => pedido.status === status).length}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Pedidos no periodo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pedidos.length ? pedidos.slice(0, 8).map((pedido) => (
            <div key={pedido.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">{pedido.numero}</div>
                <div className="text-sm text-muted-foreground">{pedido.cliente.nome}</div>
              </div>
              <div className="flex items-center gap-3">
                <AtacadoStatusBadge status={pedido.status} />
                <div className="text-sm font-semibold">{currency(pedido.valorTotal.toString())}</div>
              </div>
            </div>
          )) : (
            <div className="text-sm text-muted-foreground">Nenhum pedido encontrado no periodo selecionado.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
