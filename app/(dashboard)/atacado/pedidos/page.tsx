import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listClientes, listPedidos, listProdutos } from "@/lib/atacado/service";
import { createPedidoAction, updatePedidoStatusAction } from "@/features/atacado/actions";
import { AtacadoStatusBadge } from "@/features/atacado/status";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AtacadoPedidosPage() {
  const [clientes, produtos, pedidos] = await Promise.all([listClientes(), listProdutos(), listPedidos()]);

  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos Atacado" description="Crie pedidos e acompanhe o andamento operacional." />
      <Card>
        <CardHeader className="border-b bg-muted/20"><CardTitle>Novo pedido</CardTitle></CardHeader>
        <CardContent>
          <form action={createPedidoAction} className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2 md:col-span-2">
              <Label>Cliente</Label>
              <select name="clienteId" className="form-select" required>
                <option value="">Selecione</option>
                {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Produto</Label>
              <select name="produtoId" className="form-select" required>
                <option value="">Selecione</option>
                {produtos.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome} - {currency(produto.precoPorCaixa.toString())}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Caixas</Label>
              <Input name="quantidadeCaixas" type="number" min={1} defaultValue={1} required />
            </div>
            <div className="space-y-2 md:col-span-5">
              <Label>Observacao</Label>
              <Input name="observacao" />
            </div>
            <Button className="md:col-span-5 md:justify-self-end" type="submit">Gerar pedido</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="border-b bg-muted/20"><CardTitle>Pedidos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Numero</TableHead><TableHead>Cliente</TableHead><TableHead>Status</TableHead><TableHead>Itens</TableHead><TableHead>Total</TableHead><TableHead>Acao</TableHead></TableRow></TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-semibold">{pedido.numero}</TableCell>
                  <TableCell>{pedido.cliente.nome}</TableCell>
                  <TableCell><AtacadoStatusBadge status={pedido.status} /></TableCell>
                  <TableCell>{pedido.itens.length}</TableCell>
                  <TableCell>{currency(pedido.valorTotal.toString())}</TableCell>
                  <TableCell>
                    <form action={updatePedidoStatusAction} className="flex items-center gap-2">
                      <input type="hidden" name="pedidoId" value={pedido.id} />
                      <select name="status" className="form-select min-w-48" defaultValue={pedido.status}>
                        <option value="AGUARDANDO_SEPARACAO">Aguardando separacao</option>
                        <option value="EM_SEPARACAO">Em separacao</option>
                        <option value="SEPARADO">Separado</option>
                        <option value="AGUARDANDO_PAGAMENTO">Aguardando pagamento</option>
                        <option value="PAGO">Pago</option>
                        <option value="EM_EXPEDICAO">Em expedicao</option>
                        <option value="EM_ENTREGA">Em entrega</option>
                        <option value="ENTREGUE">Entregue</option>
                        <option value="CANCELADO">Cancelado</option>
                      </select>
                      <Button type="submit" variant="outline">Salvar</Button>
                    </form>
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

