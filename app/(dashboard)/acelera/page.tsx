import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle, MetricCard, MetricCardContent, MetricCardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { cn, currency, moneyToneClass, signedCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AceleraPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const rows = await prisma.acceleraTransaction.findMany({
    where: { rescueDate: { gte: period.start, lte: period.end } },
    orderBy: { rescueDate: "desc" },
    take: 500
  });
  const receivedFromSheet = rows.reduce((sum, row) => sum + Number(row.receivedAmount ?? 0), 0);
  const fees = rows.reduce((sum, row) => sum + Number(row.serviceFee ?? 0), 0);
  const refunded = rows.reduce((sum, row) => sum + Number(row.refundedAmount ?? 0), 0);
  const rescued = rows.reduce((sum, row) => sum + Number(row.rescuedAmount ?? 0), 0);
  const calculatedNet = rescued - fees;

  return (
    <div className="space-y-6">
      <PageHeader title="Shopee Acelera" description="Antecipacoes, taxas de servico, valores recebidos, reembolsos e vencimentos." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard><MetricCardHeader><CardTitle className="text-sm md:text-base">Resgatado rapido</CardTitle></MetricCardHeader><MetricCardContent>{currency(rescued)}</MetricCardContent></MetricCard>
        <MetricCard><MetricCardHeader><CardTitle className="text-sm md:text-base">Taxa Acelera</CardTitle></MetricCardHeader><MetricCardContent className="text-red-300">{signedCurrency(-fees)}</MetricCardContent></MetricCard>
        <MetricCard><MetricCardHeader><CardTitle className="text-sm md:text-base">Liquido calculado</CardTitle></MetricCardHeader><MetricCardContent className="text-emerald-300">{signedCurrency(calculatedNet)}</MetricCardContent></MetricCard>
        <MetricCard><MetricCardHeader><CardTitle className="text-sm md:text-base">Recebido na planilha</CardTitle></MetricCardHeader><MetricCardContent className="text-emerald-300">{signedCurrency(receivedFromSheet)}</MetricCardContent></MetricCard>
        <MetricCard><MetricCardHeader><CardTitle className="text-sm md:text-base">Reembolsado/devolvido</CardTitle></MetricCardHeader><MetricCardContent className="text-red-300">{signedCurrency(-refunded)}</MetricCardContent></MetricCard>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Transacoes Acelera</CardTitle>
          <p className="text-sm text-muted-foreground">Liquido calculado = resgatado rapido menos taxa. Recebido na planilha vem da coluna original da Shopee e pode nao fechar com esse calculo.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Pedido</TableHead><TableHead>Resgate</TableHead><TableHead>Taxa</TableHead><TableHead>Liquido calculado</TableHead><TableHead>Recebido planilha</TableHead><TableHead>Status</TableHead><TableHead>Vencimento</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row) => {
                const rowRescued = Number(row.rescuedAmount ?? 0);
                const rowFee = Number(row.serviceFee ?? 0);
                const rowReceived = Number(row.receivedAmount ?? 0);
                const rowNet = rowRescued - rowFee;
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.rescueDate?.toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{row.orderMarketplaceId}</TableCell>
                    <SignedMoneyCell value={rowRescued} />
                    <SignedMoneyCell value={-rowFee} />
                    <SignedMoneyCell value={rowNet} />
                    <SignedMoneyCell value={rowReceived} />
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.dueDate?.toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="sticky bottom-0 bg-muted font-semibold">Total</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold">{currency(rescued)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold text-red-300">{signedCurrency(-fees)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold text-emerald-300">{signedCurrency(calculatedNet)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold text-emerald-300">{signedCurrency(receivedFromSheet)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted" />
                <TableCell className="sticky bottom-0 bg-muted" />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SignedMoneyCell({ value }: { value: number | string | null | undefined }) {
  return <TableCell className={cn("font-medium", moneyToneClass(value))}>{signedCurrency(value)}</TableCell>;
}
