import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FretesPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const incomes = await prisma.shopeeIncome.findMany({ where: { orderCreatedAt: { gte: period.start, lte: period.end }, sku: { not: "-" } }, orderBy: { orderCreatedAt: "desc" }, take: 500 });
  const shopeePaidFreight = incomes.reduce((sum, row) => sum + Number(row.shopeeShippingDiscount ?? 0), 0);
  const buyerPaidFreight = incomes.reduce((sum, row) => sum + Number(row.buyerShippingFee ?? 0), 0);
  const logisticsFreight = incomes.reduce((sum, row) => sum + Number(row.logisticsFreight ?? 0), 0);
  const reverse = incomes.reduce((sum, row) => sum + Number(row.reverseShippingFee ?? 0), 0);
  const freightByCarrier = [...incomes.reduce((grouped, row) => {
    const carrier = row.carrier?.trim() || "Sem transportadora";
    const current = grouped.get(carrier) ?? { carrier, orders: new Set<string>(), logisticsFreight: 0 };
    const rowLogisticsFreight = Number(row.logisticsFreight ?? 0);
    current.orders.add(row.orderMarketplaceId);
    current.logisticsFreight += rowLogisticsFreight;
    grouped.set(carrier, current);
    return grouped;
  }, new Map<string, { carrier: string; orders: Set<string>; logisticsFreight: number }>()).values()]
    .sort((left, right) => right.logisticsFreight - left.logisticsFreight);

  return (
    <div className="space-y-6">
      <PageHeader title="Fretes e logistica" description="Frete pago pela Shopee, frete pago pelo comprador, frete logistico, envio reverso e transportadoras." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Frete pago pela Shopee</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(shopeePaidFreight)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Frete pago pelo comprador</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(buyerPaidFreight)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Frete logistico</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(logisticsFreight)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Envio reverso</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(reverse)}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Total de fretes por transportadora</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transportadora</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Frete logistico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {freightByCarrier.map((row) => (
                <TableRow key={row.carrier}>
                  <TableCell className="font-medium">{row.carrier}</TableCell>
                  <TableCell>{row.orders.size.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{currency(row.logisticsFreight)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Fretes por pedido</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Data pedido</TableHead><TableHead>Data pagamento</TableHead><TableHead>Pedido</TableHead><TableHead>SKU</TableHead><TableHead>Transportadora</TableHead><TableHead>Frete pago Shopee</TableHead><TableHead>Frete comprador</TableHead><TableHead>Frete logistico</TableHead><TableHead>Envio reverso</TableHead></TableRow></TableHeader>
            <TableBody>
              {incomes.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.orderCreatedAt?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{row.paymentCompletedAt?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{row.orderMarketplaceId}</TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.carrier}</TableCell>
                  <TableCell>{currency(row.shopeeShippingDiscount?.toString())}</TableCell>
                  <TableCell>{currency(row.buyerShippingFee?.toString())}</TableCell>
                  <TableCell>{currency(row.logisticsFreight?.toString())}</TableCell>
                  <TableCell>{currency(row.reverseShippingFee?.toString())}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
