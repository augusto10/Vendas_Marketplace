"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSpreadsheet, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadState = "idle" | "uploading" | "done" | "error";
type UploadPhase = "sending" | "processing";

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [phase, setPhase] = useState<UploadPhase>("sending");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  async function handleImport() {
    if (!file || state === "uploading") return;

    setState("uploading");
    setPhase("sending");
    setMessage("");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      await uploadFile(formData, setProgress, setPhase);

      setProgress(100);
      setState("done");
      setMessage("Arquivo importado com sucesso.");
    } catch (error) {
      setState("error");
      setProgress(0);
      setMessage(error instanceof Error ? error.message : "Falha ao importar arquivo.");
    }
  }

  function handleConfirm() {
    setFile(null);
    setState("idle");
    setPhase("sending");
    setProgress(0);
    setMessage("");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="flex min-h-24 cursor-pointer items-center gap-3 rounded-md border bg-card px-4 py-3 transition-colors hover:bg-muted/60">
          <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-sm font-medium">{file ? file.name : "Selecionar arquivo"}</div>
            <div className="text-xs text-muted-foreground">XLSX, XLS ou CSV</div>
          </div>
          <input
            className="sr-only"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setState("idle");
              setPhase("sending");
              setProgress(0);
              setMessage("");
            }}
          />
        </label>
        <Button type="button" className="h-12 self-center md:w-40" disabled={!file || state === "uploading"} onClick={handleImport}>
          <UploadCloud className="h-4 w-4" />
          Importar
        </Button>
      </div>

      {(state === "uploading" || state === "done") ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>
              {state === "done"
                ? "Carregamento concluido"
                : phase === "processing"
                  ? "Processando planilha"
                  : "Carregando arquivo"}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                state === "done" ? "bg-emerald-500" : "bg-primary",
                state === "uploading" && "animate-pulse"
              )}
              style={{ width: `${progress}%` }}
            />
            {state === "uploading" ? (
              <div className="absolute inset-0 -translate-x-full animate-[upload-shimmer_1.15s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/45 to-transparent" />
            ) : null}
          </div>
          {state === "uploading" ? (
            <div className="text-xs text-muted-foreground">
              Aguarde, isso pode demorar em planilhas grandes. Se falhar, o sistema vai avisar para refazer o upload.
            </div>
          ) : null}
          {state === "done" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                {message}
              </div>
              <Button type="button" size="sm" onClick={handleConfirm}>
                Confirmar
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {state === "error" ? <div className="text-sm font-medium text-destructive">{message}</div> : null}
    </div>
  );
}

function uploadFile(
  formData: FormData,
  onProgress: (progress: number) => void,
  onPhaseChange: (phase: UploadPhase) => void
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 95);
      onProgress(Math.min(percent, 95));
      if (event.loaded === event.total) {
        onPhaseChange("processing");
      }
    };

    request.upload.onload = () => {
      onPhaseChange("processing");
      onProgress(95);
    };

    request.onload = () => {
      try {
        const result = JSON.parse(request.responseText);
        if (request.status < 200 || request.status >= 300 || !result.ok) {
          reject(new Error(result.error?.message ?? "Falha ao importar arquivo."));
          return;
        }
        resolve();
      } catch {
        reject(new Error("Resposta invalida ao importar arquivo."));
      }
    };

    request.onerror = () => reject(new Error("Falha de conexao ao importar arquivo."));
    request.ontimeout = () => reject(new Error("Tempo esgotado ao importar. Tente refazer o upload."));
    request.open("POST", "/api/v1/uploads");
    request.send(formData);
  });
}
