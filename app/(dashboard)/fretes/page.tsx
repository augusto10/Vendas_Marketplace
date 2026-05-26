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
  const [invoices, incomes] = await Promise.all([
    prisma.salesInvoice.findMany({ where: { emissionDate: { gte: period.start, lte: period.end } }, orderBy: { emissionDate: "desc" }, take: 500 }),
    prisma.shopeeIncome.findMany({ where: { orderCreatedAt: { gte: period.start, lte: period.end }, sku: { not: "-" } }, orderBy: { orderCreatedAt: "desc" }, take: 500 })
  ]);
  const fiscalFreight = invoices.reduce((sum, row) => sum + Number(row.freightAmount), 0);
  const logisticsFreight = incomes.reduce((sum, row) => sum + Number(row.logisticsFreight ?? 0), 0);
  const reverse = incomes.reduce((sum, row) => sum + Number(row.reverseShippingFee ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Fretes" description="Frete fiscal, frete logistico Shopee, envio reverso e transportadoras." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Frete fiscal</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(fiscalFreight)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Frete logistico</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(logisticsFreight)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Envio reverso</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(reverse)}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Fretes por pedido</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Data pedido</TableHead><TableHead>Data pagamento</TableHead><TableHead>Pedido</TableHead><TableHead>SKU</TableHead><TableHead>Transportadora</TableHead><TableHead>Frete logistico</TableHead><TableHead>Envio reverso</TableHead></TableRow></TableHeader>
            <TableBody>
              {incomes.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.orderCreatedAt?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{row.paymentCompletedAt?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{row.orderMarketplaceId}</TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.carrier}</TableCell>
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
