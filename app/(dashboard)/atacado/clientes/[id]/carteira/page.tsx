import Link from "next/link";
import { ArrowLeft, Download, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, MetricCard, MetricCardContent, MetricCardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { currency, signedCurrency, cn } from "@/lib/utils";
import { getExtratoCarteiraCliente } from "@/lib/atacado/service";

export const dynamic = "force-dynamic";

export default async function AtacadoClienteCarteiraPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { id } = await params;
  const period = parsePeriod(await searchParams);
  const extrato = await getExtratoCarteiraCliente(id, { dataInicio: period.start, dataFim: period.end });
  const saldo = extrato.saldoAtual;
  const zero = saldo.sub(saldo);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Carteira do cliente"
        title={extrato.cliente.nome}
        description="Extrato detalhado com saldo anterior, posterior e movimentos vinculados a pedidos quando existirem."
      >
        <Button asChild variant="outline">
          <Link href="/atacado/carteira">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/api/atacado/clientes/${id}/extrato?dataInicio=${period.query.start}&dataFim=${period.query.end}`}>
            <Download className="h-4 w-4" />
            Exportar extrato
          </Link>
        </Button>
      </PageHeader>

      <PeriodFilter period={period} />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard>
          <MetricCardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Saldo atual</CardTitle></MetricCardHeader>
          <MetricCardContent className={cn(saldo.isNegative() ? "text-red-600" : "text-emerald-600")}>{signedCurrency(saldo.toString())}</MetricCardContent>
        </MetricCard>
        <MetricCard>
          <MetricCardHeader><CardTitle>Saldo devedor</CardTitle></MetricCardHeader>
          <MetricCardContent className="text-red-600">{currency(saldo.isNegative() ? saldo.abs().toString() : zero.toString())}</MetricCardContent>
        </MetricCard>
        <MetricCard>
          <MetricCardHeader><CardTitle>Credito disponivel</CardTitle></MetricCardHeader>
          <MetricCardContent className="text-emerald-600">{currency(saldo.isPositive() ? saldo.toString() : zero.toString())}</MetricCardContent>
        </MetricCard>
        <MetricCard>
          <MetricCardHeader><CardTitle>Movimentos</CardTitle></MetricCardHeader>
          <MetricCardContent>{extrato.movimentos.length.toLocaleString("pt-BR")}</MetricCardContent>
        </MetricCard>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Extrato</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Saldo anterior</TableHead>
                <TableHead>Saldo posterior</TableHead>
                <TableHead>Observacao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extrato.movimentos.map((movimento) => (
                <TableRow key={movimento.id}>
                  <TableCell>{movimento.dataMovimento.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{movimento.tipo}</TableCell>
                  <TableCell>{movimento.pedido ? `${movimento.pedido.numero}` : "-"}</TableCell>
                  <TableCell className={cn("font-semibold", movimento.natureza === "DEBITO" ? "text-red-600" : "text-emerald-600")}>
                    {movimento.natureza === "DEBITO" ? `- ${currency(movimento.valor.toString())}` : `+ ${currency(movimento.valor.toString())}`}
                  </TableCell>
                  <TableCell>{signedCurrency(movimento.saldoAnterior.toString())}</TableCell>
                  <TableCell>{signedCurrency(movimento.saldoPosterior.toString())}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{movimento.observacao ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Pedido e pagamento vinculados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cliente</div>
            <div className="font-semibold">{extrato.cliente.nome}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Documento</div>
            <div className="font-semibold">{extrato.cliente.documento ?? "-"}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
