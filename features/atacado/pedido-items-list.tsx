"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currency } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export type PedidoItem = {
  id: string;
  produtoId: string;
  nomeProduto: string;
  cor: string | null;
  grade: string | null;
  precoCaixa: number;
  quantidadeCaixas: number;
  descontoPercentual: number;
};

interface PedidoItemsListProps {
  items: PedidoItem[];
  onRemoveItem: (produtoId: string) => void;
  onUpdateQuantidade: (produtoId: string, quantidade: number) => void;
  onUpdatePreco: (produtoId: string, preco: number) => void;
  onUpdateDesconto: (produtoId: string, desconto: number) => void;
}

export function PedidoItemsList({
  items,
  onRemoveItem,
  onUpdateQuantidade,
  onUpdatePreco,
  onUpdateDesconto
}: PedidoItemsListProps) {
  const total = items.reduce((sum, item) => {
    const precoFinal = item.precoCaixa * (1 - item.descontoPercentual / 100);
    return sum + precoFinal * item.quantidadeCaixas;
  }, 0);

  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos adicionados ({items.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Cor/Grade</TableHead>
                <TableHead>Qtd Caixas</TableHead>
                <TableHead>Preço/Caixa</TableHead>
                <TableHead>Desconto %</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const precoFinal = item.precoCaixa * (1 - item.descontoPercentual / 100);
                const subtotal = precoFinal * item.quantidadeCaixas;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[250px] truncate">
                      <div className="font-medium">{item.nomeProduto}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.cor || item.grade ? `${item.cor || "-"} / ${item.grade || "-"}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantidadeCaixas}
                        onChange={(e) => onUpdateQuantidade(item.produtoId, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precoCaixa}
                        onChange={(e) => onUpdatePreco(item.produtoId, parseFloat(e.target.value) || 0)}
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.descontoPercentual}
                        onChange={(e) => onUpdateDesconto(item.produtoId, Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold">{currency(subtotal)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemoveItem(item.produtoId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-6 flex justify-end">
          <div className="w-full md:w-96 space-y-2 rounded-md border bg-muted/20 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{currency(total)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total previsto:</span>
              <span>{currency(total)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
