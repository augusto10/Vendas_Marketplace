import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, MetricCard, MetricCardContent, MetricCardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { cn, currency, signedCurrency } from "@/lib/utils";

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
  const withdrawals = rows.filter((row) => row.transactionType.toUpperCase().includes("SAQUE")).reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
  const summary = summarizeWallet(rows);

  return (
    <div className="space-y-6">
      <PageHeader title="Carteira Shopee" description="Entradas, saidas, anuncios, ajustes, saques e saldo por transacao.">
        <Button asChild variant="outline">
          <a href={`/impressao?sections=wallet&start=${period.query.start}&end=${period.query.end}`}>
            <Download className="h-4 w-4" />
            Extrato
          </a>
        </Button>
      </PageHeader>
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard className="border-emerald-700/45 bg-card"><MetricCardHeader><CardTitle className="text-emerald-600">Entradas</CardTitle></MetricCardHeader><MetricCardContent className="text-emerald-600">{currency(entries)}</MetricCardContent></MetricCard>
        <MetricCard className="border-red-700/45 bg-card"><MetricCardHeader><CardTitle className="text-red-600">Saidas</CardTitle></MetricCardHeader><MetricCardContent className="text-red-600">{currency(exits)}</MetricCardContent></MetricCard>
        <MetricCard className={cn("bg-card", balance >= 0 ? "border-emerald-700/45" : "border-red-700/45")}><MetricCardHeader><CardTitle>Saldo do periodo</CardTitle></MetricCardHeader><MetricCardContent className={walletMoneyToneClass(balance)}>{signedCurrency(balance)}</MetricCardContent></MetricCard>
        <MetricCard className="border-red-700/45 bg-card"><MetricCardHeader><CardTitle className="text-red-600">ADS</CardTitle></MetricCardHeader><MetricCardContent className="text-red-600">{signedCurrency(-ads)}</MetricCardContent></MetricCard>
        <MetricCard className="border-red-700/45 bg-card"><MetricCardHeader><CardTitle className="text-red-600">Saques</CardTitle></MetricCardHeader><MetricCardContent className="text-red-600">{signedCurrency(-withdrawals)}</MetricCardContent></MetricCard>
      </div>
      <Card>
        <CardHeader><CardTitle>Detalhe de entradas e saidas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Direcao</TableHead><TableHead>Transacoes</TableHead><TableHead>Entradas</TableHead><TableHead>Saidas</TableHead><TableHead>Ajustes</TableHead><TableHead>Saldo</TableHead></TableRow></TableHeader>
            <TableBody>
              {summary.map((row) => (
                <TableRow key={`${row.type}-${row.direction}`}>
                  <TableCell className="font-medium">{row.type}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex rounded-md px-2 py-1 text-xs font-semibold",
                      row.direction === "IN" && "bg-emerald-500/10 text-emerald-600",
                      row.direction === "OUT" && "bg-red-500/10 text-red-600",
                      row.direction === "NEUTRAL" && "bg-muted text-muted-foreground"
                    )}>
                      {row.direction}
                    </span>
                  </TableCell>
                  <TableCell>{row.count.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="font-semibold text-emerald-600">{currency(row.entries)}</TableCell>
                  <TableCell className="font-semibold text-red-600">{currency(row.exits)}</TableCell>
                  <TableCell className={cn("font-semibold", walletMoneyToneClass(row.adjustments))}>{signedCurrency(row.adjustments)}</TableCell>
                  <TableCell className={cn("font-semibold", walletMoneyToneClass(row.balance))}>{signedCurrency(row.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="sticky bottom-0 bg-muted font-semibold">Total</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold text-emerald-600">{currency(entries)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold text-red-600">{currency(exits)}</TableCell>
                <TableCell className={cn("sticky bottom-0 bg-muted font-semibold", walletMoneyToneClass(adjustments))}>{signedCurrency(adjustments)}</TableCell>
                <TableCell className={cn("sticky bottom-0 bg-muted font-semibold", walletMoneyToneClass(balance))}>{signedCurrency(balance)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
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
                      row.direction === "IN" && "bg-emerald-500/10 text-emerald-600",
                      row.direction === "OUT" && "bg-red-500/10 text-red-600",
                      row.direction === "NEUTRAL" && "bg-muted text-muted-foreground"
                    )}>
                      {row.direction}
                    </span>
                  </TableCell>
                  <TableCell className={cn("font-semibold", walletMoneyToneClass(row.amount.toString()))}>{signedCurrency(row.amount.toString())}</TableCell>
                  <TableCell className={cn("font-semibold", walletMoneyToneClass(row.balanceAfter?.toString()))}>{currency(row.balanceAfter?.toString())}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="sticky bottom-0 bg-muted font-semibold">Saldo entradas - saidas</TableCell>
                <TableCell className={cn("sticky bottom-0 bg-muted font-semibold", walletMoneyToneClass(balance))}>{signedCurrency(balance)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted" />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function walletMoneyToneClass(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (amount > 0) return "text-emerald-600";
  if (amount < 0) return "text-red-600";
  return "text-muted-foreground";
}

type WalletRow = Awaited<ReturnType<typeof prisma.walletTransaction.findMany>>[number];

function summarizeWallet(rows: WalletRow[]) {
  const grouped = new Map<string, { type: string; direction: string; count: number; entries: number; exits: number; adjustments: number; balance: number }>();
  for (const row of rows) {
    const key = `${row.transactionType}-${row.direction}`;
    const current = grouped.get(key) ?? {
      type: row.transactionType,
      direction: row.direction,
      count: 0,
      entries: 0,
      exits: 0,
      adjustments: 0,
      balance: 0
    };
    const amount = Number(row.amount ?? 0);
    current.count += 1;
    if (row.direction === "IN") current.entries += amount;
    if (row.direction === "OUT") current.exits += Math.abs(amount);
    if (row.transactionType.toUpperCase().includes("AJUSTE")) current.adjustments += amount;
    current.balance += amount;
    grouped.set(key, current);
  }

  return [...grouped.values()].sort((left, right) => Math.abs(right.balance) - Math.abs(left.balance));
}
