import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card text-card-foreground shadow-[0_18px_42px_-32px_rgba(0,0,0,0.82)] backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2 p-5 pb-4 md:p-6 md:pb-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-title break-words text-base font-semibold leading-snug tracking-tight text-card-foreground md:text-lg", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0 md:p-6 md:pt-0", className)} {...props} />;
}

export function MetricCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Card className={cn("flex min-h-[136px] flex-col", className)} {...props} />;
}

export function MetricCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <CardHeader className={cn("min-h-[72px] justify-start pb-2", className)} {...props} />;
}

export function MetricCardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <CardContent className={cn("mt-auto text-2xl font-semibold leading-tight", className)} {...props} />;
}
