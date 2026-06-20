"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPedidoAction } from "@/features/atacado/actions";
import { currency } from "@/lib/utils";
import { ProdutosListTable, type Produto } from "@/features/atacado/produtos-list-table";
import { PedidoItemsList, type PedidoItem } from "@/features/atacado/pedido-items-list";

type ClienteOption = {
  id: string;
  nome: string;
};

type ProdutoOption = Produto & {
  permiteEditarPrecoPedido: boolean;
};

export function NewPedidoForm({ clientes, produtos }: { clientes: ClienteOption[]; produtos: ProdutoOption[] }) {
  const [clienteId, setClienteId] = useState("");
  const [pedidoItems, setPedidoItems] = useState<PedidoItem[]>([]);
  const [cartScrollVersion, setCartScrollVersion] = useState(0);
  const cartEndRef = useRef<HTMLDivElement | null>(null);

  const selectedCliente = useMemo(() => clientes.find((c) => c.id === clienteId), [clienteId, clientes]);

  useEffect(() => {
    if (cartScrollVersion === 0) return;

    window.requestAnimationFrame(() => {
      cartEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [cartScrollVersion]);

  const handleAddProduto = (produto: Produto) => {
    const existingIndex = pedidoItems.findIndex((item) => item.produtoId === produto.id);

    if (existingIndex >= 0) {
      // Se já existe, aumenta a quantidade
      const updated = [...pedidoItems];
      updated[existingIndex].quantidadeCaixas += 1;
      setPedidoItems(updated);
    } else {
      // Adiciona novo item
      const newItem: PedidoItem = {
        id: `${produto.id}-${Date.now()}`,
        produtoId: produto.id,
        nomeProduto: produto.nome,
        cor: produto.cor,
        grade: produto.grade,
        precoCaixa: produto.precoPorCaixa,
        quantidadeCaixas: 1,
        descontoPercentual: 0
      };
      setPedidoItems([...pedidoItems, newItem]);
    }
    setCartScrollVersion((version) => version + 1);
  };

  const handleRemoveItem = (produtoId: string) => {
    setPedidoItems(pedidoItems.filter((item) => item.produtoId !== produtoId));
  };

  const handleUpdateQuantidade = (produtoId: string, quantidade: number) => {
    setPedidoItems(
      pedidoItems.map((item) =>
        item.produtoId === produtoId ? { ...item, quantidadeCaixas: quantidade } : item
      )
    );
  };

  const handleUpdatePreco = (produtoId: string, preco: number) => {
    setPedidoItems(
      pedidoItems.map((item) =>
        item.produtoId === produtoId ? { ...item, precoCaixa: preco } : item
      )
    );
  };

  const handleUpdateDesconto = (produtoId: string, desconto: number) => {
    setPedidoItems(
      pedidoItems.map((item) =>
        item.produtoId === produtoId ? { ...item, descontoPercentual: desconto } : item
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Seleção de Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Novo Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 md:w-96">
            <Label>Cliente</Label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="form-select"
              required
            >
              <option value="">Selecione um cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Listagem de Produtos */}
      {selectedCliente && (
        <>
          <ProdutosListTable
            produtos={produtos}
            onSelectProduto={handleAddProduto}
            title="Produtos disponíveis"
            description="Clique em 'Adicionar' para incluir produtos ao pedido"
          />

          {/* Carrinho de Itens */}
          {pedidoItems.length > 0 && (
            <>
              <PedidoItemsList
                items={pedidoItems}
                onRemoveItem={handleRemoveItem}
                onUpdateQuantidade={handleUpdateQuantidade}
                onUpdatePreco={handleUpdatePreco}
                onUpdateDesconto={handleUpdateDesconto}
              />
              <div ref={cartEndRef} aria-hidden="true" />

              {/* Formulário Final */}
              <form
                action={createPedidoAction}
                className="space-y-4"
              >
                <input type="hidden" name="clienteId" value={clienteId} />
                <input type="hidden" name="itemsJson" value={JSON.stringify(pedidoItems)} />

                <Card>
                  <CardHeader>
                    <CardTitle>Informações do Pedido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="observacao">Observação</Label>
                        <Input
                          id="observacao"
                          name="observacao"
                          placeholder="Adicione observações sobre o pedido"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setClienteId("");
                      setPedidoItems([]);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Gerar Pedido ({pedidoItems.length} itens)
                  </Button>
                </div>
              </form>
            </>
          )}

          {pedidoItems.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <p className="mb-2">Nenhum produto adicionado</p>
                  <p className="text-sm">Clique em "Adicionar" em um produto da lista acima</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedCliente && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>Selecione um cliente acima para começar a criar o pedido</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
