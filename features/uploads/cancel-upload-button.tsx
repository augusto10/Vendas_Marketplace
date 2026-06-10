"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CancelUploadButton({ uploadId }: { uploadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Cancelar esta importacao do historico?")) return;
          setMessage(null);
          startTransition(async () => {
            const response = await fetch(`/api/v1/uploads/${uploadId}`, { method: "DELETE" });
            const payload = parseApiPayload(await response.text());
            if (response.ok && payload.ok) {
              router.refresh();
              return;
            }
            setMessage(payload.error?.message ?? "Falha ao cancelar.");
          });
        }}
      >
        <XCircle className="h-4 w-4" />
        {pending ? "..." : "Cancelar"}
      </Button>
      {message ? <span className="min-w-0 max-w-[220px] break-words text-xs text-destructive [overflow-wrap:anywhere]">{message}</span> : null}
    </div>
  );
}

function parseApiPayload(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: {
        message: text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "Resposta invalida do servidor."
      }
    };
  }
}
