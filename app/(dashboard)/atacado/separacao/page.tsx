import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPedidos } from "@/lib/atacado/service";
import { updatePedidoStatusAction } from "@/features/atacado/actions";
import { AtacadoStatusBadge } from "@/features/atacado/status";

export const dynamic = "force-dynamic";

export default async function AtacadoSeparacaoPage() {
  const pedidos = await listPedidos();
  const fila = pedidos.filter((pedido) => ["AGUARDANDO_SEPARACAO", "EM_SEPARACAO", "FALTA_ESTOQUE"].includes(pedido.status));

  return (
    <div className="space-y-6">
      <PageHeader title="Separacao Atacado" description="Fila de pedidos para separar, registrar falta e liberar para pagamento." />
      <Card>
        <CardHeader className="border-b bg-muted/20"><CardTitle>Fila de separacao</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Status</TableHead><TableHead>Itens</TableHead><TableHead>Acoes</TableHead></TableRow></TableHeader>
            <TableBody>
              {fila.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-semibold">{pedido.numero}</TableCell>
                  <TableCell>{pedido.cliente.nome}</TableCell>
                  <TableCell><AtacadoStatusBadge status={pedido.status} /></TableCell>
                  <TableCell>{pedido.itens.map((item) => `${item.produto.nome} (${item.quantidadeCaixas} cx)`).join(", ")}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <form action={updatePedidoStatusAction}>
                        <input type="hidden" name="pedidoId" value={pedido.id} />
                        <input type="hidden" name="status" value="EM_SEPARACAO" />
                        <Button type="submit" variant="outline">Iniciar</Button>
                      </form>
                      <form action={updatePedidoStatusAction}>
                        <input type="hidden" name="pedidoId" value={pedido.id} />
                        <input type="hidden" name="status" value="SEPARADO" />
                        <Button type="submit">Separado</Button>
                      </form>
                      <form action={updatePedidoStatusAction}>
                        <input type="hidden" name="pedidoId" value={pedido.id} />
                        <input type="hidden" name="status" value="FALTA_ESTOQUE" />
                        <Button type="submit" variant="destructive">Falta</Button>
                      </form>
                    </div>
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

