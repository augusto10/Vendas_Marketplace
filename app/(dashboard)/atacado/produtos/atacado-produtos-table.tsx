"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  numeracao: string | null;
  embalagem: string | null;
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
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Cor</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Numeração</TableHead>
            <TableHead>Embalagem</TableHead>
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
              <TableCell className="font-semibold">{produto.nome}</TableCell>
              <TableCell>{produto.categoria ?? "-"}</TableCell>
              <TableCell>{produto.cor ?? "-"}</TableCell>
              <TableCell>{labelGrade(produto.grade)}</TableCell>
              <TableCell>{produto.numeracao ?? "-"}</TableCell>
              <TableCell>{labelEmbalagem(produto.embalagem)}</TableCell>
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
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      referencia: textOrNull(formData, "referencia"),
      codigo: textOrNull(formData, "codigo"),
      codigoBarras: textOrNull(formData, "codigoBarras"),
      nome: textOrNull(formData, "nome"),
      categoria: textOrNull(formData, "categoria"),
      cor: textOrNull(formData, "cor"),
      grade: textOrNull(formData, "grade"),
      numeracao: textOrNull(formData, "numeracao"),
      embalagem: textOrNull(formData, "embalagem"),
      quantidadePorCaixa: textOrNull(formData, "quantidadePorCaixa"),
      precoPorCaixa: normalizeMoney(textOrNull(formData, "precoPorCaixa")),
      permiteEditarPrecoPedido: formData.get("permiteEditarPrecoPedido") === "on",
      status: textOrNull(formData, "status"),
      observacoes: textOrNull(formData, "observacoes")
    };

    try {
      const updateResponse = await fetch(`/api/atacado/produtos/${produto.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!updateResponse.ok) {
        const payloadError = await updateResponse.json().catch(() => null);
        throw new Error(payloadError?.error?.message ?? "Nao foi possivel salvar o produto.");
      }

      const photoFile = formData.get("foto");
      if (photoFile instanceof File && photoFile.size > 0) {
        const photoData = new FormData();
        photoData.set("file", photoFile);
        photoData.set("principal", "true");

        const photoResponse = await fetch(`/api/atacado/produtos/${produto.id}/fotos`, {
          method: "POST",
          body: photoData
        });

        if (!photoResponse.ok) {
          const payloadError = await photoResponse.json().catch(() => null);
          throw new Error(payloadError?.error?.message ?? "Produto salvo, mas nao foi possivel atualizar a foto.");
        }
      }

      onClose();
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nao foi possivel salvar o produto.");
    } finally {
      setPending(false);
    }
  }

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
        <form onSubmit={handleSubmit} className="grid gap-4 p-4 md:grid-cols-5">
          <input type="hidden" name="produtoId" value={produto.id} />
          <div className="space-y-2">
            <Label>Referencia</Label>
            <Input name="referencia" defaultValue={produto.referencia ?? ""} />
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
            <select name="grade" className="form-select" defaultValue={produto.grade ?? ""}>
              <option value="">Selecione</option>
              <option value="ALTA">Alta</option>
              <option value="BAIXA">Baixa</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Numeracao</Label>
            <select name="numeracao" className="form-select" defaultValue={produto.numeracao ?? ""}>
              <option value="">Selecione</option>
              {shoeSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Embalagem</Label>
            <select name="embalagem" className="form-select" defaultValue={produto.embalagem ?? ""}>
              <option value="">Selecione</option>
              <option value="SACO">Saco</option>
              <option value="CAIXA">Caixa</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Pares por caixa</Label>
            <Input name="quantidadePorCaixa" type="number" min={1} defaultValue={produto.quantidadePorCaixa} />
          </div>
          <div className="space-y-2">
            <Label>Preco caixa</Label>
            <Input name="precoPorCaixa" type="text" inputMode="decimal" defaultValue={produto.precoPorCaixa.toString()} required />
          </div>
          <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium md:col-span-3">
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
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancelar</Button>
            <Button type="submit" loading={pending}>Salvar produto</Button>
          </div>
          {error ? <div className="md:col-span-5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">{error}</div> : null}
        </form>
      </div>
    </div>
  );
}

function textOrNull(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeMoney(value: string | null) {
  if (!value) return "0";
  return value.replace(/\./g, "").replace(",", ".");
}

function labelGrade(value: string | null) {
  if (value === "ALTA") return "Alta";
  if (value === "BAIXA") return "Baixa";
  return value ?? "-";
}

function labelEmbalagem(value: string | null) {
  if (value === "SACO") return "Saco";
  if (value === "CAIXA") return "Caixa";
  return "-";
}

const shoeSizes = ["33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47"];
