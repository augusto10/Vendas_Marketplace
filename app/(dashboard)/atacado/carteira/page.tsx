import Link from "next/link";
import { ArrowRight, Download, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, MetricCard, MetricCardContent, MetricCardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { parsePeriod } from "@/lib/period";
import { currency, signedCurrency, cn } from "@/lib/utils";
import { getRelatorioCarteira } from "@/lib/atacado/service";

export const dynamic = "force-dynamic";

export default async function AtacadoCarteiraPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const relatorio = await getRelatorioCarteira({ start: period.start, end: period.end });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Carteira do atacado"
        title="Carteira dos clientes"
        description="Visao consolidada dos saldos, creditos, debitos e movimentos por periodo."
      >
        <Button asChild variant="outline">
          <Link href={`/api/atacado/relatorios/carteira?dataInicio=${period.query.start}&dataFim=${period.query.end}`}>
            <Download className="h-4 w-4" />
            Relatorio
          </Link>
        </Button>
      </PageHeader>

      <PeriodFilter period={period} />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard>
          <MetricCardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Clientes</CardTitle>
          </MetricCardHeader>
          <MetricCardContent>{relatorio.clientes.length.toLocaleString("pt-BR")}</MetricCardContent>
        </MetricCard>
        <MetricCard>
          <MetricCardHeader><CardTitle>Total pago</CardTitle></MetricCardHeader>
          <MetricCardContent className="text-emerald-600">{currency(relatorio.totaisPeriodo.totalPago.toString())}</MetricCardContent>
        </MetricCard>
        <MetricCard>
          <MetricCardHeader><CardTitle>Total em sobra</CardTitle></MetricCardHeader>
          <MetricCardContent className="text-emerald-600">{currency(relatorio.totaisPeriodo.totalSobra.toString())}</MetricCardContent>
        </MetricCard>
        <MetricCard>
          <MetricCardHeader><CardTitle>Total devedor</CardTitle></MetricCardHeader>
          <MetricCardContent className="text-red-600">{currency(relatorio.totaisPeriodo.totalSaldoDevedor.toString())}</MetricCardContent>
        </MetricCard>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Resumo por cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Saldo atual</TableHead>
                <TableHead>Devedor</TableHead>
                <TableHead>Credito</TableHead>
                <TableHead>Pago no periodo</TableHead>
                <TableHead>Sobra</TableHead>
                <TableHead>Ajustes</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatorio.clientes.map((row) => {
                const saldo = row.saldoAtual;
                const tone = saldo.isNegative() ? "text-red-600" : "text-emerald-600";
                return (
                  <TableRow key={row.cliente.id}>
                    <TableCell className="font-semibold">
                      <div>{row.cliente.nome}</div>
                      <div className="text-xs text-muted-foreground">{row.cliente.documento ?? "-"}</div>
                    </TableCell>
                    <TableCell className={cn("font-semibold", tone)}>{signedCurrency(saldo.toString())}</TableCell>
                    <TableCell className="font-semibold text-red-600">{currency(row.saldoDevedor.toString())}</TableCell>
                    <TableCell className="font-semibold text-emerald-600">{currency(row.creditoDisponivel.toString())}</TableCell>
                    <TableCell>{currency(row.totalPagoPeriodo.toString())}</TableCell>
                    <TableCell>{currency(row.totalSobraPeriodo.toString())}</TableCell>
                    <TableCell>{currency(row.totalAjustesPeriodo.toString())}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/atacado/clientes/${row.cliente.id}/carteira?start=${period.query.start}&end=${period.query.end}`}>
                          Abrir
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Maior saldo devedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {relatorio.rankingSaldoDevedor.slice(0, 8).map((row, index) => (
              <div key={row.cliente.id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <div className="font-semibold">{index + 1}. {row.cliente.nome}</div>
                  <div className="text-xs text-muted-foreground">{row.cliente.documento ?? "-"}</div>
                </div>
                <div className="font-semibold text-red-600">{currency(row.saldoDevedor.toString())}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Maior credito disponivel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {relatorio.rankingCreditoDisponivel.slice(0, 8).map((row, index) => (
              <div key={row.cliente.id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <div className="font-semibold">{index + 1}. {row.cliente.nome}</div>
                  <div className="text-xs text-muted-foreground">{row.cliente.documento ?? "-"}</div>
                </div>
                <div className="font-semibold text-emerald-600">{currency(row.creditoDisponivel.toString())}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
