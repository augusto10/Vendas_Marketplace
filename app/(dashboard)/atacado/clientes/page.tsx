import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { listClientesPage } from "@/lib/atacado/service";
import { createClienteAction } from "@/features/atacado/actions";
import { ClientesList } from "@/features/atacado/clientes-list";

export const dynamic = "force-dynamic";

export default async function AtacadoClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const canEditClientes = session.user.roles.some((role) => ["master", "admin", "admin_atacado"].includes(role));
  const result = await listClientesPage({ query: query || undefined, page: 1, take: 20 });

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes Atacado" description="Cadastro e consulta de compradores do atacado." />
      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Novo cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createClienteAction} className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2"><Label>Nome</Label><Input name="nome" required /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input name="telefone" /></div>
            <div className="space-y-2"><Label>Cidade</Label><Input name="cidade" /></div>
            <div className="space-y-2"><Label>Estado</Label><Input name="estado" maxLength={2} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Endereco</Label><Input name="endereco" /></div>
            <div className="space-y-2 md:col-span-4"><Label>Observacoes</Label><Input name="observacoes" /></div>
            <Button className="md:col-span-4 md:justify-self-end" type="submit">Cadastrar cliente</Button>
          </form>
        </CardContent>
      </Card>
      <ClientesList
        initialClientes={result.clientes}
        initialHasMore={result.hasMore}
        initialQuery={query}
        canEditClientes={canEditClientes}
      />
    </div>
  );
}
