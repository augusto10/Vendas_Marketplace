"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Boxes,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings,
  Upload,
  Users
} from "lucide-react";
import type { PermissionKey } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

const items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }>; permission: PermissionKey }> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/uploads", label: "Uploads", icon: Upload, permission: "uploads.view" },
  { href: "/vendas", label: "Vendas", icon: ReceiptText, permission: "finance.view" },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList, permission: "finance.view" },
  { href: "/produtos", label: "Produtos", icon: Boxes, permission: "finance.view" },
  { href: "/financeiro", label: "Financeiro", icon: Banknote, permission: "finance.view" },
  { href: "/acelera", label: "Acelera", icon: CreditCard, permission: "finance.view" },
  { href: "/carteira", label: "Carteira Shopee", icon: Banknote, permission: "finance.view" },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users, permission: "users.view" },
  { href: "/configuracoes", label: "Configuracoes", icon: Settings, permission: "system.settings" }
];

export function Sidebar({ user }: { user: { name?: string | null; roles: string[]; permissions: string[] } }) {
  const visibleItems = items;
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const displayName = user.name ?? "Usuario";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  useEffect(() => {
    if (!expanded) return;
    const timer = window.setTimeout(() => setExpanded(false), 12000);
    return () => window.clearTimeout(timer);
  }, [expanded, pathname]);

  return (
    <aside className={cn("hidden h-screen shrink-0 border-r bg-card/95 transition-[width] duration-300 lg:sticky lg:top-0 lg:block", expanded ? "w-72" : "w-[76px]")}>
      <div className={cn("flex h-20 items-center border-b px-3", expanded ? "justify-between" : "justify-center")}>
        <div className={cn("flex min-w-0 items-center gap-3", !expanded && "hidden")}>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm">{initials}</div>
          <div>
            <div className="truncate text-sm font-semibold tracking-wide">{displayName}</div>
            <div className="text-xs text-muted-foreground">Financeiro, fiscal e Shopee</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="grid h-10 w-10 place-items-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={expanded ? "Fechar menu lateral" : "Abrir menu lateral"}
          title={expanded ? "Fechar menu" : "Abrir menu"}
        >
          {expanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
      </div>
      <nav className="max-h-[calc(100vh-5rem)] space-y-1 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!expanded ? item.label : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                expanded ? "px-3" : "justify-center px-0",
                active && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {expanded ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
