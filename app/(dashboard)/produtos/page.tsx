import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { TopProductsSalesChart } from "@/components/charts/top-products-sales-chart";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { getProductsReport } from "@/lib/services/report-service";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const products = await getProductsReport(period);
  const topSalesProducts = [...products].sort((left, right) => right.rows - left.rows).slice(0, 5);
  const totals = products.reduce(
    (sum, row) => ({
      rows: sum.rows + row.rows,
      revenue: sum.revenue + row.revenue,
      commission: sum.commission + row.commission,
      refunds: sum.refunds + row.refunds
    }),
    { rows: 0, revenue: 0, commission: 0, refunds: 0 }
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Produtos vendidos" description="Ranking por SKU, faturamento, comissao, devolucoes e recorrencia nas importacoes Income." />
      <PeriodFilter period={period} />
      <Card>
        <CardHeader>
          <CardTitle>Top 5 produtos mais vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          {topSalesProducts.length ? (
            <TopProductsSalesChart data={topSalesProducts} />
          ) : (
            <EmptyState title="Sem produtos no periodo" description="Importe dados Income ou ajuste o periodo para visualizar os campeoes de vendas." />
          )}
        </CardContent>
      </Card>
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
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="sticky bottom-0 bg-muted font-semibold">Total</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold">{totals.rows.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold">{currency(totals.revenue)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold">{currency(totals.commission)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold">{currency(totals.refunds)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
