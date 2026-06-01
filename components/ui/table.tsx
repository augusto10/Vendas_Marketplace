"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const bottomScrollRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLTableElement>(null);
  const [scrollWidth, setScrollWidth] = React.useState(0);

  React.useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const updateScrollWidth = () => setScrollWidth(table.scrollWidth);
    updateScrollWidth();

    const observer = new ResizeObserver(updateScrollWidth);
    observer.observe(table);
    return () => observer.disconnect();
  }, []);

  const syncScroll = (source: "top" | "bottom") => {
    const top = topScrollRef.current;
    const bottom = bottomScrollRef.current;
    if (!top || !bottom) return;

    if (source === "top") {
      bottom.scrollLeft = top.scrollLeft;
    } else {
      top.scrollLeft = bottom.scrollLeft;
    }
  };

  return (
    <div className="w-full min-w-0">
      <div
        ref={topScrollRef}
        className="mb-2 h-4 overflow-x-auto overflow-y-hidden"
        onScroll={() => syncScroll("top")}
      >
        <div style={{ width: scrollWidth, height: 1 }} />
      </div>
      <div
        ref={bottomScrollRef}
        className="max-h-[70vh] overflow-auto"
        onScroll={() => syncScroll("bottom")}
      >
        <table ref={tableRef} className={cn("w-full min-w-max caption-bottom text-sm", className)} {...props} />
      </div>
    </div>
  );
}
export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-muted/70 [&_tr]:border-b", className)} {...props} />;
}
export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0 [&_tr:nth-child(2n)]:bg-muted/25", className)} {...props} />;
}
export function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tfoot className={cn("bg-muted/80 font-semibold [&_tr]:border-t", className)} {...props} />;
}
export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-border transition-colors hover:bg-primary/10", className)} {...props} />;
}
export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("sticky top-0 z-20 h-11 whitespace-nowrap bg-muted px-4 text-left align-middle text-xs font-semibold uppercase text-muted-foreground shadow-[inset_0_-1px_0_hsl(var(--border))]", className)} {...props} />;
}
export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("whitespace-nowrap px-4 py-3.5 align-middle", className)} {...props} />;
}
