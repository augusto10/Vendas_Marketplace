import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CarteiraPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const rows = await prisma.walletTransaction.findMany({
    where: { transactionDate: { gte: period.start, lte: period.end } },
    orderBy: { transactionDate: "desc" },
    take: 500
  });
  const entries = rows.filter((row) => row.direction === "IN").reduce((sum, row) => sum + Number(row.amount), 0);
  const exits = rows.filter((row) => row.direction === "OUT").reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
  const ads = rows.filter((row) => `${row.transactionType} ${row.description}`.toUpperCase().includes("ADS")).reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
  const adjustments = rows.filter((row) => row.transactionType.toUpperCase().includes("AJUSTE")).reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Carteira Shopee" description="Entradas, saidas, ADS, ajustes, saques e saldo por transacao." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Entradas</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(entries)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Saidas</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(exits)}</CardContent></Card>
        <Card><CardHeader><CardTitle>ADS</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(ads)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Ajustes</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(adjustments)}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Movimentacoes</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Descricao</TableHead><TableHead>Pedido</TableHead><TableHead>Direcao</TableHead><TableHead>Valor</TableHead><TableHead>Saldo</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.transactionDate.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{row.transactionType}</TableCell>
                  <TableCell className="max-w-[360px] truncate">{row.description}</TableCell>
                  <TableCell>{row.orderMarketplaceId}</TableCell>
                  <TableCell>{row.direction}</TableCell>
                  <TableCell>{currency(row.amount.toString())}</TableCell>
                  <TableCell>{currency(row.balanceAfter?.toString())}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
