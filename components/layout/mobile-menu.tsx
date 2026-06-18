"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sidebarItems, type SidebarItem } from "@/components/layout/sidebar-items";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

export function MobileMenu({ roles, permissions }: { roles: string[]; permissions: string[] }) {
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  function canView(item: SidebarItem) {
    return hasPermission({ roles, permissions }, item.permission);
  }

  function visibleChildren(item: SidebarItem) {
    return item.children?.filter(canView) ?? [];
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/atacado" && pathname.startsWith(`${href}/`));
  }

  const visibleItems = sidebarItems.filter((item) => canView(item) || visibleChildren(item).length > 0);
  const sections: Array<{ id: "visao" | "operacao" | "atacado" | "admin"; label: string }> = [
    { id: "visao", label: "Visao" },
    { id: "operacao", label: "Operacao" },
    { id: "atacado", label: "Atacado" },
    { id: "admin", label: "Administracao" }
  ];

  return (
    <div className="lg:hidden">
      <Button type="button" variant="outline" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
        <Menu className="h-4 w-4" />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-[999] bg-slate-950/55" role="dialog" aria-modal="true">
          <div className="fixed left-0 top-0 h-dvh w-[86vw] max-w-[360px] overflow-y-auto bg-slate-900 p-4 text-slate-100 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="font-title text-lg font-semibold">Menu</div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar menu" className="text-slate-100 hover:bg-slate-800">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="thin-scrollbar grid gap-4 pb-8">
              {sections.map((section) => {
                const sectionItems = visibleItems.filter((item) => item.section === section.id);
                if (!sectionItems.length) return null;

                return (
                  <div key={section.id} className="space-y-1.5">
                    <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{section.label}</div>
                    <div className="grid gap-1.5">
                      {sectionItems.map((item) => {
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
                                aria-expanded={groupOpen}
                                onClick={() => setOpenGroups((current) => ({ ...current, [item.href]: !(current[item.href] ?? active) }))}
                                className={cn(
                                  "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-slate-100",
                                  active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                                )}
                              >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="min-w-0 flex-1">{item.label}</span>
                                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", groupOpen && "rotate-180")} />
                              </button>
                            ) : (
                              <Link
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={cn(
                                  "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-slate-100",
                                  active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                                )}
                              >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span>{item.label}</span>
                              </Link>
                            )}
                            {groupOpen ? (
                              <div className="ml-5 grid gap-1 border-l border-slate-700/80 pl-3">
                                {children.map((child) => {
                                  const ChildIcon = child.icon;
                                  const childActive = isActive(child.href);
                                  return (
                                    <Link
                                      key={child.href}
                                      href={child.href}
                                      onClick={() => setOpen(false)}
                                      className={cn(
                                        "flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100",
                                        childActive && "bg-primary/20 text-slate-100"
                                      )}
                                    >
                                      <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                      <span>{child.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
