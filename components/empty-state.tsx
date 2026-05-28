import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-dashed bg-muted/35 p-8 text-center">
      <div>
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-lg border bg-card text-primary shadow-sm">
          <Inbox className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-sm font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
