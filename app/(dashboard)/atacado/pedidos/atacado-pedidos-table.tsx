"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AtacadoStatusBadge, statusLabel } from "@/features/atacado/status";
import { currency } from "@/lib/utils";
import { Package } from "lucide-react";

export type AtacadoPedidoRow = {
  id: string;
  numero: string;
  criadoEm: string;
  atualizadoEm: string;
  observacao: string | null;
  valorTotal: number;
  status: string;
  cliente: {
    nome: string;
    telefone: string | null;
    cidade: string | null;
    estado: string | null;
    endereco: string | null;
  };
  vendedor: {
    name: string | null;
    email: string | null;
  } | null;
  itens: Array<{
    id: string;
    quantidadeCaixas: number;
    quantidadePares: number;
    precoCaixa: number;
    valorTotal: number;
    observacao: string | null;
    produto: {
      nome: string;
      referencia: string | null;
      categoria: string | null;
      grade: string | null;
      quantidadePorCaixa: number;
    };
  }>;
  pagamentos: Array<{
    status: string;
    valorPago: number;
    observacao: string | null;
    registradoEm: string;
  }>;
  entregas: Array<{
    tipo: string;
    status: string;
    endereco: string | null;
    observacao: string | null;
    createdAt: string;
  }>;
};

const lockedStatuses = ["EM_ENTREGA", "ENTREGUE", "CANCELADO"];

export function AtacadoPedidosTable({ pedidos, isMaster }: { pedidos: AtacadoPedidoRow[]; isMaster: boolean }) {
  const [selected, setSelected] = useState<AtacadoPedidoRow | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Numero</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Acao</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedidos.map((pedido) => {
            const locked = isLockedPedido(pedido.status);
            const canOpen = !locked || isMaster;

            return (
              <TableRow key={pedido.id}>
                <TableCell className="font-semibold" title={pedido.numero}>{shortPedidoNumber(pedido.numero)}</TableCell>
                <TableCell><AtacadoStatusBadge status={pedido.status} /></TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" disabled={!canOpen} onClick={() => setSelected(pedido)}>
                      Detalhe
                    </Button>
                    {pedido.status !== "CANCELADO" && pedido.status !== "ENTREGUE" && (
                      <Link href={`/atacado/pedidos/${pedido.id}/separacao`}>
                        <Button type="button" variant="secondary" size="sm" className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Separação
                        </Button>
                      </Link>
                    )}
                    {!canOpen ? (
                      <span className="text-xs text-muted-foreground">Somente Master</span>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {selected ? <PedidoDetailsModal pedido={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

function PedidoDetailsModal({ pedido, onClose }: { pedido: AtacadoPedidoRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border bg-background shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b p-4">
          <div>
            <div className="text-sm text-muted-foreground">Pedido</div>
            <h2 className="text-xl font-semibold">{pedido.numero}</h2>
          </div>
          <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-3">
          <InfoGroup
            title="Cliente"
            rows={[
              ["Nome", pedido.cliente.nome],
              ["Telefone", pedido.cliente.telefone || "-"],
              ["Cidade/UF", [pedido.cliente.cidade, pedido.cliente.estado].filter(Boolean).join(" / ") || "-"],
              ["Endereco", pedido.cliente.endereco || "-"]
            ]}
          />
          <InfoGroup
            title="Pedido"
            rows={[
              ["Data", formatDateTime(pedido.criadoEm)],
              ["Atualizado", formatDateTime(pedido.atualizadoEm)],
              ["Status", <AtacadoStatusBadge key="status" status={pedido.status} />],
              ["Vendedor", pedido.vendedor?.name || pedido.vendedor?.email || "-"]
            ]}
          />
          <InfoGroup
            title="Valores"
            rows={[
              ["Itens", pedido.itens.length.toLocaleString("pt-BR")],
              ["Total", currency(pedido.valorTotal)],
              ["Observacao", pedido.observacao || "-"]
            ]}
          />
        </div>

        <div className="px-4 pb-4">
          <div className="rounded-lg border">
            <div className="border-b p-3 font-medium">Itens do pedido</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Caixas</TableHead>
                  <TableHead>Pares</TableHead>
                  <TableHead>Valor caixa</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Observacao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedido.itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[320px]">{item.produto.nome}</TableCell>
                    <TableCell>{item.produto.referencia || "-"}</TableCell>
                    <TableCell>{item.quantidadeCaixas.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{item.quantidadePares.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{currency(item.precoCaixa)}</TableCell>
                    <TableCell>{currency(item.valorTotal)}</TableCell>
                    <TableCell className="max-w-[240px]">{item.observacao || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="grid gap-4 px-4 pb-4 lg:grid-cols-2">
          <div className="rounded-lg border">
            <div className="border-b p-3 font-medium">Pagamentos</div>
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader>
              <TableBody>
                {pedido.pagamentos.length ? pedido.pagamentos.map((pagamento) => (
                  <TableRow key={`${pagamento.registradoEm}-${pagamento.valorPago}`}>
                    <TableCell>{formatDate(pagamento.registradoEm)}</TableCell>
                    <TableCell>{statusLabel(pagamento.status)}</TableCell>
                    <TableCell>{currency(pagamento.valorPago)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} className="text-muted-foreground">Sem pagamento registrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="rounded-lg border">
            <div className="border-b p-3 font-medium">Entregas</div>
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {pedido.entregas.length ? pedido.entregas.map((entrega) => (
                  <TableRow key={`${entrega.createdAt}-${entrega.status}`}>
                    <TableCell>{formatDate(entrega.createdAt)}</TableCell>
                    <TableCell>{statusLabel(entrega.tipo)}</TableCell>
                    <TableCell>{statusLabel(entrega.status)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} className="text-muted-foreground">Sem entrega registrada.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoGroup({ title, rows }: { title: string; rows: Array<[string, React.ReactNode]> }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-3 font-medium">{title}</div>
      <div className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-t pt-2 first:border-t-0 first:pt-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function shortPedidoNumber(numero: string) {
  const [, date, sequence] = numero.match(/^AT(\d{8})-(\d+)$/) ?? [];
  if (!date || !sequence) return numero;
  return `#${sequence}`;
}

function isLockedPedido(status: string) {
  return lockedStatuses.includes(status);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}
