"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export function BackButton({ children = "Voltar" }: { children?: React.ReactNode }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => router.back()}
      className="flex items-center gap-2"
    >
      <ChevronLeft className="h-4 w-4" />
      {children}
    </Button>
  );
}
