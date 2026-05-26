import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRoleAction } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

export default async function PermissoesPage() {
  const roles = await prisma.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { name: "asc" } });
  const permissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cargos e permissoes</h1>
        <p className="text-sm text-muted-foreground">RBAC granular por modulo, validado no backend.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Novo cargo personalizado</CardTitle></CardHeader>
        <CardContent>
          <form action={createRoleAction} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2"><Label>Nome</Label><Input name="name" placeholder="Supervisor financeiro" required /></div>
              <div className="space-y-2"><Label>Slug</Label><Input name="slug" placeholder="supervisor_financeiro" required /></div>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {permissions.map((permission) => (
                <label key={permission.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <input type="checkbox" name="permissions" value={permission.key} />
                  {permission.key}
                </label>
              ))}
            </div>
            <Button type="submit">Criar cargo</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle>{role.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {role.permissions.map((entry) => (
                <Badge key={entry.permissionId}>{entry.permission.key}</Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
