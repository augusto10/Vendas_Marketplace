import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/features/auth/logout-button";
import { ThemeToggle } from "@/features/theme/theme-toggle";

export function Topbar({ name, roles }: { name?: string | null; roles: string[] }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const displayName = name ?? "Usuario";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b bg-background/85 px-4 backdrop-blur md:px-8">
      <div className="min-w-0 flex-1">
        <div className="text-sm text-muted-foreground">{greeting}</div>
        <div className="truncate text-lg font-semibold">{displayName}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full border bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
          {initials}
        </div>
        <div className="text-right">
          <div className="mt-1 flex flex-wrap justify-end gap-1">
            {roles.map((role) => (
              <Badge key={role} className="bg-muted text-muted-foreground">
                {role}
              </Badge>
            ))}
          </div>
        </div>
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}
