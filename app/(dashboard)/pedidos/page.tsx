import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsePeriod } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { OrdersDetailsTable, type OrderDetails } from "./orders-details-table";

export const dynamic = "force-dynamic";

type OrderStatusFilter = "all" | "adjustments" | "paid" | "unpaid";

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string; pedido?: string; status?: string }> }) {
  const params = await searchParams;
  const hasFilteredPeriod = Boolean(params.start || params.end);
  const period = parsePeriod(params);
  const pedido = params.pedido?.trim() ?? "";
  const status = normalizeStatusFilter(params.status);
  const [periodAdjustments, periodWalletAdjustments] = hasFilteredPeriod ? await Promise.all([
    prisma.adjustment.findMany({
      where: { occurredAt: { gte: period.start, lte: period.end } },
      orderBy: { occurredAt: "desc" }
    }),
    prisma.walletTransaction.findMany({
      where: {
        transactionDate: { gte: period.start, lte: period.end },
        OR: [
          { transactionType: { contains: "Ajuste", mode: "insensitive" } },
          { description: { contains: "Ajuste", mode: "insensitive" } }
        ]
      },
      orderBy: { transactionDate: "desc" }
    })
  ]) : [[], []] as const;
  const adjustedOrderIds = [
    ...new Set([
      ...periodAdjustments.map((adjustment) => adjustment.orderMarketplaceId).filter((value): value is string => Boolean(value)),
      ...periodWalletAdjustments.map((adjustment) => adjustment.orderMarketplaceId).filter((value): value is string => Boolean(value))
    ])
  ];
  const orders = hasFilteredPeriod ? await prisma.order.findMany({
    where: {
      AND: [
        {
          OR: [
            { createdAtOrder: { gte: period.start, lte: period.end } },
            { paidAt: { gte: period.start, lte: period.end } },
            ...(adjustedOrderIds.length ? [{ marketplaceId: { in: adjustedOrderIds } }] : [])
          ]
        },
        pedido ? { marketplaceId: { contains: pedido, mode: "insensitive" } } : {}
      ]
    },
    orderBy: [{ createdAtOrder: "asc" }, { paidAt: "asc" }],
    include: { items: true, invoices: true, incomes: true }
  }) : [];
  const orderIds = orders.map((order) => order.marketplaceId);
  const [linkedAdjustments, linkedWalletAdjustments] = orderIds.length
    ? await Promise.all([
      prisma.adjustment.findMany({
        where: { orderMarketplaceId: { in: orderIds } },
        orderBy: { occurredAt: "desc" }
      }),
      prisma.walletTransaction.findMany({
        where: {
          orderMarketplaceId: { in: orderIds },
          OR: [
            { transactionType: { contains: "Ajuste", mode: "insensitive" } },
            { description: { contains: "Ajuste", mode: "insensitive" } }
          ]
        },
        orderBy: { transactionDate: "desc" }
      })
    ])
    : [[], []] as const;
  const allAdjustments = mergeAdjustments([
    ...periodAdjustments.map((adjustment) => ({
      id: `adjustment-${adjustment.id}`,
      orderMarketplaceId: adjustment.orderMarketplaceId,
      occurredAt: adjustment.occurredAt,
      description: adjustment.description || "Ajuste",
      reason: adjustment.reason || "-",
      amount: Number(adjustment.amount ?? 0)
    })),
    ...linkedAdjustments.map((adjustment) => ({
      id: `adjustment-${adjustment.id}`,
      orderMarketplaceId: adjustment.orderMarketplaceId,
      occurredAt: adjustment.occurredAt,
      description: adjustment.description || "Ajuste",
      reason: adjustment.reason || "-",
      amount: Number(adjustment.amount ?? 0)
    })),
    ...periodWalletAdjustments.map((adjustment) => ({
      id: `wallet-${adjustment.id}`,
      orderMarketplaceId: adjustment.orderMarketplaceId,
      occurredAt: adjustment.transactionDate,
      description: adjustment.description || adjustment.transactionType || "Ajuste",
      reason: adjustment.transactionType || "-",
      amount: Number(adjustment.amount ?? adjustment.adjustmentValue ?? 0)
    })),
    ...linkedWalletAdjustments.map((adjustment) => ({
      id: `wallet-${adjustment.id}`,
      orderMarketplaceId: adjustment.orderMarketplaceId,
      occurredAt: adjustment.transactionDate,
      description: adjustment.description || adjustment.transactionType || "Ajuste",
      reason: adjustment.transactionType || "-",
      amount: Number(adjustment.amount ?? adjustment.adjustmentValue ?? 0)
    }))
  ].filter(isRelevantAdjustmentAlert));
  const adjustmentsByOrder = new Map<string, typeof allAdjustments>();
  for (const adjustment of allAdjustments) {
    const key = adjustment.orderMarketplaceId ?? "";
    if (!key) continue;
    const current = adjustmentsByOrder.get(key) ?? [];
    current.push(adjustment);
    adjustmentsByOrder.set(key, current);
  }
  const rawDetails: OrderDetails[] = orders.map((order) => {
    const productRows = order.incomes.filter((income) => income.sku && income.sku !== "-");
    const incomeRows = productRows.length ? productRows : order.incomes;
    const products = incomeRows
      .filter((income) => income.productName || income.sku)
      .map((income) => ({
        sku: income.sku || "-",
        name: income.productName || "-",
        quantity: 1,
        unitPrice: Number(income.productPrice ?? 0),
        total: Number(income.productPrice ?? 0)
      }));
    const shopeeGross = incomeRows.reduce((sum, income) => sum + Number(income.productPrice ?? 0), 0);
    const received = incomeRows.reduce((sum, income) => sum + Number(income.releasedAmount ?? 0), 0);
    const commission = incomeRows.reduce((sum, income) => sum + Math.abs(Number(income.commissionFee ?? 0)), 0);
    const serviceFee = incomeRows.reduce((sum, income) => sum + Math.abs(Number(income.serviceFee ?? 0)), 0);
    const transactionFee = incomeRows.reduce((sum, income) => sum + Math.abs(Number(income.transactionFee ?? 0)), 0);
    const affiliateFee = incomeRows.reduce((sum, income) => sum + Math.abs(Number(income.affiliateCommissionFee ?? 0)), 0);
    const invoiceTotal = order.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0);
    const invoiceFreight = order.invoices.reduce((sum, invoice) => sum + Number(invoice.freightAmount ?? 0), 0);
    const difal = order.invoices.reduce((sum, invoice) => sum + Number(invoice.estimatedDifal ?? 0), 0);
    const unitsSold = order.invoices.reduce((sum, invoice) => sum + invoice.quantity, 0) || products.reduce((sum, product) => sum + product.quantity, 0);
    const orderAdjustments = adjustmentsByOrder.get(order.marketplaceId) ?? [];
    const paymentReferenceDate = order.createdAtOrder ?? order.invoices[0]?.emissionDate ?? null;
    const paymentOpenDays = order.paidAt ? null : differenceInDays(new Date(), paymentReferenceDate);

    return {
      id: order.id,
      marketplaceId: order.marketplaceId,
      createdAtOrder: order.createdAtOrder?.toISOString() ?? null,
      paidAt: order.paidAt?.toISOString() ?? null,
      carrier: order.carrier || "-",
      state: order.state || order.invoices[0]?.state || "-",
      customerName: order.buyerUsername,
      status: order.paidAt ? "Pago" as const : "Pendente" as const,
      paymentOpenDays,
      paymentOverdue: paymentOpenDays !== null && paymentOpenDays > 30,
      shopeeGross,
      received,
      commission,
      serviceFee,
      transactionFee,
      affiliateFee,
      invoiceTotal,
      invoiceFreight,
      difal,
      productsCount: products.length,
      unitsSold,
      adjustments: orderAdjustments.map((adjustment) => ({
        id: adjustment.id,
        occurredAt: adjustment.occurredAt?.toISOString() ?? null,
        description: adjustment.description || "Ajuste",
        reason: adjustment.reason || "-",
        amount: Number(adjustment.amount)
      })),
      invoices: order.invoices.map((invoice) => ({
        documentNumber: invoice.documentNumber,
        emissionDate: invoice.emissionDate.toISOString(),
        total: Number(invoice.totalAmount ?? 0),
        freight: Number(invoice.freightAmount ?? 0),
        state: invoice.state || "-"
      })),
      products
    };
  }).sort((left, right) => getOrderTime(left) - getOrderTime(right));
  const details = rawDetails.filter((order) => matchesStatusFilter(order, status));
  const ordersWithAdjustments = details.filter((order) => order.adjustments.length > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos importados" description="Consulta operacional de pedidos, conciliacao fiscal e financeira, notas e ajustes vinculados." />
      <PeriodFilter period={period}>
        <div className="grid gap-3 sm:grid-cols-[190px_170px]">
          <div className="space-y-1.5">
            <Label htmlFor="pedido">Pedido</Label>
            <Input id="pedido" name="pedido" defaultValue={pedido} placeholder="Numero do pedido" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Filtro de pedidos</Label>
            <select id="status" name="status" defaultValue={status} className="form-select">
              <option value="all">Todos</option>
              <option value="adjustments">Pedidos com ajustes</option>
              <option value="paid">Pagos</option>
              <option value="unpaid">Nao pagos</option>
            </select>
          </div>
        </div>
      </PeriodFilter>
      {hasFilteredPeriod ? (
        <Card>
          <CardHeader>
            <CardTitle>Pedidos importados</CardTitle>
            <p className="text-sm text-muted-foreground">
              {details.length.toLocaleString("pt-BR")} pedidos no periodo filtrado. {ordersWithAdjustments.toLocaleString("pt-BR")} com ajustes.
            </p>
          </CardHeader>
          <CardContent>
            <OrdersDetailsTable orders={details} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pedidos importados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-dashed bg-muted/35 p-6 text-sm text-muted-foreground">
              Selecione o periodo e clique em Filtrar para visualizar os pedidos.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type AdjustmentAlert = {
  id: string;
  orderMarketplaceId: string | null;
  occurredAt: Date | null;
  description: string;
  reason: string;
  amount: number;
};

function mergeAdjustments(adjustments: AdjustmentAlert[]) {
  return [...new Map(adjustments.map((adjustment) => [adjustmentKey(adjustment), adjustment])).values()]
    .sort((left, right) => (right.occurredAt?.getTime() ?? 0) - (left.occurredAt?.getTime() ?? 0));
}

function getOrderTime(order: Pick<OrderDetails, "createdAtOrder" | "paidAt">) {
  const time = new Date(order.createdAtOrder ?? order.paidAt ?? "").getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function normalizeStatusFilter(value: string | undefined): OrderStatusFilter {
  return value === "adjustments" || value === "paid" || value === "unpaid" ? value : "all";
}

function matchesStatusFilter(order: OrderDetails, status: OrderStatusFilter) {
  if (status === "adjustments") return order.adjustments.length > 0;
  if (status === "paid") return order.status === "Pago";
  if (status === "unpaid") return order.status === "Pendente";
  return true;
}

function startOfLocalDay(date?: Date | null) {
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function differenceInDays(left?: Date | null, right?: Date | null) {
  const leftDay = startOfLocalDay(left);
  const rightDay = startOfLocalDay(right);
  if (!leftDay || !rightDay) return null;
  return Math.round((leftDay.getTime() - rightDay.getTime()) / 86400000);
}

function isRelevantAdjustmentAlert(adjustment: AdjustmentAlert) {
  const text = normalizeAdjustmentText(`${adjustment.description} ${adjustment.reason}`);
  if (text.includes("acelera") || text.includes("antecip")) return false;

  return (
    text.includes("ajuste") ||
    text.includes("apos pagamento") ||
    text.includes("devolu") ||
    text.includes("reembolso") ||
    text.includes("return/refund") ||
    text.includes("refund") ||
    text.includes("chargeback") ||
    text.includes("estorno") ||
    text.includes("outros")
  );
}

function adjustmentKey(adjustment: AdjustmentAlert) {
  const order = normalizeAdjustmentText(adjustment.orderMarketplaceId || "sem-pedido");
  const date = adjustment.occurredAt?.toISOString().slice(0, 10) ?? "sem-data";
  const amount = adjustment.amount.toFixed(2);
  const category = adjustmentCategory(adjustment);

  return `${order}|${date}|${amount}|${category}`;
}

function adjustmentCategory(adjustment: AdjustmentAlert) {
  const text = normalizeAdjustmentText(`${adjustment.description} ${adjustment.reason}`);
  if (text.includes("return/refund") || text.includes("refund") || text.includes("reembolso") || text.includes("devolu")) return "devolucao-reembolso";
  if (text.includes("icms") || text.includes("difal")) return "difal";
  if (text.includes("chargeback") || text.includes("estorno")) return "estorno";
  if (text.includes("outros")) return "outros";
  if (text.includes("apos pagamento")) return "ajuste-apos-pagamento";
  if (text.includes("ajuste")) return "ajuste";
  return text || "ajuste";
}

function normalizeAdjustmentText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
