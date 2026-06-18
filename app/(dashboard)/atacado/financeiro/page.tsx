import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPedidos } from "@/lib/atacado/service";
import { updatePedidoStatusAction } from "@/features/atacado/actions";
import { AtacadoStatusBadge } from "@/features/atacado/status";
import { currency } from "@/lib/utils";
import { PagamentoForm } from "@/features/atacado/pagamento-form";

export const dynamic = "force-dynamic";

export default async function AtacadoFinanceiroPage() {
  const pedidos = await listPedidos();
  const fila = pedidos.filter((pedido) => ["SEPARADO", "AGUARDANDO_PAGAMENTO", "PAGO"].includes(pedido.status));

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro Atacado" description="Registro de pagamento e comprovante PIX." />
      <Card>
        <CardHeader className="border-b bg-muted/20"><CardTitle>Pagamentos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Pagamento</TableHead></TableRow></TableHeader>
            <TableBody>
              {fila.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-semibold">{pedido.numero}</TableCell>
                  <TableCell>{pedido.cliente.nome}</TableCell>
                  <TableCell><AtacadoStatusBadge status={pedido.status} /></TableCell>
                  <TableCell>{currency(pedido.valorTotal.toString())}</TableCell>
                  <TableCell>
                    <PagamentoForm
                      pedidoId={pedido.id}
                      valorTotal={pedido.valorTotal.toString()}
                      comprovanteUrl={pedido.pagamentos[0]?.comprovanteUrl}
                    />
                    {pedido.status === "SEPARADO" ? (
                      <form action={updatePedidoStatusAction} className="mt-2">
                        <input type="hidden" name="pedidoId" value={pedido.id} />
                        <input type="hidden" name="status" value="AGUARDANDO_PAGAMENTO" />
                        <Button type="submit" variant="outline">Enviar para pagamento</Button>
                      </form>
                    ) : null}
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
