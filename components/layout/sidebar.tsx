"use client";

import type { FocusEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, ChevronDown } from "lucide-react";
import { sidebarItems, type SidebarItem } from "@/components/layout/sidebar-items";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

export function Sidebar({ user }: { user: { name?: string | null; roles: string[]; permissions: string[] } }) {
  function canView(item: SidebarItem) {
    return hasPermission(user, item.permission);
  }

  function visibleChildren(item: SidebarItem) {
    return item.children?.filter(canView) ?? [];
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/atacado" && pathname.startsWith(`${href}/`));
  }

  const visibleItems = sidebarItems.filter((item) => canView(item) || visibleChildren(item).length > 0);
  const sections: Array<{ id: "visao" | "operacao" | "admin"; label: string }> = [
    { id: "visao", label: "Visao" },
    { id: "operacao", label: "Operacao" },
    { id: "admin", label: "Administracao" }
  ];
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
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
      className={cn(
        "hidden h-screen shrink-0 border-r border-border/70 bg-card/85 text-foreground shadow-[18px_0_48px_-44px_rgba(0,0,0,0.88)] backdrop-blur-xl transition-[width] duration-300 lg:sticky lg:top-0 lg:block",
        expanded ? "w-72" : "w-[84px]"
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={handleBlur}
    >
      <div className={cn("flex min-h-16 items-center border-b border-border/70 px-3", expanded ? "justify-between" : "justify-center")}>
        <div className={cn("flex min-w-0 items-center gap-3", !expanded && "hidden")}>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-[0_14px_28px_-18px_rgba(255,168,36,0.9)]">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight text-foreground">{displayName}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              <span>Workspace</span>
            </div>
          </div>
        </div>
        {!expanded ? (
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-[0_14px_28px_-18px_rgba(255,168,36,0.9)]">
            {initials}
          </div>
        ) : null}
      </div>
      <nav className="max-h-[calc(100vh-4rem)] space-y-3 overflow-y-auto p-3">
        {sections.map((section) => (
          <div key={section.id} className="space-y-1.5">
            {expanded ? <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{section.label}</div> : null}
            {visibleItems.filter((item) => item.section === section.id).map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const children = visibleChildren(item);
              const isGroup = children.length > 0;
              const groupOpen = isGroup && (openGroups[item.href] ?? active);
              return (
                <div key={item.href} className="space-y-1">
                  {isGroup ? (
                    <button
                      type="button"
                      title={!expanded ? item.label : undefined}
                      aria-expanded={groupOpen}
                      onClick={() => {
                        setExpanded(true);
                        setOpenGroups((current) => ({ ...current, [item.href]: !(current[item.href] ?? active) }));
                      }}
                      className={cn(
                        "group relative flex h-11 w-full items-center gap-3 rounded-xl border border-transparent text-left text-sm font-semibold transition-all hover:border-border/70 hover:bg-muted/70 hover:text-foreground",
                        expanded ? "px-3" : "justify-center px-0",
                        active &&
                          "border-primary/20 bg-primary/10 text-foreground shadow-[0_12px_24px_-18px_rgba(255,168,36,0.55)] hover:border-primary/20 hover:bg-primary/10"
                      )}
                    >
                      {active ? <span className="absolute left-0 top-1.5 h-8 w-1 rounded-r-full bg-primary" /> : null}
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                      {expanded ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
                      {expanded ? (
                        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", groupOpen && "rotate-180 text-primary")} />
                      ) : null}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      title={!expanded ? item.label : undefined}
                      className={cn(
                        "group relative flex h-11 items-center gap-3 rounded-xl border border-transparent text-sm font-semibold transition-all hover:border-border/70 hover:bg-muted/70 hover:text-foreground",
                        expanded ? "px-3" : "justify-center px-0",
                        active &&
                          "border-primary/20 bg-primary/10 text-foreground shadow-[0_12px_24px_-18px_rgba(255,168,36,0.55)] hover:border-primary/20 hover:bg-primary/10"
                      )}
                    >
                      {active ? <span className="absolute left-0 top-1.5 h-8 w-1 rounded-r-full bg-primary" /> : null}
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                      {expanded ? <span className="truncate">{item.label}</span> : null}
                    </Link>
                  )}
                  {expanded && groupOpen ? (
                    <div className="ml-5 space-y-1 border-l border-border/70 pl-3">
                      {children.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = isActive(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex h-9 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
                              childActive && "bg-primary/10 text-foreground"
                            )}
                          >
                            <ChildIcon className={cn("h-3.5 w-3.5 shrink-0", childActive && "text-primary")} />
                            <span className="truncate">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
