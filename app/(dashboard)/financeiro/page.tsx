import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, MetricCard, MetricCardContent, MetricCardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { getFinancialReport } from "@/lib/services/report-service";
import { cn, currency, signedCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const data = await getFinancialReport(period);
  const walletIn = data.wallet.filter((row) => row.direction === "IN").reduce((sum, row) => sum + Number(row.amount), 0);
  const walletOut = data.wallet.filter((row) => row.direction === "OUT").reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
  const walletNet = walletIn - walletOut;
  const walletBalance = walletIn - walletOut;
  const walletSummary = summarizeWallet(data.wallet).slice(0, 12);

  return (
    <div className="space-y-6">
      <PageHeader title="Resumo financeiro" description="Carteira Shopee, Acelera, entradas, saidas, ajustes, saques e saldo operacional.">
        <Button asChild variant="outline"><a href={`/api/v1/reports?type=financial&format=xlsx&start=${period.query.start}&end=${period.query.end}`}><Download className="h-4 w-4" />Excel</a></Button>
      </PageHeader>
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard className="border-emerald-700/45 bg-card"><MetricCardHeader><CardTitle className="text-emerald-600">Entradas carteira</CardTitle></MetricCardHeader><MetricCardContent className="text-emerald-600">{currency(walletIn)}</MetricCardContent></MetricCard>
        <MetricCard className="border-red-700/45 bg-card"><MetricCardHeader><CardTitle className="text-red-600">Saidas carteira</CardTitle></MetricCardHeader><MetricCardContent className="text-red-600">{currency(walletOut)}</MetricCardContent></MetricCard>
        <MetricCard className={cn("bg-card", walletNet >= 0 ? "border-emerald-700/45" : "border-red-700/45")}><MetricCardHeader><CardTitle>Saldo do periodo</CardTitle></MetricCardHeader><MetricCardContent className={financeMoneyToneClass(walletNet)}>{signedCurrency(walletNet)}</MetricCardContent></MetricCard>
      </div>
      <Card>
        <CardHeader><CardTitle>Entradas e saidas por tipo</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Direcao</TableHead><TableHead>Transacoes</TableHead><TableHead>Entradas</TableHead><TableHead>Saidas</TableHead><TableHead>Saldo</TableHead></TableRow></TableHeader>
            <TableBody>
              {walletSummary.map((row) => (
                <TableRow key={`${row.type}-${row.direction}`}>
                  <TableCell className="font-medium">{row.type}</TableCell>
                  <TableCell>{row.direction}</TableCell>
                  <TableCell>{row.count.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="font-semibold text-emerald-600">{currency(row.entries)}</TableCell>
                  <TableCell className="font-semibold text-red-600">{currency(row.exits)}</TableCell>
                  <TableCell className={cn("font-semibold", financeMoneyToneClass(row.balance))}>{signedCurrency(row.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="sticky bottom-0 bg-muted font-semibold">Total carteira</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold text-emerald-600">{currency(walletIn)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold text-red-600">{currency(walletOut)}</TableCell>
                <TableCell className={cn("sticky bottom-0 bg-muted font-semibold", financeMoneyToneClass(walletNet))}>{signedCurrency(walletNet)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Carteira Shopee</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Pedido</TableHead><TableHead>Direcao</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.wallet.slice(0, 120).map((row) => {
                const tone = row.direction === "IN" ? "in" : row.direction === "OUT" ? "out" : "neutral";
                return (
                  <TableRow key={row.id} className={cn(tone === "in" && "bg-emerald-950/15 hover:bg-emerald-950/25", tone === "out" && "bg-red-950/15 hover:bg-red-950/25")}>
                    <TableCell>{row.transactionDate.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{row.transactionType}</TableCell>
                    <TableCell>{row.orderMarketplaceId}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex rounded-md px-2 py-1 text-xs font-semibold",
                        tone === "in" && "bg-emerald-500/10 text-emerald-600",
                        tone === "out" && "bg-red-500/10 text-red-600",
                        tone === "neutral" && "bg-muted text-muted-foreground"
                      )}>
                        {row.direction}
                      </span>
                    </TableCell>
                    <TableCell className={cn("font-semibold", financeMoneyToneClass(row.amount.toString()))}>{signedCurrency(row.amount.toString())}</TableCell>
                    <TableCell>{row.status}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="sticky bottom-0 bg-muted font-semibold">Saldo entradas - saidas</TableCell>
                <TableCell className={cn("sticky bottom-0 bg-muted font-semibold", financeMoneyToneClass(walletBalance))}>{signedCurrency(walletBalance)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted" />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function financeMoneyToneClass(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (amount > 0) return "text-emerald-600";
  if (amount < 0) return "text-red-600";
  return "text-muted-foreground";
}

type WalletRow = Awaited<ReturnType<typeof getFinancialReport>>["wallet"][number];

function summarizeWallet(rows: WalletRow[]) {
  const grouped = new Map<string, { type: string; direction: string; count: number; entries: number; exits: number; balance: number }>();
  for (const row of rows) {
    const key = `${row.transactionType}-${row.direction}`;
    const current = grouped.get(key) ?? {
      type: row.transactionType,
      direction: row.direction,
      count: 0,
      entries: 0,
      exits: 0,
      balance: 0
    };
    const amount = Number(row.amount ?? 0);
    current.count += 1;
    if (row.direction === "IN") current.entries += amount;
    if (row.direction === "OUT") current.exits += Math.abs(amount);
    current.balance += amount;
    grouped.set(key, current);
  }

  return [...grouped.values()].sort((left, right) => Math.abs(right.balance) - Math.abs(left.balance));
}
