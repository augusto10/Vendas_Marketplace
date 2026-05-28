import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { UsersTable } from "@/features/admin/users-table";

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
      <PageHeader title="Usuarios e acessos" description="Gestao de acessos, edicao de perfis, senha e trilha de auditoria." />
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Usuarios cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable
            data={users.map((user) => ({
              id: user.id,
              name: user.name,
              email: user.email,
              imageUrl: user.imageUrl,
              status: user.status,
              roles: user.roles.map((entry) => entry.role.slug),
              createdAt: user.createdAt.toLocaleDateString("pt-BR"),
              lastLoginAt: user.lastLoginAt?.toLocaleString("pt-BR") ?? "-"
            }))}
            roles={roleOptions}
            canEditMaster={isMaster}
          />
        </CardContent>
      </Card>
    </div>
  );
}
