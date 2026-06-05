import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadForm } from "@/features/uploads/upload-form";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UploadsPage() {
  const uploadsRaw = await prisma.upload.findMany({
    orderBy: [{ processedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: { uploadedBy: { select: { name: true } } }
  });
  const uploads = uploadsRaw.sort((left, right) => uploadImportedAt(right).getTime() - uploadImportedAt(left).getTime());
  const completed = uploads.filter((upload) => upload.status === "COMPLETED").length;
  const processing = uploads.filter((upload) => upload.status === "PROCESSING").length;
  const failed = uploads.filter((upload) => upload.status === "FAILED").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Importacao de planilhas" description="Envie arquivos Shopee, acompanhe o processamento e revise o historico recente." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="metric-card">
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Total recente</div>
            <div className="mt-2 text-2xl font-semibold">{uploads.length}</div>
          </CardContent>
        </Card>
        <Card className="metric-card">
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Concluidos</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-600">{completed}</div>
          </CardContent>
        </Card>
        <Card className="metric-card">
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Processando</div>
            <div className="mt-2 text-2xl font-semibold text-amber-600">{processing}</div>
          </CardContent>
        </Card>
        <Card className="metric-card">
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Falhas</div>
            <div className="mt-2 text-2xl font-semibold text-red-600">{failed}</div>
          </CardContent>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Nova importacao</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadForm />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Historico de uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {uploads.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data importacao</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell>{(upload.processedAt ?? upload.createdAt).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="max-w-[360px] truncate font-medium">{upload.originalName}</TableCell>
                    <TableCell>{upload.type}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          upload.status === "COMPLETED" && "border-emerald-500/25 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20",
                          upload.status === "FAILED" && "border-red-500/25 bg-red-500/15 text-red-300 hover:bg-red-500/20",
                          upload.status === "PROCESSING" && "border-amber-500/25 bg-amber-500/15 text-amber-300 hover:bg-amber-500/20",
                          upload.status === "PENDING" && "bg-muted text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {upload.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{upload.uploadedBy?.name ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="Nenhum upload registrado" description="Depois da primeira importacao, os arquivos processados aparecem neste historico." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function uploadImportedAt(upload: { processedAt: Date | null; createdAt: Date }) {
  return upload.processedAt ?? upload.createdAt;
}
