"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateProdutoAction } from "@/features/atacado/actions";
import { AtacadoStatusBadge } from "@/features/atacado/status";
import { currency } from "@/lib/utils";

export type AtacadoProdutoRow = {
  id: string;
  referencia: string | null;
  codigo: string | null;
  codigoBarras: string | null;
  nome: string;
  categoria: string | null;
  cor: string | null;
  grade: string | null;
  quantidadePorCaixa: number;
  precoPorCaixa: number;
  permiteEditarPrecoPedido: boolean;
  status: string;
  observacoes: string | null;
  fotoUrl: string | null;
};

export function AtacadoProdutosTable({ produtos, canManage }: { produtos: AtacadoProdutoRow[]; canManage: boolean }) {
  const [editing, setEditing] = useState<AtacadoProdutoRow | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Foto</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead>Codigo</TableHead>
            <TableHead>Codigo de barras</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Cor</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Caixa</TableHead>
            <TableHead>Preco livre</TableHead>
            <TableHead>Status</TableHead>
            {canManage ? <TableHead>Acao</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtos.map((produto) => (
            <TableRow key={produto.id}>
              <TableCell>
                {produto.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={produto.fotoUrl} alt={produto.nome} className="h-12 w-12 rounded-md border object-cover" />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-md border bg-muted text-center text-xs text-muted-foreground">Sem foto</div>
                )}
              </TableCell>
              <TableCell>{produto.referencia ?? "-"}</TableCell>
              <TableCell>{produto.codigo ?? "-"}</TableCell>
              <TableCell>{produto.codigoBarras ?? "-"}</TableCell>
              <TableCell className="font-semibold">{produto.nome}</TableCell>
              <TableCell>{produto.categoria ?? "-"}</TableCell>
              <TableCell>{produto.cor ?? "-"}</TableCell>
              <TableCell>{produto.grade ?? "-"}</TableCell>
              <TableCell>{produto.quantidadePorCaixa} pares - {currency(produto.precoPorCaixa)}</TableCell>
              <TableCell>{produto.permiteEditarPrecoPedido ? "Sim" : "Nao"}</TableCell>
              <TableCell><AtacadoStatusBadge status={produto.status} /></TableCell>
              {canManage ? (
                <TableCell>
                  <Button type="button" variant="outline" onClick={() => setEditing(produto)}>Editar</Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {canManage && editing ? <ProdutoEditModal produto={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function ProdutoEditModal({ produto, onClose }: { produto: AtacadoProdutoRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border bg-background shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b p-4">
          <div>
            <div className="text-sm text-muted-foreground">Editar produto</div>
            <h2 className="text-xl font-semibold">{produto.nome}</h2>
          </div>
          <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
        </div>
        <form action={updateProdutoAction} className="grid gap-4 p-4 md:grid-cols-5">
          <input type="hidden" name="produtoId" value={produto.id} />
          <div className="space-y-2">
            <Label>Referencia</Label>
            <Input name="referencia" defaultValue={produto.referencia ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Codigo</Label>
            <Input name="codigo" defaultValue={produto.codigo ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Codigo de barras</Label>
            <Input name="codigoBarras" inputMode="numeric" defaultValue={produto.codigoBarras ?? ""} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Nome</Label>
            <Input name="nome" defaultValue={produto.nome} required />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input name="categoria" defaultValue={produto.categoria ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select name="status" className="form-select" defaultValue={produto.status}>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <Input name="cor" defaultValue={produto.cor ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Grade</Label>
            <Input name="grade" defaultValue={produto.grade ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Pares por caixa</Label>
            <Input name="quantidadePorCaixa" type="number" min={1} defaultValue={produto.quantidadePorCaixa} />
          </div>
          <div className="space-y-2">
            <Label>Preco caixa</Label>
            <Input name="precoPorCaixa" type="number" min={0} step="0.01" defaultValue={produto.precoPorCaixa} required />
          </div>
          <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium md:col-span-2">
            <input type="checkbox" name="permiteEditarPrecoPedido" defaultChecked={produto.permiteEditarPrecoPedido} className="h-4 w-4 accent-primary" />
            Liberar preco/desconto no pedido sem senha
          </label>
          <div className="space-y-2 md:col-span-5">
            <Label>Observacoes</Label>
            <Input name="observacoes" defaultValue={produto.observacoes ?? ""} />
          </div>
          <div className="space-y-2 md:col-span-5">
            <Label htmlFor={`foto-produto-${produto.id}`}>Foto do produto</Label>
            {produto.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={produto.fotoUrl} alt={produto.nome} className="mb-2 h-28 w-28 rounded-md border object-cover" />
            ) : null}
            <Input id={`foto-produto-${produto.id}`} name="foto" type="file" accept="image/*" />
            <p className="text-xs text-muted-foreground">Ao selecionar outra imagem, ela passa a ser a foto principal.</p>
          </div>
          <div className="flex justify-end gap-2 md:col-span-5">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar produto</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
