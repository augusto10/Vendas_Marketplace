"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type EntregaActionButtonProps = {
  id: string;
  label: string;
  endpoint: string;
  method?: "POST" | "PATCH";
  onSuccess?: () => void;
};

export function EntregaActionButton({ id, label, endpoint, method = "PATCH", onSuccess }: EntregaActionButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleClick() {
    startTransition(async () => {
      const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" } });
      if (!response.ok) {
        throw new Error("Falha ao atualizar entrega.");
      }
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" loading={pending} onClick={handleClick}>
      <span className="sr-only">{id}</span>
      {label}
    </Button>
  );
}
