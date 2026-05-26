import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { getProductsReport } from "@/lib/services/report-service";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const products = await getProductsReport(period);

  return (
    <div className="space-y-6">
      <PageHeader title="Produtos" description="Ranking por SKU, faturamento, comissao, devolucoes e recorrencia nas importacoes Income." />
      <PeriodFilter period={period} />
      <Card>
        <CardHeader><CardTitle>Top produtos por receita liberada</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Primeira venda</TableHead><TableHead>Ultima venda</TableHead><TableHead>SKU</TableHead><TableHead>Produto</TableHead><TableHead>Linhas</TableHead><TableHead>Receita</TableHead><TableHead>Comissao</TableHead><TableHead>Devolucoes</TableHead></TableRow></TableHeader>
            <TableBody>
              {products.map((row) => (
                <TableRow key={`${row.sku}-${row.productName}`}>
                  <TableCell>{row.firstDate?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{row.lastDate?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell className="max-w-[440px] truncate">{row.productName}</TableCell>
                  <TableCell>{row.rows}</TableCell>
                  <TableCell>{currency(row.revenue)}</TableCell>
                  <TableCell>{currency(row.commission)}</TableCell>
                  <TableCell>{currency(row.refunds)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
