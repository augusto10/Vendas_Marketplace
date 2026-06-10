import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createEntregaAction } from "@/features/atacado/actions";
import { AtacadoStatusBadge } from "@/features/atacado/status";

export const dynamic = "force-dynamic";

export default async function AtacadoEntregasPage() {
  const [pedidos, motoristas, entregas] = await Promise.all([
    prisma.atacadoPedido.findMany({ where: { status: { in: ["PAGO", "EM_EXPEDICAO", "EM_ENTREGA"] } }, include: { cliente: true }, orderBy: { criadoEm: "desc" } }),
    prisma.user.findMany({ where: { roles: { some: { role: { slug: "motorista_atacado" } } } }, orderBy: { name: "asc" } }),
    prisma.atacadoEntrega.findMany({ include: { pedido: { include: { cliente: true } }, motorista: true }, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Entregas Atacado" description="Criacao de entregas e acompanhamento dos motoristas." />
      <Card>
        <CardHeader className="border-b bg-muted/20"><CardTitle>Nova entrega</CardTitle></CardHeader>
        <CardContent>
          <form action={createEntregaAction} className="grid gap-4 md:grid-cols-4">
            <select name="pedidoId" className="form-select" required>
              <option value="">Pedido</option>
              {pedidos.map((pedido) => <option key={pedido.id} value={pedido.id}>{pedido.numero} - {pedido.cliente.nome}</option>)}
            </select>
            <select name="motoristaId" className="form-select">
              <option value="">Motorista</option>
              {motoristas.map((motorista) => <option key={motorista.id} value={motorista.id}>{motorista.name}</option>)}
            </select>
            <select name="tipo" className="form-select" defaultValue="ENTREGA_PROPRIA">
              <option value="ENTREGA_PROPRIA">Entrega propria</option>
              <option value="TRANSPORTADORA">Transportadora</option>
              <option value="RETIRADA">Retirada</option>
            </select>
            <Input name="endereco" placeholder="Endereco" />
            <Button className="md:col-span-4 md:justify-self-end" type="submit">Criar entrega</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="border-b bg-muted/20"><CardTitle>Entregas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Motorista</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {entregas.map((entrega) => (
                <TableRow key={entrega.id}>
                  <TableCell className="font-semibold">{entrega.pedido.numero}</TableCell>
                  <TableCell>{entrega.pedido.cliente.nome}</TableCell>
                  <TableCell>{entrega.motorista?.name ?? "-"}</TableCell>
                  <TableCell>{entrega.tipo.replace("_", " ")}</TableCell>
                  <TableCell><AtacadoStatusBadge status={entrega.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

