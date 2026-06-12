import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { parsePeriod } from "@/lib/period";

export const dynamic = "force-dynamic";

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);

  return (
    <div className="space-y-6">
      <PageHeader title="Produtos vendidos" description="Ranking por SKU, faturamento, comissao, devolucoes e recorrencia nas importacoes Income." />
      <PeriodFilter period={period} />
    </div>
  );
}
