import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parsePeriod } from "@/lib/period";

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const reports = [
    ["sales", "Vendas fiscais", "Notas, ICMS, DIFAL, frete e unidades."],
    ["financial", "Financeiro", "Carteira Shopee, Acelera e renda liberada."],
    ["products", "Produtos", "Ranking por SKU e produto."],
    ["fees", "Taxas", "Comissoes, servico, transacao e taxas detectadas."],
    ["wallet", "Carteira Shopee", "Entradas, saidas, ADS, ajustes e saldo."],
    ["accelera", "Acelera", "Antecipacoes, taxa de servico e status."],
    ["commissions", "Comissoes", "Comissao, servico, transacao e afiliados."],
    ["freight", "Fretes", "Frete logistico, envio reverso e transportadora."],
    ["returns", "Devolucoes", "Reembolsos e pedidos devolvidos."],
    ["uploads", "Historico de uploads", "Arquivos processados, erros e linhas importadas."]
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Relatorios" description="Central de exportacoes CSV. Excel e PDF permanecem preparados na arquitetura para a proxima fase." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map(([type, title, description]) => (
          <Card key={type}>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{description}</p>
              <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="w-full">
                <a href={`/api/v1/reports?type=${type}&start=${period.query.start}&end=${period.query.end}`}>
                  <Download className="h-4 w-4" />
                  CSV
                </a>
              </Button>
              <Button asChild className="w-full">
                <a href={`/api/v1/reports?type=${type}&format=xlsx&start=${period.query.start}&end=${period.query.end}`}>
                  <Download className="h-4 w-4" />
                  Excel
                </a>
              </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
