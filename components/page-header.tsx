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
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-3xl">
        {eyebrow ? <div className="mb-2 text-xs font-semibold uppercase text-primary">{eyebrow}</div> : null}
        <h1 className="font-title text-2xl font-semibold tracking-tight text-slate-950 md:text-[2rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
