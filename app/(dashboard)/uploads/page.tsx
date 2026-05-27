import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadForm } from "@/features/uploads/upload-form";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UploadsPage() {
  const uploads = await prisma.upload.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { uploadedBy: { select: { name: true } } }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Uploads" />
      <Card>
        <CardContent>
          <UploadForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historico de uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell>{upload.createdAt.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="max-w-[360px] truncate">{upload.originalName}</TableCell>
                  <TableCell>{upload.type}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        upload.status === "COMPLETED" && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
                        upload.status === "FAILED" && "bg-red-100 text-red-700 hover:bg-red-100",
                        upload.status === "PROCESSING" && "bg-amber-100 text-amber-700 hover:bg-amber-100",
                        upload.status === "PENDING" && "bg-muted text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {upload.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{upload.uploadedBy?.name ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
