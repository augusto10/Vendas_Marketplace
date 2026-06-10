import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPedidos } from "@/lib/atacado/service";
import { registerPagamentoAction, updatePedidoStatusAction } from "@/features/atacado/actions";
import { AtacadoStatusBadge } from "@/features/atacado/status";
import { currency } from "@/lib/utils";

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
                    <form action={registerPagamentoAction} encType="multipart/form-data" className="flex min-w-[520px] items-center gap-2">
                      <input type="hidden" name="pedidoId" value={pedido.id} />
                      <select name="status" className="form-select w-36" defaultValue="PAGO">
                        <option value="PENDENTE">Pendente</option>
                        <option value="PARCIAL">Parcial</option>
                        <option value="PAGO">Pago</option>
                      </select>
                      <Input name="valorPago" type="number" step="0.01" defaultValue={pedido.valorTotal.toString()} className="w-36" />
                      <Input name="file" type="file" accept="image/*" className="w-44" />
                      <Button type="submit">Registrar</Button>
                    </form>
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

