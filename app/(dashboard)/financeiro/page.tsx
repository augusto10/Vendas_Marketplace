import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { getFinancialReport } from "@/lib/services/report-service";
import { cn, currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const data = await getFinancialReport(period);
  const walletIn = data.wallet.filter((row) => row.direction === "IN").reduce((sum, row) => sum + Number(row.amount), 0);
  const walletOut = data.wallet.filter((row) => row.direction === "OUT").reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
  const acceleraReceived = data.accelera.reduce((sum, row) => sum + Number(row.receivedAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Resumo financeiro" description="Carteira Shopee, Acelera, entradas, saidas, ajustes, saques e saldo operacional.">
        <Button asChild variant="outline"><a href={`/api/v1/reports?type=financial&format=xlsx&start=${period.query.start}&end=${period.query.end}`}><Download className="h-4 w-4" />Excel</a></Button>
      </PageHeader>
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-500/25 bg-emerald-950/20"><CardHeader><CardTitle className="text-emerald-300">Entradas carteira</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-200">{currency(walletIn)}</CardContent></Card>
        <Card className="border-red-500/25 bg-red-950/20"><CardHeader><CardTitle className="text-red-300">Saidas carteira</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-red-200">{currency(walletOut)}</CardContent></Card>
        <Card className="border-emerald-500/25 bg-emerald-950/20"><CardHeader><CardTitle className="text-emerald-300">Acelera recebido</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-200">{currency(acceleraReceived)}</CardContent></Card>
      </div>
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
                        tone === "in" && "bg-emerald-500/15 text-emerald-300",
                        tone === "out" && "bg-red-500/15 text-red-300",
                        tone === "neutral" && "bg-muted text-muted-foreground"
                      )}>
                        {row.direction}
                      </span>
                    </TableCell>
                    <TableCell className={cn("font-semibold", tone === "in" && "text-emerald-300", tone === "out" && "text-red-300")}>{currency(row.amount.toString())}</TableCell>
                    <TableCell>{row.status}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
