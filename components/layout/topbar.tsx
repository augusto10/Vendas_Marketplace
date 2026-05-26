import { signOut } from "@/lib/auth/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { ThemeToggle } from "@/features/theme/theme-toggle";

export function Topbar({ name, roles }: { name?: string | null; roles: string[] }) {
  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b bg-background/85 px-4 backdrop-blur md:px-8">
      <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground md:flex">
        <Search className="h-4 w-4" />
        <span>Busque pedidos, SKUs, uploads e relatorios</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium">{name ?? "Usuario"}</div>
          <div className="mt-1 flex flex-wrap justify-end gap-1">
            {roles.map((role) => (
              <Badge key={role} className="bg-muted text-muted-foreground">
                {role}
              </Badge>
            ))}
          </div>
        </div>
        <ThemeToggle />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button variant="outline" size="sm" type="submit">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
