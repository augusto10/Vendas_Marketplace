import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  eyebrow,
  children,
  className
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-[0_18px_42px_-34px_rgba(0,0,0,0.78)] backdrop-blur md:flex-row md:items-end md:justify-between md:p-6",
        className
      )}
    >
      <div className="max-w-3xl space-y-2">
        {eyebrow ? (
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-title text-3xl font-semibold tracking-tight text-foreground md:text-[2.25rem]">{title}</h1>
        {description ? <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}
