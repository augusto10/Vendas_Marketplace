"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReprocessButton({ uploadId }: { uploadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const response = await fetch(`/api/v1/uploads/${uploadId}/reprocess`, { method: "POST" });
            const payload = await response.json();
            setMessage(payload.ok ? "Reprocessado" : payload.error?.message ?? "Falha");
            if (payload.ok) router.refresh();
          });
        }}
      >
        <RefreshCcw className="h-4 w-4" />
        {pending ? "..." : "Reprocessar"}
      </Button>
      {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
    </div>
  );
}
