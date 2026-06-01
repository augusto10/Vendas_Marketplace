"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, currency, moneyToneClass, signedCurrency } from "@/lib/utils";

export type OrderDetails = {
  id: string;
  marketplaceId: string;
  createdAtOrder: string | null;
  paidAt: string | null;
  carrier: string;
  state: string;
  customerName: string | null;
  status: "Pago" | "Pendente";
  shopeeGross: number;
  received: number;
  commission: number;
  serviceFee: number;
  transactionFee: number;
  affiliateFee: number;
  invoiceTotal: number;
  invoiceFreight: number;
  difal: number;
  productsCount: number;
  unitsSold: number;
  adjustments: Array<{
    id: string;
    occurredAt: string | null;
    description: string;
    reason: string;
    amount: number;
  }>;
  invoices: Array<{
    documentNumber: string;
    emissionDate: string;
    total: number;
    freight: number;
    state: string;
  }>;
  products: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
};

export function OrdersDetailsTable({ orders }: { orders: OrderDetails[] }) {
  const [selected, setSelected] = useState<OrderDetails | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Venda</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Produtos</TableHead>
            <TableHead>Unidades vendidas</TableHead>
            <TableHead>Ajustes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.marketplaceId}</TableCell>
              <TableCell>{formatDate(order.createdAtOrder)}</TableCell>
              <TableCell>{formatDate(order.paidAt)}</TableCell>
              <TableCell>{order.productsCount.toLocaleString("pt-BR")}</TableCell>
              <TableCell>{order.unitsSold.toLocaleString("pt-BR")}</TableCell>
              <TableCell>
                {order.adjustments.length ? (
                  <div className="space-y-1">
                    <Badge className="border-amber-500/25 bg-amber-500/15 text-amber-300 hover:bg-amber-500/20">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {order.adjustments.length.toLocaleString("pt-BR")} alerta(s)
                    </Badge>
                    <div className="max-w-[260px] truncate text-xs text-amber-300">
                      <span className={moneyToneClass(getNetAdjustment(order.adjustments))}>
                        {signedCurrency(getNetAdjustment(order.adjustments))}
                      </span>{" "}
                      - {order.adjustments[0]?.reason || order.adjustments[0]?.description}
                    </div>
                  </div>
                ) : "-"}
              </TableCell>
              <TableCell>
                <Badge className={order.status === "Pago" ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20" : "bg-amber-500/15 text-amber-300 hover:bg-amber-500/20"}>
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelected(order)}>
                  Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selected ? <OrderModal order={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

function OrderModal({ order, onClose }: { order: OrderDetails; onClose: () => void }) {
  const discountAdjustments = order.adjustments.filter(isDiscountAdjustment);
  const adjustmentNet = getNetAdjustment(discountAdjustments);
  const adjustmentDiscount = discountAdjustments.reduce((sum, adjustment) => adjustment.amount < 0 ? sum + Math.abs(adjustment.amount) : sum, 0);
  const adjustmentAddition = discountAdjustments.reduce((sum, adjustment) => adjustment.amount > 0 ? sum + adjustment.amount : sum, 0);
  const remainingAfterAdjustments = order.received + adjustmentNet;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border bg-background shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b p-4">
          <div>
            <div className="text-sm text-muted-foreground">Pedido</div>
            <h2 className="text-xl font-semibold">{order.marketplaceId}</h2>
          </div>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-3">
          <InfoGroup
            title="Cliente"
            rows={[
              ["Nome", order.customerName || "Nao informado nas planilhas"],
              ["UF", order.state],
              ["Transportadora", order.carrier],
              ["Produtos", order.productsCount.toLocaleString("pt-BR")],
              ["Unidades vendidas", order.unitsSold.toLocaleString("pt-BR")]
            ]}
          />
          <InfoGroup
            title="Datas"
            rows={[
              ["Venda", formatDate(order.createdAtOrder)],
              ["Pagamento", formatDate(order.paidAt)],
              ["Status", order.status]
            ]}
          />
          <InfoGroup
            title="Valores"
            rows={[
              ["Venda Shopee", currency(order.shopeeGross)],
              ["Recebido pago", currency(order.received)],
              ["Descontado em ajustes", <MoneyValue key="discount" value={-adjustmentDiscount} emptyWhenZero />],
              ["Acrescentado em ajustes", <MoneyValue key="addition" value={adjustmentAddition} emptyWhenZero />],
              ["Resultado dos ajustes", <MoneyValue key="net" value={adjustmentNet} />],
              ["Restou apos ajustes", <span key="remaining" className="font-semibold">{currency(remainingAfterAdjustments)}</span>],
              ["Nota ERP", currency(order.invoiceTotal)],
              ["Frete nota", currency(order.invoiceFreight)]
            ]}
          />
        </div>

        {order.adjustments.length ? (
          <div className="mx-4 mb-4 flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/15 p-3 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Este pedido possui alertas de ajustes.</div>
              <div>Confira motivo, descricao e valor antes de fechar a conciliacao.</div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 px-4 pb-4 xl:grid-cols-2">
          <InfoGroup
            title="Descontos"
            rows={[
              ["Comissao", currency(order.commission)],
              ["Taxa servico", currency(order.serviceFee)],
              ["Taxa transacao", currency(order.transactionFee)],
              ["Afiliados", currency(order.affiliateFee)],
              ["DIFAL", currency(order.difal)]
            ]}
          />
          {order.adjustments.length ? (
            <div className="rounded-lg border border-amber-200">
              <div className="border-b p-3 font-medium text-amber-800">Ajustes do pedido</div>
              <div>
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">Data</TableHead>
                      <TableHead className="min-w-[180px]">Descricao</TableHead>
                      <TableHead className="min-w-[300px]">Motivo</TableHead>
                      <TableHead className="w-[130px] text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.adjustments.map((adjustment) => (
                      <TableRow key={adjustment.id}>
                        <TableCell>{formatDate(adjustment.occurredAt)}</TableCell>
                        <TableCell className="align-top whitespace-normal">{adjustment.description}</TableCell>
                        <TableCell className="align-top whitespace-normal">{adjustment.reason}</TableCell>
                        <TableCell className={cn("text-right align-top font-medium whitespace-nowrap", moneyToneClass(adjustment.amount))}>
                          {signedCurrency(adjustment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
          <div className="rounded-lg border">
            <div className="border-b p-3 font-medium">Notas fiscais</div>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nota</TableHead>
                    <TableHead>Emissao</TableHead>
                    <TableHead>UF</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.invoices.length ? order.invoices.map((invoice) => (
                    <TableRow key={`${invoice.documentNumber}-${invoice.emissionDate}`}>
                      <TableCell>{invoice.documentNumber}</TableCell>
                      <TableCell>{formatDate(invoice.emissionDate)}</TableCell>
                      <TableCell>{invoice.state}</TableCell>
                      <TableCell>{currency(invoice.total)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">Sem nota vinculada.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className={order.adjustments.length ? "rounded-lg border border-amber-200" : "rounded-lg border"}>
            <div className="flex items-center justify-between gap-3 border-b p-3 font-medium">
              <span>Produtos</span>
              {order.adjustments.length ? (
                <Badge className="bg-amber-500/15 text-amber-300 hover:bg-amber-500/20">Pedido com ajuste</Badge>
              ) : null}
            </div>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Unidades vendidas</TableHead>
                    <TableHead>Valor unitario</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.products.length ? order.products.map((product, index) => (
                    <TableRow key={`${product.sku}-${index}`}>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell className="max-w-[420px]">{product.name}</TableCell>
                      <TableCell>{product.quantity}</TableCell>
                      <TableCell>{currency(product.unitPrice)}</TableCell>
                      <TableCell>{currency(product.total)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">Sem produtos vinculados.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoGroup({ title, rows }: { title: string; rows: Array<[string, ReactNode]> }) {
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

function MoneyValue({ value, emptyWhenZero = false }: { value: number; emptyWhenZero?: boolean }) {
  if (emptyWhenZero && value === 0) return <span className="text-muted-foreground">-</span>;
  return <span className={cn("font-semibold", moneyToneClass(value))}>{signedCurrency(value)}</span>;
}

function getNetAdjustment(adjustments: OrderDetails["adjustments"]) {
  return adjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function isDiscountAdjustment(adjustment: OrderDetails["adjustments"][number]) {
  const text = normalizeText(`${adjustment.description} ${adjustment.reason}`);
  if (text.includes("acelera") || text.includes("antecip")) return false;

  return (
    text.includes("ajuste") ||
    text.includes("apos pagamento") ||
    text.includes("devolu") ||
    text.includes("reembolso") ||
    text.includes("return/refund")
  );
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
