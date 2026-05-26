import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ComissoesPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const rows = await prisma.shopeeIncome.findMany({
    where: { orderCreatedAt: { gte: period.start, lte: period.end }, sku: { not: "-" } },
    orderBy: { orderCreatedAt: "desc" },
    take: 500
  });
  const commission = rows.reduce((sum, row) => sum + Number(row.commissionFee ?? 0), 0);
  const service = rows.reduce((sum, row) => sum + Number(row.serviceFee ?? 0), 0);
  const transaction = rows.reduce((sum, row) => sum + Number(row.transactionFee ?? 0), 0);
  const affiliate = rows.reduce((sum, row) => sum + Number(row.affiliateCommissionFee ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Comissoes" description="Comissao Shopee, taxa de servico, taxa de transacao e afiliados por pedido/SKU." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Comissao</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(commission)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Servico</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(service)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Transacao</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(transaction)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Afiliados</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(affiliate)}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Detalhe por pedido</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Data pedido</TableHead><TableHead>Data pagamento</TableHead><TableHead>Pedido</TableHead><TableHead>SKU</TableHead><TableHead>Produto</TableHead><TableHead>Comissao</TableHead><TableHead>Servico</TableHead><TableHead>Transacao</TableHead><TableHead>Afiliados</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.orderCreatedAt?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{row.paymentCompletedAt?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{row.orderMarketplaceId}</TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell className="max-w-[360px] truncate">{row.productName}</TableCell>
                  <TableCell>{currency(row.commissionFee?.toString())}</TableCell>
                  <TableCell>{currency(row.serviceFee?.toString())}</TableCell>
                  <TableCell>{currency(row.transactionFee?.toString())}</TableCell>
                  <TableCell>{currency(row.affiliateCommissionFee?.toString())}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
