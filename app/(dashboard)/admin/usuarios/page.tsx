import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersTable } from "@/features/admin/users-table";
import { UserForm } from "@/features/admin/user-form";
import { Button } from "@/components/ui/button";
import { updateUserStatusAction } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const users = await prisma.user.findMany({
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">Gestao preparada para convites, desativacao e trilha de auditoria.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Novo acesso</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Usuarios cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable
            data={users.map((user) => ({
              id: user.id,
              name: user.name,
              email: user.email,
              status: user.status,
              roles: user.roles.map((entry) => entry.role.slug),
              createdAt: user.createdAt.toLocaleDateString("pt-BR"),
              lastLoginAt: user.lastLoginAt?.toLocaleString("pt-BR") ?? "-"
            }))}
          />
          <div className="mt-4 space-y-2">
            {users.map((user) => (
              <form key={user.id} action={updateUserStatusAction} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email} · {user.status}</div>
                </div>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="status" value={user.status === "ACTIVE" ? "DISABLED" : "ACTIVE"} />
                <Button variant="outline" size="sm" type="submit">
                  {user.status === "ACTIVE" ? "Desativar" : "Ativar"}
                </Button>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
