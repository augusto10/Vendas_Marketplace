import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AceleraPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const rows = await prisma.acceleraTransaction.findMany({
    where: { rescueDate: { gte: period.start, lte: period.end } },
    orderBy: { rescueDate: "desc" },
    take: 500
  });
  const received = rows.reduce((sum, row) => sum + Number(row.receivedAmount ?? 0), 0);
  const fees = rows.reduce((sum, row) => sum + Number(row.serviceFee ?? 0), 0);
  const refunded = rows.reduce((sum, row) => sum + Number(row.refundedAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Shopee Acelera" description="Antecipacoes, taxas de servico, valores recebidos, reembolsos e vencimentos." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Recebido</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(received)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Taxa Acelera</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(fees)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Reembolsado</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(refunded)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Operacoes</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{rows.length}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Transacoes Acelera</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Pedido</TableHead><TableHead>Resgate</TableHead><TableHead>Taxa</TableHead><TableHead>Recebido</TableHead><TableHead>Status</TableHead><TableHead>Vencimento</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.rescueDate?.toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{row.orderMarketplaceId}</TableCell>
                  <TableCell>{currency(row.rescuedAmount?.toString())}</TableCell>
                  <TableCell>{currency(row.serviceFee?.toString())}</TableCell>
                  <TableCell>{currency(row.receivedAmount?.toString())}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{row.dueDate?.toLocaleDateString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
