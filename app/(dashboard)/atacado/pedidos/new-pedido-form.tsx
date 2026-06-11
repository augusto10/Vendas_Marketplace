"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPedidoAction } from "@/features/atacado/actions";
import { currency } from "@/lib/utils";

type ClienteOption = {
  id: string;
  nome: string;
};

type ProdutoOption = {
  id: string;
  nome: string;
  precoPorCaixa: number;
  quantidadePorCaixa: number;
  cor: string | null;
  grade: string | null;
  permiteEditarPrecoPedido: boolean;
};

export function NewPedidoForm({ clientes, produtos }: { clientes: ClienteOption[]; produtos: ProdutoOption[] }) {
  const [produtoId, setProdutoId] = useState("");
  const [precoCaixa, setPrecoCaixa] = useState("");
  const [quantidadeCaixas, setQuantidadeCaixas] = useState(1);
  const [descontoPercentual, setDescontoPercentual] = useState("");

  const selectedProduct = useMemo(() => produtos.find((produto) => produto.id === produtoId), [produtoId, produtos]);
  const precoBase = precoCaixa === "" ? 0 : Number(precoCaixa);
  const desconto = Math.min(Math.max(Number(descontoPercentual || 0), 0), 100);
  const precoFinal = precoBase * (1 - desconto / 100);
  const total = precoFinal * Math.max(Number(quantidadeCaixas || 0), 0);
  const changedPrice = Boolean(selectedProduct) && precoCaixa !== "" && Number(precoCaixa) !== selectedProduct?.precoPorCaixa;
  const changedDiscount = desconto > 0;
  const needsAdminPassword = Boolean(selectedProduct && !selectedProduct.permiteEditarPrecoPedido && (changedPrice || changedDiscount));

  return (
    <form action={createPedidoAction} className="grid gap-4 md:grid-cols-6">
      <div className="space-y-2 md:col-span-2">
        <Label>Cliente</Label>
        <select name="clienteId" className="form-select" required>
          <option value="">Selecione</option>
          {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
        </select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Produto</Label>
        <select
          name="produtoId"
          className="form-select"
          required
          value={produtoId}
          onChange={(event) => {
            const nextProduct = produtos.find((produto) => produto.id === event.target.value);
            setProdutoId(event.target.value);
            setPrecoCaixa(nextProduct ? String(nextProduct.precoPorCaixa) : "");
          }}
        >
          <option value="">Selecione</option>
          {produtos.map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.nome} {produto.cor ? `- ${produto.cor}` : ""} {produto.grade ? `- ${produto.grade}` : ""} - {currency(produto.precoPorCaixa)}
            </option>
          ))}
        </select>
      </div>
      {selectedProduct ? (
        <div className="grid gap-2 rounded-md border bg-muted/20 p-3 text-sm md:col-span-2">
          <div><span className="text-muted-foreground">Cor:</span> <span className="font-medium">{selectedProduct.cor || "-"}</span></div>
          <div><span className="text-muted-foreground">Grade:</span> <span className="font-medium">{selectedProduct.grade || "-"}</span></div>
          <div><span className="text-muted-foreground">Preco padrao:</span> <span className="font-medium">{currency(selectedProduct.precoPorCaixa)}</span></div>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label>Caixas</Label>
        <Input
          name="quantidadeCaixas"
          type="number"
          min={1}
          value={quantidadeCaixas}
          onChange={(event) => setQuantidadeCaixas(Number(event.target.value))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Valor caixa</Label>
        <Input
          name="precoCaixa"
          type="number"
          min={0}
          step="0.01"
          value={precoCaixa}
          onChange={(event) => setPrecoCaixa(event.target.value)}
          placeholder="0,00"
        />
      </div>
      <div className="space-y-2">
        <Label>Desconto %</Label>
        <Input
          name="descontoPercentual"
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={descontoPercentual}
          onChange={(event) => setDescontoPercentual(event.target.value)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Total previsto</Label>
        <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm font-semibold">
          {currency(total)}
        </div>
      </div>
      <div className="space-y-2 md:col-span-3">
        <Label>Observacao</Label>
        <Input name="observacao" />
      </div>
      {needsAdminPassword ? (
        <div className="grid gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 md:col-span-6 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-medium text-amber-700 dark:text-amber-200">
            Este produto exige senha de administrador para alterar preco ou desconto.
          </div>
          <div className="space-y-2">
            <Label>Email administrador</Label>
            <Input name="adminEmail" type="email" required={needsAdminPassword} />
          </div>
          <div className="space-y-2">
            <Label>Senha administrador</Label>
            <Input name="adminPassword" type="password" required={needsAdminPassword} />
          </div>
        </div>
      ) : null}
      <Button className="md:col-span-6 md:justify-self-end" type="submit">Gerar pedido</Button>
    </form>
  );
}
