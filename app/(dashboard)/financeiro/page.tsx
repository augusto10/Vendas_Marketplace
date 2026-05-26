import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { getFinancialReport } from "@/lib/services/report-service";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const data = await getFinancialReport(period);
  const walletIn = data.wallet.filter((row) => row.direction === "IN").reduce((sum, row) => sum + Number(row.amount), 0);
  const walletOut = data.wallet.filter((row) => row.direction === "OUT").reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
  const acceleraReceived = data.accelera.reduce((sum, row) => sum + Number(row.receivedAmount ?? 0), 0);
  const released = data.income.reduce((sum, row) => sum + Number(row.releasedAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" description="Carteira Shopee, Acelera, entradas, saidas, ajustes, saques e saldo operacional.">
        <Button asChild variant="outline"><a href={`/api/v1/reports?type=financial&format=xlsx&start=${period.query.start}&end=${period.query.end}`}><Download className="h-4 w-4" />Excel</a></Button>
      </PageHeader>
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Entradas carteira</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(walletIn)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Saidas carteira</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(walletOut)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Acelera recebido</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(acceleraReceived)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Renda liberada</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{currency(released)}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Carteira Shopee</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Pedido</TableHead><TableHead>Direcao</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.wallet.slice(0, 120).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.transactionDate.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{row.transactionType}</TableCell>
                  <TableCell>{row.orderMarketplaceId}</TableCell>
                  <TableCell>{row.direction}</TableCell>
                  <TableCell>{currency(row.amount.toString())}</TableCell>
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
