"use client";

import { useEffect, useState } from "react";
import { Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FilterSubmitButton({ label }: { label: string }) {
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    if (!filtering) return;
    const timer = window.setTimeout(() => setFiltering(false), 5000);
    return () => window.clearTimeout(timer);
  }, [filtering]);

  return (
    <Button type="submit" className="self-end" onClick={() => setFiltering(true)}>
      {filtering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
      {filtering ? "Filtrando" : label}
    </Button>
  );
}
