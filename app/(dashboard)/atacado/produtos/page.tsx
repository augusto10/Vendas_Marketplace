import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { listProdutos } from "@/lib/atacado/service";
import { createProdutoAction } from "@/features/atacado/actions";
import { AtacadoProdutosTable, type AtacadoProdutoRow } from "./atacado-produtos-table";

export const dynamic = "force-dynamic";

export default async function AtacadoProdutosPage() {
  const [session, produtos] = await Promise.all([auth(), listProdutos()]);
  const canManageProducts = hasPermission(session?.user ?? null, "atacado.produtos.manage");
  const produtoRows: AtacadoProdutoRow[] = produtos.map((produto) => ({
    id: produto.id,
    referencia: produto.referencia,
    codigo: produto.codigo,
    codigoBarras: produto.codigoBarras,
    nome: produto.nome,
    categoria: produto.categoria,
    cor: produto.cor,
    grade: produto.grade,
    quantidadePorCaixa: produto.quantidadePorCaixa,
    precoPorCaixa: Number(produto.precoPorCaixa),
    permiteEditarPrecoPedido: produto.permiteEditarPrecoPedido,
    status: produto.status,
    observacoes: produto.observacoes,
    fotoUrl: produto.fotos[0]?.url ?? null
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Produtos Atacado" description="Catalogo de caixas, grades e precos para pedidos." />
      {canManageProducts ? (
        <Card>
          <CardHeader className="border-b bg-muted/20"><CardTitle>Novo produto</CardTitle></CardHeader>
          <CardContent>
            <form action={createProdutoAction} className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2"><Label>Referencia</Label><Input name="referencia" /></div>
              <div className="space-y-2"><Label>Codigo</Label><Input name="codigo" /></div>
              <div className="space-y-2"><Label>Codigo de barras</Label><Input name="codigoBarras" inputMode="numeric" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Nome</Label><Input name="nome" required /></div>
              <div className="space-y-2"><Label>Categoria</Label><Input name="categoria" /></div>
              <div className="space-y-2"><Label>Cor</Label><Input name="cor" /></div>
              <div className="space-y-2"><Label>Grade</Label><Input name="grade" /></div>
              <div className="space-y-2"><Label>Pares por caixa</Label><Input name="quantidadePorCaixa" type="number" defaultValue={12} /></div>
              <div className="space-y-2"><Label>Preco caixa</Label><Input name="precoPorCaixa" type="number" step="0.01" required /></div>
              <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium md:col-span-2">
                <input type="checkbox" name="permiteEditarPrecoPedido" className="h-4 w-4 accent-primary" />
                Liberar preco/desconto no pedido sem senha
              </label>
              <div className="space-y-2 md:col-span-2"><Label>Observacoes</Label><Input name="observacoes" /></div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="foto-novo-produto">Foto do produto</Label>
                <Input id="foto-novo-produto" name="foto" type="file" accept="image/*" />
              </div>
              <Button className="md:col-span-5 md:justify-self-end" type="submit">Cadastrar produto</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader className="border-b bg-muted/20"><CardTitle>Produtos cadastrados</CardTitle></CardHeader>
        <CardContent>
          <AtacadoProdutosTable produtos={produtoRows} canManage={canManageProducts} />
        </CardContent>
      </Card>
    </div>
  );
}
