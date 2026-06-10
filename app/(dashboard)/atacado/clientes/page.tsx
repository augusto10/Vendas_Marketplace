import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listClientes } from "@/lib/atacado/service";
import { createClienteAction } from "@/features/atacado/actions";
import { AtacadoStatusBadge } from "@/features/atacado/status";

export const dynamic = "force-dynamic";

export default async function AtacadoClientesPage() {
  const clientes = await listClientes();

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
            <div className="space-y-2"><Label>Documento</Label><Input name="documento" /></div>
            <div className="space-y-2"><Label>Cidade</Label><Input name="cidade" /></div>
            <div className="space-y-2"><Label>Estado</Label><Input name="estado" maxLength={2} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Endereco</Label><Input name="endereco" /></div>
            <div className="space-y-2 md:col-span-4"><Label>Observacoes</Label><Input name="observacoes" /></div>
            <Button className="md:col-span-4 md:justify-self-end" type="submit">Cadastrar cliente</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="border-b bg-muted/20"><CardTitle>Clientes cadastrados</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cidade</TableHead><TableHead>Telefone</TableHead><TableHead>Documento</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {clientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-semibold">{cliente.nome}</TableCell>
                  <TableCell>{[cliente.cidade, cliente.estado].filter(Boolean).join(" / ") || "-"}</TableCell>
                  <TableCell>{cliente.telefone ?? "-"}</TableCell>
                  <TableCell>{cliente.documento ?? "-"}</TableCell>
                  <TableCell><AtacadoStatusBadge status={cliente.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

