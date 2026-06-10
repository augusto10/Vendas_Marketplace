"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileSpreadsheet, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadState = "idle" | "uploading" | "done" | "error";
type UploadPhase = "sending" | "processing";

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<UploadState>("idle");
  const [phase, setPhase] = useState<UploadPhase>("sending");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null);
  const [processingSeconds, setProcessingSeconds] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const fileMeta = useMemo(() => (file ? `${formatBytes(file.size)} - ${file.type || "Arquivo de planilha"}` : null), [file]);
  const slowProcessing = state === "uploading" && phase === "processing" && processingSeconds >= 180;

  useEffect(() => {
    if (state !== "uploading" || phase !== "processing" || !processingStartedAt) {
      setProcessingSeconds(0);
      return;
    }

    const timer = window.setInterval(() => {
      setProcessingSeconds(Math.floor((Date.now() - processingStartedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase, processingStartedAt, state]);

  async function handleImport() {
    if (!file || state === "uploading") return;

    setState("uploading");
    setPhase("sending");
    setMessage("");
    setProgress(0);
    setProcessingSeconds(0);
    setProcessingStartedAt(null);
    setCurrentStep("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      await uploadAndProcess(formData, setProgress, (nextPhase) => {
        setPhase(nextPhase);
        if (nextPhase === "processing") {
          setProcessingStartedAt((current) => current ?? Date.now());
          setProgress((current) => Math.max(current, 15));
        }
      });

      setProgress(100);
      setState("done");
      setMessage("Arquivo importado com sucesso.");
      router.refresh();
    } catch (error) {
      setState("error");
      setProgress(0);
      setMessage(error instanceof Error ? error.message : "Falha ao importar arquivo.");
    }
  }

  function handleFilePicked(nextFile: File | null) {
    setFile(nextFile);
    setState("idle");
    setPhase("sending");
    setProgress(0);
    setMessage("");
    setProcessingSeconds(0);
    setProcessingStartedAt(null);
    setCurrentStep("");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label
          className={cn(
            "flex min-h-32 cursor-pointer items-center gap-4 rounded-lg border border-dashed bg-muted/25 px-5 py-4 transition-colors hover:border-primary/45 hover:bg-primary/5",
            dragging && "border-primary bg-primary/10"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFilePicked(event.dataTransfer.files?.[0] ?? null);
          }}
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border bg-card text-primary shadow-sm">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">{file ? file.name : "Arraste uma planilha ou selecione o arquivo"}</div>
            <div className="mt-1 text-xs text-muted-foreground">Tipos aceitos: XLSX, XLS ou CSV. O processamento acontece automaticamente apos o envio.</div>
            {fileMeta ? <div className="mt-1 text-xs text-primary">{fileMeta}</div> : null}
          </div>
          <input
            className="sr-only"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => {
              handleFilePicked(event.target.files?.[0] ?? null);
            }}
          />
        </label>
        <Button type="button" className="h-12 self-center md:w-40" disabled={!file || state === "uploading"} onClick={handleImport}>
          <UploadCloud className="h-4 w-4" />
          Importar
        </Button>
      </div>

      {(state === "uploading" || state === "done") ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm font-semibold text-foreground">
            <span>
              {state === "done"
                ? "Carregamento concluido"
                : phase === "processing"
                  ? "Processando planilha"
                  : "Carregando arquivo"}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-muted ring-1 ring-border">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                state === "done" ? "bg-emerald-500" : "bg-primary",
                state === "uploading" && phase === "processing" && "animate-pulse"
              )}
              style={{ width: `${progress}%` }}
            />
            {state === "uploading" ? (
              <div className="absolute inset-0 -translate-x-full animate-[upload-shimmer_1.15s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/45 to-transparent" />
            ) : null}
          </div>
          {state === "uploading" ? (
            <div className={cn("rounded-md border px-3 py-2 text-sm font-medium", slowProcessing ? "border-amber-300 bg-amber-50 text-amber-900" : "border-primary/25 bg-primary/10 text-foreground")}>
              {slowProcessing
                ? "A importacao esta demorando mais que o normal. Nao envie o mesmo arquivo de novo ainda; aguarde ou atualize o historico para verificar o status."
                : phase === "processing"
                  ? currentStep || "Arquivo enviado. Acompanhando o processamento real no banco."
                  : "O percentual acompanha o envio real do arquivo. Depois disso a planilha sera validada e importada."}
            </div>
          ) : null}
          {state === "done" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                {message}
              </div>
              <div className="text-xs text-muted-foreground">{file ? `Arquivo processado: ${file.name}` : null}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {state === "error" ? (
        <div className="flex min-w-0 items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{message}</span>
        </div>
      ) : null}
    </div>
  );
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function uploadAndProcess(
  formData: FormData,
  onProgress: (progress: number) => void,
  onPhaseChange: (phase: UploadPhase) => void
) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress(Math.min(Math.max(1, Math.round(percent / 10)), 10));
      if (event.loaded === event.total) {
        onPhaseChange("processing");
      }
    };

    request.upload.onload = () => {
      onPhaseChange("processing");
      onProgress(15);
    };

    request.onload = () => {
      try {
        const result = parseApiPayload(request.responseText);
        if (request.status < 200 || request.status >= 300 || !result.ok) {
          reject(new Error(result.error?.message ?? "Falha ao importar arquivo."));
          return;
        }
        resolve(result.data?.uploadId ?? "");
      } catch {
        reject(new Error(request.status >= 500 ? "Falha no servidor ao importar arquivo." : "Resposta invalida ao importar arquivo."));
      }
    };

    request.onerror = () => reject(new Error("Falha de conexao ao importar arquivo."));
    request.ontimeout = () => reject(new Error("Tempo esgotado ao importar. Tente refazer o upload."));
    request.open("POST", "/api/v1/uploads");
    request.send(formData);
  });
}

function parseApiPayload(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const cleanText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return {
      ok: false,
      error: {
        message: cleanText || "O servidor retornou uma resposta invalida."
      }
    };
  }
}
