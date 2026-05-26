import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReprocessButton } from "@/features/uploads/reprocess-button";

export const dynamic = "force-dynamic";

export default async function HistoricoPage() {
  const uploads = await prisma.upload.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Historico de importacoes</h1>
        <p className="text-sm text-muted-foreground">Auditoria operacional dos arquivos processados.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ultimos uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data upload</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lidas</TableHead>
                <TableHead>Importadas</TableHead>
                <TableHead>Atualizadas</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell>{upload.createdAt.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{upload.originalName}</TableCell>
                  <TableCell>{upload.type}</TableCell>
                  <TableCell>
                    <Badge>{upload.status}</Badge>
                  </TableCell>
                  <TableCell>{upload.rowsRead}</TableCell>
                  <TableCell>{upload.rowsImported}</TableCell>
                  <TableCell>{upload.rowsUpdated}</TableCell>
                  <TableCell><ReprocessButton uploadId={upload.id} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
