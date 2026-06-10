import { existsSync } from "fs";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CancelUploadButton } from "@/features/uploads/cancel-upload-button";
import { UploadForm } from "@/features/uploads/upload-form";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SLOW_PROCESSING_MINUTES = 10;

export default async function UploadsPage() {
  const now = new Date();
  const uploadsRaw = await prisma.upload.findMany({
    orderBy: [{ processedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      uploadedBy: { select: { name: true } },
      importErrors: { take: 1, orderBy: { createdAt: "desc" } }
    }
  });
  const uploads = latestAttemptByFile(uploadsRaw.sort((left, right) => uploadImportedAt(right).getTime() - uploadImportedAt(left).getTime()));
  const completed = uploads.filter((upload) => upload.status === "COMPLETED").length;
  const processing = uploads.filter((upload) => upload.status === "PROCESSING").length;
  const failed = uploads.filter((upload) => upload.status === "FAILED").length;
  const slowProcessing = uploads.filter((upload) => isSlowProcessing(upload, now));

  return (
    <div className="space-y-6">
      <PageHeader title="Importacao de planilhas" description="Envie arquivos Shopee, acompanhe o processamento e revise o historico recente." />
      {slowProcessing.length ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div className="space-y-1">
            <div className="font-semibold">Existe uma importacao demorando mais que o esperado.</div>
            <div className="text-amber-100/85">
              Atualize a pagina para conferir se terminou. Se continuar como demorada e o arquivo original nao estiver disponivel, envie a planilha novamente.
            </div>
          </div>
        </div>
      ) : null}
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
                  <TableHead>Acao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => {
                  const slow = isSlowProcessing(upload, now);
                  const originalFileAvailable = hasOriginalFile(upload.storagePath);
                  const lastError = upload.importErrors[0]?.message;
                  const cancelable = upload.status === "FAILED" || slow;
                  return (
                    <TableRow key={upload.id}>
                      <TableCell>{formatDateTime(upload.processedAt ?? upload.createdAt)}</TableCell>
                      <TableCell className="max-w-[360px] truncate font-medium">{upload.originalName}</TableCell>
                      <TableCell>{upload.type}</TableCell>
                      <TableCell className="min-w-[220px] max-w-[360px] whitespace-normal">
                        <div className="space-y-1">
                          <Badge
                            className={cn(
                              upload.status === "COMPLETED" && "border-emerald-500/25 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20",
                              upload.status === "FAILED" && "border-red-500/25 bg-red-500/15 text-red-300 hover:bg-red-500/20",
                              upload.status === "PROCESSING" && "border-amber-500/25 bg-amber-500/15 text-amber-300 hover:bg-amber-500/20",
                              slow && "border-orange-500/25 bg-orange-500/15 text-orange-300 hover:bg-orange-500/20",
                              upload.status === "PENDING" && "bg-muted text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {upload.status === "COMPLETED" ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : null}
                            {slow ? "PROCESSAMENTO DEMORADO" : upload.status}
                          </Badge>
                          {slow ? (
                            <div className="max-w-full break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                              {originalFileAvailable
                                ? `Em processamento ha ${processingMinutes(upload, now)} min. Atualize antes de enviar novamente.`
                                : `Em processamento ha ${processingMinutes(upload, now)} min, mas o arquivo original nao esta disponivel. Envie a planilha novamente.`}
                            </div>
                          ) : null}
                          {upload.status === "PROCESSING" && !slow ? (
                            <div className="max-w-full break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                              {upload.progress}% · Linhas {upload.rowsRead}/{upload.rowsTotal || "-"}
                              {upload.currentStep ? ` · ${upload.currentStep}` : ""}
                            </div>
                          ) : null}
                          {upload.status === "FAILED" && lastError ? (
                            <div className="max-w-full break-words text-xs text-red-300 [overflow-wrap:anywhere]">{lastError}</div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{upload.uploadedBy?.name ?? "-"}</TableCell>
                      <TableCell>
                        {cancelable ? <CancelUploadButton uploadId={upload.id} /> : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
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

function latestAttemptByFile<T extends { originalName: string; type: string; processedAt: Date | null; createdAt: Date }>(uploads: T[]) {
  const latest = new Map<string, T>();
  for (const upload of uploads) {
    const key = `${upload.type}:${upload.originalName.trim().toLowerCase()}`;
    if (!latest.has(key)) latest.set(key, upload);
  }
  return Array.from(latest.values());
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo"
  }).format(date);
}

function processingMinutes(upload: { processedAt: Date | null; createdAt: Date }, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - upload.createdAt.getTime()) / 60000));
}

function isSlowProcessing(upload: { status: string; processedAt: Date | null; createdAt: Date }, now: Date) {
  return upload.status === "PROCESSING" && !upload.processedAt && processingMinutes(upload, now) >= SLOW_PROCESSING_MINUTES;
}

function hasOriginalFile(storagePath: string | null) {
  return Boolean(storagePath && existsSync(storagePath));
}
