"use client";

import type { FocusEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { sidebarItems } from "@/components/layout/sidebar-items";
import { cn } from "@/lib/utils";

export function Sidebar({ user }: { user: { name?: string | null; roles: string[]; permissions: string[] } }) {
  const visibleItems = sidebarItems;
  const sections: Array<{ id: "visao" | "operacao" | "admin"; label: string }> = [
    { id: "visao", label: "Visao" },
    { id: "operacao", label: "Operacao" },
    { id: "admin", label: "Administracao" }
  ];
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const displayName = user.name ?? "Usuario";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setExpanded(false);
    }
  }

  return (
    <aside
      className={cn("hidden h-screen shrink-0 border-r border-slate-700 bg-slate-900 text-slate-100 shadow-[18px_0_48px_-44px_rgba(15,23,42,0.92)] transition-[width] duration-300 lg:sticky lg:top-0 lg:block", expanded ? "w-72" : "w-[78px]")}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={handleBlur}
    >
      <div className={cn("flex min-h-16 items-center border-b border-slate-700 px-3", expanded ? "justify-between" : "justify-center")}>
        <div className={cn("flex min-w-0 items-center gap-3", !expanded && "hidden")}>
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-md">{initials}</div>
          <div>
            <div className="truncate text-sm font-semibold tracking-tight text-slate-50">{displayName}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              <span>Workspace</span>
            </div>
          </div>
        </div>
        {!expanded ? <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-md">{initials}</div> : null}
      </div>
      <nav className="max-h-[calc(100vh-4rem)] space-y-3 overflow-y-auto p-3">
        {sections.map((section) => (
          <div key={section.id} className="space-y-1.5">
            {expanded ? <div className="px-2 text-[11px] font-semibold uppercase text-slate-400">{section.label}</div> : null}
            {visibleItems.filter((item) => item.section === section.id).map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!expanded ? item.label : undefined}
                  className={cn(
                    "group relative flex h-10 items-center gap-3 rounded-md text-sm font-semibold text-slate-300 transition-all hover:bg-slate-800 hover:text-slate-100",
                    expanded ? "px-3" : "justify-center px-0",
                    active && "bg-primary text-primary-foreground shadow-md hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  {active ? <span className="absolute left-0 top-1.5 h-7 w-1 rounded-r-full bg-slate-900/60" /> : null}
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary-foreground" : "text-slate-400 group-hover:text-slate-100")} />
                  {expanded ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
