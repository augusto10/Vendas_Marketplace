import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { currency, percent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DevolucoesPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const rows = await prisma.shopeeIncome.findMany({
    where: { orderCreatedAt: { gte: period.start, lte: period.end }, sku: { not: "-" } },
    orderBy: { orderCreatedAt: "desc" },
    take: 500
  });
  const walletAdjustments = await prisma.walletTransaction.findMany({
    where: {
      transactionDate: { gte: period.start, lte: period.end },
      transactionType: "Ajuste",
      direction: "OUT"
    },
    orderBy: { transactionDate: "desc" },
    take: 500
  });
  const refunds =
    Math.abs(rows.reduce((sum, row) => sum + Number(row.refundAmount ?? 0) + Number(row.buyerRefundedAmount ?? 0), 0)) +
    walletAdjustments.reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
  const returnedOrders = new Set(rows.filter((row) => Number(row.refundAmount ?? 0) || Number(row.buyerRefundedAmount ?? 0)).map((row) => row.orderMarketplaceId));
  for (const row of walletAdjustments) {
    if (row.orderMarketplaceId && row.orderMarketplaceId !== "-") returnedOrders.add(row.orderMarketplaceId);
  }
  const rate = rows.length ? (returnedOrders.size / new Set(rows.map((row) => row.orderMarketplaceId)).size) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Devolucoes e reembolsos" description="Pedidos impactados, valores devolvidos, produtos envolvidos e taxa de devolucao." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Valor reembolsado</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(refunds)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Pedidos devolvidos</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{returnedOrders.size}</CardContent></Card>
        <Card><CardHeader><CardTitle>Taxa de devolucao</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{percent(rate)}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Itens com reembolso</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Data pedido</TableHead><TableHead>Data pagamento</TableHead><TableHead>Pedido</TableHead><TableHead>SKU</TableHead><TableHead>Produto</TableHead><TableHead>Reembolso</TableHead><TableHead>Reembolsado ao comprador</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.filter((row) => Number(row.refundAmount ?? 0) || Number(row.buyerRefundedAmount ?? 0)).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.orderCreatedAt?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{row.paymentCompletedAt?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{row.orderMarketplaceId}</TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell className="max-w-[420px] truncate">{row.productName}</TableCell>
                  <TableCell>{currency(row.refundAmount?.toString())}</TableCell>
                  <TableCell>{currency(row.buyerRefundedAmount?.toString())}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Ajustes de devolucao na carteira</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Pedido</TableHead><TableHead>Descricao</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {walletAdjustments.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.transactionDate.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{row.orderMarketplaceId}</TableCell>
                  <TableCell className="max-w-[560px] truncate">{row.description}</TableCell>
                  <TableCell>{currency(Math.abs(Number(row.amount)))}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
