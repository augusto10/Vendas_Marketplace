"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { LogoutButton } from "@/features/auth/logout-button";
import { ThemeToggle } from "@/features/theme/theme-toggle";

export function Topbar({ name, image, roles }: { name?: string | null; image?: string | null; roles: string[] }) {
  const [greeting, setGreeting] = useState("Bem-vindo");
  const displayName = name ?? "Usuario";
  const visibleRoles = roles.filter((role) => role.toLowerCase() !== "master");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite");
  }, []);

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-4 shadow-[0_14px_34px_-32px_rgba(18,32,48,0.65)] backdrop-blur md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <MobileMenu />
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase text-primary">{greeting}</div>
          <div className="font-title truncate text-lg font-semibold tracking-tight text-slate-950">{displayName}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
          <Link href="/uploads">
            <Upload className="h-4 w-4" />
            Importar
          </Link>
        </Button>
        <div className="hidden text-right sm:block">
          <div className="mt-1 flex flex-wrap justify-end gap-1">
            {visibleRoles.map((role) => (
              <Badge key={role} className="border-primary/20 bg-primary/10 text-primary">
                {role}
              </Badge>
            ))}
          </div>
        </div>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-10 w-10 rounded-md object-cover shadow-[0_12px_22px_-16px_rgba(18,32,48,0.85)] ring-1 ring-slate-200" />
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-md bg-accent text-sm font-semibold text-accent-foreground shadow-[0_12px_22px_-16px_rgba(18,32,48,0.85)]">
            {initials}
          </div>
        )}
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}
