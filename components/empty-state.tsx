import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-md border border-dashed bg-muted/30 p-6 text-center">
      <div>
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-md bg-card text-muted-foreground shadow-sm">
          <Inbox className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-sm font-semibold">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
