import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle, MetricCard, MetricCardContent, MetricCardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { cn, currency, moneyToneClass, signedCurrency } from "@/lib/utils";

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
  const balance = entries - exits;

  return (
    <div className="space-y-6">
      <PageHeader title="Carteira Shopee" description="Entradas, saidas, anuncios, ajustes, saques e saldo por transacao." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard><MetricCardHeader><CardTitle>Entradas</CardTitle></MetricCardHeader><MetricCardContent>{currency(entries)}</MetricCardContent></MetricCard>
        <MetricCard><MetricCardHeader><CardTitle>Saidas</CardTitle></MetricCardHeader><MetricCardContent>{currency(exits)}</MetricCardContent></MetricCard>
        <MetricCard><MetricCardHeader><CardTitle>ADS</CardTitle></MetricCardHeader><MetricCardContent className="text-red-300">{signedCurrency(-ads)}</MetricCardContent></MetricCard>
        <MetricCard><MetricCardHeader><CardTitle>Ajustes</CardTitle></MetricCardHeader><MetricCardContent className={moneyToneClass(adjustments)}>{signedCurrency(adjustments)}</MetricCardContent></MetricCard>
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
                  <TableCell>
                    <span className={cn(
                      "inline-flex rounded-md px-2 py-1 text-xs font-semibold",
                      row.direction === "IN" && "bg-emerald-500/15 text-emerald-300",
                      row.direction === "OUT" && "bg-red-500/15 text-red-300",
                      row.direction === "NEUTRAL" && "bg-muted text-muted-foreground"
                    )}>
                      {row.direction}
                    </span>
                  </TableCell>
                  <TableCell className={cn("font-semibold", moneyToneClass(row.amount.toString()))}>{signedCurrency(row.amount.toString())}</TableCell>
                  <TableCell>{currency(row.balanceAfter?.toString())}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="sticky bottom-0 bg-muted font-semibold">Saldo entradas - saidas</TableCell>
                <TableCell className={cn("sticky bottom-0 bg-muted font-semibold", moneyToneClass(balance))}>{signedCurrency(balance)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted" />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
