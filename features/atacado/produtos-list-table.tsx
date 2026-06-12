"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currency } from "@/lib/utils";
import { Search } from "lucide-react";

export type Produto = {
  id: string;
  nome: string;
  codigo?: string | null;
  referencia?: string | null;
  cor: string | null;
  grade: string | null;
  precoPorCaixa: number;
  quantidadePorCaixa: number;
};

interface ProdutosListTableProps {
  produtos: Produto[];
  onSelectProduto: (produto: Produto) => void;
  title?: string;
  description?: string;
}

export function ProdutosListTable({
  produtos,
  onSelectProduto,
  title = "Produtos disponíveis",
  description = "Clique em um produto para adicioná-lo ao pedido"
}: ProdutosListTableProps) {
  const [search, setSearch] = useState("");

  const filteredProdutos = produtos.filter((produto) =>
    produto.nome.toLowerCase().includes(search.toLowerCase()) ||
    produto.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    produto.referencia?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="flex-1 md:flex-none md:w-64">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Qtd/Caixa</TableHead>
                <TableHead>Preço/Caixa</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProdutos.length > 0 ? (
                filteredProdutos.map((produto) => (
                  <TableRow key={produto.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">{produto.codigo || produto.referencia || "-"}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{produto.nome}</TableCell>
                    <TableCell>{produto.cor || "-"}</TableCell>
                    <TableCell>{produto.grade || "-"}</TableCell>
                    <TableCell className="text-center">{produto.quantidadePorCaixa}</TableCell>
                    <TableCell className="font-semibold">{currency(produto.precoPorCaixa)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectProduto(produto)}
                      >
                        Adicionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
