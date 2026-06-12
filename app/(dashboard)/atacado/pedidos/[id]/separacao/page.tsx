import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { BackButton } from "@/components/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AtacadoStatusBadge } from "@/features/atacado/status";
import { currency } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { PedidoSeparacaoForm } from "./pedido-separacao-form";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type PedidoWithItems = Prisma.AtacadoPedidoGetPayload<{
  include: {
    cliente: true;
    itens: {
      include: {
        produto: true;
      };
    };
  };
}>;

export default async function PedidoSeparacaoPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pedido: PedidoWithItems | null = await prisma.atacadoPedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      itens: {
        include: {
          produto: true
        }
      }
    }
  });

  if (!pedido) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Separação - Pedido #${pedido.numero}`}
        description={`Cliente: ${pedido.cliente.nome} | Status: ${pedido.status}`}
      />

      {/* Informações do Pedido */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <div className="text-sm text-muted-foreground">Número</div>
              <div className="font-semibold">{pedido.numero}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Cliente</div>
              <div className="font-semibold">{pedido.cliente.nome}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <AtacadoStatusBadge status={pedido.status} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="font-semibold">{currency(Number(pedido.valorTotal))}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Itens para Separação */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos para Separar ({pedido.itens.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Cor/Grade</TableHead>
                  <TableHead className="text-center">Qtd/Caixa</TableHead>
                  <TableHead className="text-center">Caixas</TableHead>
                  <TableHead className="text-center">Total Unidades</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedido.itens.map((item) => {
                  const subtotal = Number(item.precoCaixa) * item.quantidadeCaixas;
                  const totalUnidades = item.produto.quantidadePorCaixa * item.quantidadeCaixas;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.produto.codigo || item.produto.referencia || "-"}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate font-medium">
                        {item.produto.nome}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.produto.cor || item.produto.grade
                          ? `${item.produto.cor || "-"} / ${item.produto.grade || "-"}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.produto.quantidadePorCaixa}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {item.quantidadeCaixas}
                      </TableCell>
                      <TableCell className="text-center bg-muted/50 font-semibold">
                        {totalUnidades}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency(Number(item.precoCaixa))}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {currency(subtotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Resumo de Separação */}
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-md border bg-muted/20 p-4">
              <div className="text-sm text-muted-foreground">Total de Itens</div>
              <div className="text-3xl font-bold">{pedido.itens.length}</div>
            </div>
            <div className="rounded-md border bg-muted/20 p-4">
              <div className="text-sm text-muted-foreground">Total de Caixas</div>
              <div className="text-3xl font-bold">
                {pedido.itens.reduce((sum, item) => sum + item.quantidadeCaixas, 0)}
              </div>
            </div>
            <div className="rounded-md border bg-muted/20 p-4">
              <div className="text-sm text-muted-foreground">Total de Unidades</div>
              <div className="text-3xl font-bold">
                {pedido.itens.reduce(
                  (sum, item) => sum + item.produto.quantidadePorCaixa * item.quantidadeCaixas,
                  0
                )}
              </div>
            </div>
            <div className="rounded-md border bg-primary/10 p-4">
              <div className="text-sm text-muted-foreground">Valor Total</div>
              <div className="text-3xl font-bold text-primary">
                {currency(Number(pedido.valorTotal))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Separação */}
      {pedido.status !== "CANCELADO" && pedido.status !== "ENTREGUE" && (
        <PedidoSeparacaoForm pedidoId={pedido.id} currentStatus={pedido.status} />
      )}

      {/* Observação */}
      {pedido.observacao && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{pedido.observacao}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
