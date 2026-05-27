import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsePeriod } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { OrdersDetailsTable, type OrderDetails } from "./orders-details-table";

export const dynamic = "force-dynamic";

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string; pedido?: string }> }) {
  const params = await searchParams;
  const period = parsePeriod(params);
  const pedido = params.pedido?.trim() ?? "";
  const orders = await prisma.order.findMany({
    where: {
      AND: [
        { OR: [{ createdAtOrder: { gte: period.start, lte: period.end } }, { paidAt: { gte: period.start, lte: period.end } }] },
        pedido ? { marketplaceId: { contains: pedido, mode: "insensitive" } } : {}
      ]
    },
    orderBy: { createdAtOrder: "desc" },
    take: 200,
    include: { items: true, invoices: true, incomes: true }
  });
  const orderIds = orders.map((order) => order.marketplaceId);
  const adjustments = orderIds.length
    ? await prisma.adjustment.findMany({
      where: { orderMarketplaceId: { in: orderIds } },
      orderBy: { occurredAt: "desc" }
    })
    : [];
  const adjustmentsByOrder = new Map<string, typeof adjustments>();
  for (const adjustment of adjustments) {
    const key = adjustment.orderMarketplaceId ?? "";
    if (!key) continue;
    const current = adjustmentsByOrder.get(key) ?? [];
    current.push(adjustment);
    adjustmentsByOrder.set(key, current);
  }
  const ordersWithAdjustments = adjustmentsByOrder.size;
  const details: OrderDetails[] = orders.map((order) => {
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

    return {
      id: order.id,
      marketplaceId: order.marketplaceId,
      createdAtOrder: order.createdAtOrder?.toISOString() ?? null,
      paidAt: order.paidAt?.toISOString() ?? null,
      carrier: order.carrier || "-",
      state: order.state || order.invoices[0]?.state || "-",
      customerName: order.buyerUsername,
      status: order.paidAt ? "Pago" : "Pendente",
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
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos" description="Consulta operacional de pedidos, conciliacao fiscal/financeira e sinais de pendencia." />
      <PeriodFilter period={period}>
        <div className="space-y-1.5">
          <Label htmlFor="pedido">Pedido</Label>
          <Input id="pedido" name="pedido" defaultValue={pedido} placeholder="Numero do pedido" />
        </div>
      </PeriodFilter>
      <Card>
        <CardHeader>
          <CardTitle>Pedidos importados</CardTitle>
          <p className="text-sm text-muted-foreground">
            {ordersWithAdjustments.toLocaleString("pt-BR")} pedidos com ajustes no periodo filtrado.
          </p>
        </CardHeader>
        <CardContent>
          <OrdersDetailsTable orders={details} />
        </CardContent>
      </Card>
    </div>
  );
}
