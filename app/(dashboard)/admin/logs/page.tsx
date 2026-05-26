import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Logs de auditoria</h1>
        <p className="text-sm text-muted-foreground">Trilha para acoes administrativas e operacionais sensiveis.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Eventos recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Acao</TableHead>
                <TableHead>Entidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.createdAt.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.entity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
