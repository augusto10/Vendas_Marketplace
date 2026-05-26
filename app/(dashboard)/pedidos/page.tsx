import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const orders = await prisma.order.findMany({
    where: { OR: [{ createdAtOrder: { gte: period.start, lte: period.end } }, { paidAt: { gte: period.start, lte: period.end } }] },
    orderBy: { createdAtOrder: "desc" },
    take: 200,
    include: { items: true, invoices: true, incomes: true }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos" description="Consulta operacional de pedidos, conciliacao fiscal/financeira e sinais de pendencia." />
      <PeriodFilter period={period} />
      <Card>
        <CardHeader><CardTitle>Pedidos importados</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Criacao</TableHead><TableHead>Pagamento</TableHead><TableHead>Transportadora</TableHead><TableHead>Valor bruto</TableHead><TableHead>Income</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.marketplaceId}</TableCell>
                  <TableCell>{order.createdAtOrder?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{order.paidAt?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{order.carrier ?? "-"}</TableCell>
                  <TableCell>{currency(order.grossAmount?.toString())}</TableCell>
                  <TableCell>{order.incomes.length}</TableCell>
                  <TableCell>{order.invoices.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
