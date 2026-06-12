import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { listClientes, listPedidos, listProdutos } from "@/lib/atacado/service";
import { parsePeriod } from "@/lib/period";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { NewPedidoForm } from "./new-pedido-form";
import { AtacadoPedidosTable, type AtacadoPedidoRow } from "./atacado-pedidos-table";

export const dynamic = "force-dynamic";

export default async function AtacadoPedidosPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string; pedido?: string }> }) {
  const params = await searchParams;
  const period = parsePeriod(params);
  const pedidoFilter = params.pedido?.trim() ?? "";
  const [session, clientes, produtos, pedidos] = await Promise.all([
    auth(),
    listClientes(),
    listProdutos(),
    listPedidos({ start: period.start, end: period.end, pedido: pedidoFilter || undefined })
  ]);
  const user = session?.user ?? null;
  const isMaster = user?.roles.includes("master") ?? false;
  const canCreatePedidos = hasPermission(user, "atacado.pedidos.create");
  const canUpdatePedidos = hasPermission(user, "atacado.pedidos.update");
  const clienteOptions = clientes.map((cliente) => ({ id: cliente.id, nome: cliente.nome }));
  const produtoOptions = produtos.map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    codigo: produto.codigo,
    referencia: produto.referencia,
    precoPorCaixa: Number(produto.precoPorCaixa),
    quantidadePorCaixa: produto.quantidadePorCaixa,
    cor: produto.cor,
    grade: produto.grade,
    permiteEditarPrecoPedido: produto.permiteEditarPrecoPedido
  }));
  const pedidoRows: AtacadoPedidoRow[] = pedidos.map((pedido) => ({
    id: pedido.id,
    numero: pedido.numero,
    criadoEm: pedido.criadoEm.toISOString(),
    atualizadoEm: pedido.atualizadoEm.toISOString(),
    observacao: pedido.observacao,
    valorTotal: Number(pedido.valorTotal),
    status: pedido.status,
    cliente: {
      nome: pedido.cliente.nome,
      telefone: pedido.cliente.telefone,
      cidade: pedido.cliente.cidade,
      estado: pedido.cliente.estado,
      endereco: pedido.cliente.endereco
    },
    vendedor: pedido.vendedor ? { name: pedido.vendedor.name, email: pedido.vendedor.email } : null,
    itens: pedido.itens.map((item) => ({
      id: item.id,
      quantidadeCaixas: item.quantidadeCaixas,
      quantidadePares: item.quantidadePares,
      precoCaixa: Number(item.precoCaixa),
      valorTotal: Number(item.valorTotal),
      observacao: item.observacao,
      produto: {
        nome: item.produto.nome,
        referencia: item.produto.referencia,
        categoria: item.produto.categoria,
        grade: item.produto.grade,
        quantidadePorCaixa: item.produto.quantidadePorCaixa
      }
    })),
    pagamentos: pedido.pagamentos.map((pagamento) => ({
      status: pagamento.status,
      valorPago: Number(pagamento.valorPago),
      observacao: pagamento.observacao,
      registradoEm: pagamento.registradoEm.toISOString()
    })),
    entregas: pedido.entregas.map((entrega) => ({
      tipo: entrega.tipo,
      status: entrega.status,
      endereco: entrega.endereco,
      observacao: entrega.observacao,
      createdAt: entrega.createdAt.toISOString()
    }))
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos Atacado" description="Crie pedidos e acompanhe o andamento operacional." />
      {canCreatePedidos ? (
        <Card>
          <CardHeader className="border-b bg-muted/20"><CardTitle>Novo pedido</CardTitle></CardHeader>
          <CardContent>
            <NewPedidoForm clientes={clienteOptions} produtos={produtoOptions} />
          </CardContent>
        </Card>
      ) : null}
      <PeriodFilter period={period}>
        <div className="space-y-1.5">
          <Label htmlFor="pedido">Pedido</Label>
          <Input id="pedido" name="pedido" defaultValue={pedidoFilter} placeholder="Numero do pedido" />
        </div>
      </PeriodFilter>
      <Card>
        <CardHeader className="border-b bg-muted/20"><CardTitle>Pedidos</CardTitle></CardHeader>
        <CardContent>
          <AtacadoPedidosTable pedidos={pedidoRows} canUpdatePedidos={canUpdatePedidos} isMaster={isMaster} />
        </CardContent>
      </Card>
    </div>
  );
}
