"use client";

import { useFormStatus } from "react-dom";
import { Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FilterSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="self-end" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
      {pending ? "Filtrando" : label}
    </Button>
  );
}
