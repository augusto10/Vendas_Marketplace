import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createEntregaAction } from "@/features/atacado/actions";
import { EntregaActionButton } from "@/features/atacado/entrega-action-button";
import { EntregaConclusaoModal } from "@/features/atacado/entrega-conclusao-modal";
import { AtacadoStatusBadge } from "@/features/atacado/status";

export const dynamic = "force-dynamic";

export default async function AtacadoEntregasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const canDispatch = hasPermission(session.user, "atacado.separacao.update");
  const isDriverOnly = session.user.roles.includes("motorista_atacado") && !canDispatch;
  const [pedidos, motoristas, entregas] = await Promise.all([
    canDispatch
      ? prisma.atacadoPedido.findMany({ where: { status: { in: ["PAGO", "EM_EXPEDICAO", "EM_ENTREGA"] } }, include: { cliente: true }, orderBy: { criadoEm: "desc" } })
      : Promise.resolve([]),
    canDispatch
      ? prisma.user.findMany({ where: { roles: { some: { role: { slug: "motorista_atacado" } } } }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    prisma.atacadoEntrega.findMany({
      where: isDriverOnly ? { motoristaId: session.user.id } : undefined,
      include: { pedido: { include: { cliente: true } }, motorista: true },
      orderBy: [{ entregueEm: "desc" }, { createdAt: "desc" }]
    })
  ]);
  const pendentes = entregas.filter((entrega) => ["PENDENTE", "EM_ROTA"].includes(entrega.status));
  const concluidas = entregas.filter((entrega) => entrega.status === "ENTREGUE");
  const totaisPorMotorista = Array.from(concluidas.reduce((totais, entrega) => {
    const motorista = entrega.motorista?.name ?? "Sem motorista";
    totais.set(motorista, (totais.get(motorista) ?? 0) + 1);
    return totais;
  }, new Map<string, number>())).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entregas Atacado"
        description={isDriverOnly ? "Suas entregas em rota e o historico de entregas concluidas." : "Expedicao, acompanhamento e historico dos motoristas."}
      />
      {canDispatch ? (
        <Card>
          <CardHeader className="border-b bg-muted/20"><CardTitle>Nova entrega</CardTitle></CardHeader>
          <CardContent>
            <form action={createEntregaAction} className="grid gap-4 md:grid-cols-4">
              <select name="pedidoId" className="form-select" required>
                <option value="">Pedido</option>
                {pedidos.map((pedido) => <option key={pedido.id} value={pedido.id}>{pedido.numero} - {pedido.cliente.nome}</option>)}
              </select>
              <select name="motoristaId" className="form-select" required>
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
      ) : null}
      <Card>
        <CardHeader className="border-b bg-muted/20"><CardTitle>Entregas pendentes de aceite</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendentes.length ? pendentes.map((entrega) => (
                <TableRow key={entrega.id}>
                  <TableCell className="font-semibold">{entrega.pedido.numero}</TableCell>
                  <TableCell>{entrega.pedido.cliente.nome}</TableCell>
                  <TableCell>{entrega.motorista?.name ?? "-"}</TableCell>
                  <TableCell><AtacadoStatusBadge status={entrega.status} /></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {entrega.status === "PENDENTE" ? (
                        <EntregaActionButton
                          id={entrega.id}
                          label={canDispatch ? "Liberar" : "Aceitar entrega"}
                          endpoint={`/api/atacado/entregas/${entrega.id}/${canDispatch ? "liberar" : "aceitar"}`}
                        />
                      ) : null}
                      {isDriverOnly && entrega.status === "EM_ROTA" ? (
                        <EntregaConclusaoModal
                          entrega={{
                            id: entrega.id,
                            pedidoNumero: entrega.pedido.numero,
                            clienteNome: entrega.pedido.cliente.nome,
                            motoristaNome: entrega.motorista?.name ?? "-",
                            tipo: entrega.tipo,
                            endereco: entrega.endereco,
                            observacao: entrega.observacao,
                            status: entrega.status
                          }}
                        />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">Nenhuma entrega pendente de aceite.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="border-b bg-muted/20"><CardTitle>Em rota</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{entregas.filter((entrega) => entrega.status === "EM_ROTA").length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b bg-muted/20"><CardTitle>Concluidas</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{concluidas.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b bg-muted/20"><CardTitle>Motoristas com entregas</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{totaisPorMotorista.length}</div></CardContent>
        </Card>
      </div>
      {canDispatch ? (
        <Card>
          <CardHeader className="border-b bg-muted/20"><CardTitle>Entregas concluidas por motorista</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {totaisPorMotorista.length ? totaisPorMotorista.map(([motorista, total]) => (
              <div key={motorista} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="font-medium">{motorista}</span>
                <span className="text-lg font-semibold">{total}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">Nenhuma entrega concluida.</p>}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader className="border-b bg-muted/20"><CardTitle>Historico de entregas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Motorista</TableHead><TableHead>Status</TableHead><TableHead>Recebedor</TableHead><TableHead>Finalizada em</TableHead><TableHead>Foto</TableHead></TableRow></TableHeader>
            <TableBody>
              {entregas.map((entrega) => (
                <TableRow key={entrega.id}>
                  <TableCell className="font-semibold">{entrega.pedido.numero}</TableCell>
                  <TableCell>{entrega.pedido.cliente.nome}</TableCell>
                  <TableCell>{entrega.motorista?.name ?? "-"}</TableCell>
                  <TableCell><AtacadoStatusBadge status={entrega.status} /></TableCell>
                  <TableCell>{recebedorDaEntrega(entrega.observacao)}</TableCell>
                  <TableCell>{entrega.entregueEm?.toLocaleString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>
                    {entrega.reciboUrl ? <a href={entrega.reciboUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">Ver foto</a> : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function recebedorDaEntrega(observacao: string | null) {
  return observacao?.split("\n").find((linha) => linha.startsWith("Recebedor: "))?.replace("Recebedor: ", "") ?? "-";
}
