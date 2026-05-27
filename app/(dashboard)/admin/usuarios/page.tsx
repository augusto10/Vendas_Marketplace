import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersTable } from "@/features/admin/users-table";
import { UsersEditList } from "@/features/admin/users-edit-list";
import { UserForm } from "@/features/admin/user-form";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const session = await auth();
  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } })
  ]);
  const isMaster = session?.user.roles.includes("master") ?? false;
  const availableRoles = isMaster ? roles : roles.filter((role) => role.slug !== "master");
  const roleOptions = availableRoles.map((role) => ({ name: role.name, slug: role.slug }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">Gestao preparada para convites, edicao de acessos, senha e trilha de auditoria.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Novo acesso</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm roles={roleOptions} />
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
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Editar usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersEditList
            roles={roleOptions}
            canEditMaster={isMaster}
            users={users.map((user) => ({
              id: user.id,
              name: user.name,
              email: user.email,
              status: user.status,
              roles: user.roles.map((entry) => entry.role.slug)
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
