"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FilterSubmitButton({ label }: { label: string }) {
  const [filtering, setFiltering] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setFiltering(false);
  }, [pathname, searchParams]);

  return (
    <Button type="submit" className="self-end" disabled={filtering} onClick={() => setFiltering(true)}>
      {filtering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
      {filtering ? "Filtrando" : label}
    </Button>
  );
}
