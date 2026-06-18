import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateClienteAction } from "@/features/atacado/actions";

export const dynamic = "force-dynamic";

export default async function AtacadoClienteEditarPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const canManageClientes = hasPermission(session.user, "atacado.clientes.manage");
  const canEditClientes = session.user.roles.some((role) => ["master", "admin", "admin_atacado"].includes(role));
  if (!canManageClientes || !canEditClientes) redirect("/atacado/clientes");

  const { id } = await params;
  const cliente = await prisma.atacadoCliente.findUnique({ where: { id } });
  if (!cliente) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clientes Atacado"
        title={`Editar ${cliente.nome}`}
        description="Ajuste os dados cadastrais do cliente. O documento foi removido do formulario de criacao e nao e necessario aqui."
      >
        <Button asChild variant="outline">
          <Link href="/atacado/clientes">Voltar</Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form action={updateClienteAction} className="grid gap-4 md:grid-cols-4">
            <input type="hidden" name="clienteId" value={cliente.id} />
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`nome-${cliente.id}`}>Nome</Label>
              <Input id={`nome-${cliente.id}`} name="nome" defaultValue={cliente.nome} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`telefone-${cliente.id}`}>Telefone</Label>
              <Input id={`telefone-${cliente.id}`} name="telefone" defaultValue={cliente.telefone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`status-${cliente.id}`}>Status</Label>
              <select id={`status-${cliente.id}`} name="status" defaultValue={cliente.status} className="form-select">
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`cidade-${cliente.id}`}>Cidade</Label>
              <Input id={`cidade-${cliente.id}`} name="cidade" defaultValue={cliente.cidade ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`estado-${cliente.id}`}>Estado</Label>
              <Input id={`estado-${cliente.id}`} name="estado" defaultValue={cliente.estado ?? ""} maxLength={2} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`endereco-${cliente.id}`}>Endereco</Label>
              <Input id={`endereco-${cliente.id}`} name="endereco" defaultValue={cliente.endereco ?? ""} />
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label htmlFor={`observacoes-${cliente.id}`}>Observacoes</Label>
              <Input id={`observacoes-${cliente.id}`} name="observacoes" defaultValue={cliente.observacoes ?? ""} />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button type="submit">Salvar cliente</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
