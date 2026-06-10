"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { LogoutButton } from "@/features/auth/logout-button";
import { ThemeToggle } from "@/features/theme/theme-toggle";

export function Topbar({ name, image, roles, permissions }: { name?: string | null; image?: string | null; roles: string[]; permissions: string[] }) {
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
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-border/70 bg-card/85 px-4 shadow-[0_14px_34px_-30px_rgba(0,0,0,0.82)] backdrop-blur-xl md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <MobileMenu roles={roles} permissions={permissions} />
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{greeting}</div>
          <div className="font-title truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">{displayName}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden text-right sm:block">
          <div className="mt-1 flex flex-wrap justify-end gap-1.5">
            {visibleRoles.map((role) => (
              <Badge key={role} className="border-primary/20 bg-primary/10 text-primary">
                {role}
              </Badge>
            ))}
          </div>
        </div>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-10 w-10 rounded-xl object-cover shadow-[0_12px_22px_-16px_rgba(0,0,0,0.85)] ring-1 ring-border" />
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-sm font-semibold text-accent-foreground shadow-[0_12px_22px_-16px_rgba(18,32,48,0.85)]">
            {initials}
          </div>
        )}
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}
