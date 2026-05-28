"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sidebarItems } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <Button type="button" variant="outline" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
        <Menu className="h-4 w-4" />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/45" role="dialog" aria-modal="true">
          <div className="h-full w-[min(86vw,340px)] overflow-y-auto bg-slate-900 p-4 text-slate-100 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="font-title text-lg font-semibold">Menu</div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar menu" className="text-slate-100 hover:bg-slate-800">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="space-y-1.5">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100",
                      active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
