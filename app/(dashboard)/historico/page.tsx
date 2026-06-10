import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HistoricoPage() {
  const uploadsRaw = await prisma.upload.findMany({
    orderBy: [{ processedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: { uploadedBy: { select: { name: true } } }
  });
  const uploads = latestAttemptByFile(uploadsRaw.sort((left, right) => uploadImportedAt(right).getTime() - uploadImportedAt(left).getTime()));

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
                  <TableCell>{upload.originalName}</TableCell>
                  <TableCell>{upload.type}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        upload.status === "COMPLETED" && "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20",
                        upload.status === "FAILED" && "bg-red-500/15 text-red-300 hover:bg-red-500/20",
                        upload.status === "PROCESSING" && "bg-amber-500/15 text-amber-300 hover:bg-amber-500/20",
                        upload.status === "PENDING" && "bg-muted text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {upload.status === "COMPLETED" ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : null}
                      {upload.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{upload.uploadedBy?.name ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function uploadImportedAt(upload: { processedAt: Date | null; createdAt: Date }) {
  return upload.processedAt ?? upload.createdAt;
}

function latestAttemptByFile<T extends { originalName: string; type: string; processedAt: Date | null; createdAt: Date }>(uploads: T[]) {
  const latest = new Map<string, T>();
  for (const upload of uploads) {
    const key = `${upload.type}:${upload.originalName.trim().toLowerCase()}`;
    if (!latest.has(key)) latest.set(key, upload);
  }
  return Array.from(latest.values());
}
