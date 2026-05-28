"use client";

import { useMemo, useState } from "react";
import { Edit, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserForm } from "@/features/admin/user-form";
import { updateUserAction } from "@/lib/services/admin-service";

type UserRow = {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  status: "ACTIVE" | "DISABLED";
  roles: string[];
  createdAt: string;
  lastLoginAt: string;
};

type RoleOption = {
  name: string;
  slug: string;
};

export function UsersTable({
  data,
  roles,
  canEditMaster
}: {
  data: UserRow[];
  roles: RoleOption[];
  canEditMaster: boolean;
}) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const filteredData = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return data;
    return data.filter((user) =>
      [user.name, user.email, user.status, user.lastLoginAt, ...user.roles].some((value) => value.toLowerCase().includes(search))
    );
  }, [data, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuario, email ou perfil" className="pl-9" />
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)} disabled={!roles.length}>
          <Plus className="h-4 w-4" />
          Criar usuario
        </Button>
      </div>
      {filteredData.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Cargos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ultimo login</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <UserIdentity name={user.name} imageUrl={user.imageUrl} />
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role} className="border-primary/15 bg-primary/10 text-primary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={user.status} />
                </TableCell>
                <TableCell>{user.lastLoginAt}</TableCell>
                <TableCell>{user.createdAt}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState title="Nenhum usuario encontrado" description="Revise o termo buscado ou cadastre um novo acesso." />
      )}
      {createOpen ? (
        <Modal title="Criar usuario" onClose={() => setCreateOpen(false)}>
          <UserForm roles={roles} />
        </Modal>
      ) : null}
      {editingUser ? (
        <UserEditModal
          user={editingUser}
          roles={roles}
          canEditMaster={canEditMaster}
          onClose={() => setEditingUser(null)}
        />
      ) : null}
    </div>
  );
}

function UserEditModal({
  user,
  roles,
  canEditMaster,
  onClose
}: {
  user: UserRow;
  roles: RoleOption[];
  canEditMaster: boolean;
  onClose: () => void;
}) {
  const isMaster = user.roles.includes("master");
  const canEdit = canEditMaster || !isMaster;
  const selectedRole = user.roles.find((role) => roles.some((option) => option.slug === role)) ?? roles[0]?.slug ?? "";

  return (
    <Modal title="Editar usuario" onClose={onClose}>
      <form action={updateUserAction} encType="multipart/form-data" className="grid gap-4">
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="currentImageUrl" value={user.imageUrl ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`name-${user.id}`}>Nome</Label>
            <Input id={`name-${user.id}`} name="name" defaultValue={user.name} disabled={!canEdit} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`email-${user.id}`}>Email</Label>
            <Input id={`email-${user.id}`} name="email" type="email" defaultValue={user.email} disabled={!canEdit} required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`image-${user.id}`}>Foto</Label>
            <Input id={`image-${user.id}`} name="imageFile" type="file" accept="image/*" disabled={!canEdit} />
            {user.imageUrl ? <p className="text-xs text-muted-foreground">Envie uma nova imagem apenas se quiser substituir a foto atual.</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`role-${user.id}`}>Cargo</Label>
            <select id={`role-${user.id}`} name="role" defaultValue={selectedRole} disabled={!canEdit} className="form-select">
              {roles.map((role) => (
                <option key={role.slug} value={role.slug}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`status-${user.id}`}>Status</Label>
            <select id={`status-${user.id}`} name="status" defaultValue={user.status} disabled={!canEdit} className="form-select">
              <option value="ACTIVE">Ativo</option>
              <option value="DISABLED">Desativado</option>
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`password-${user.id}`}>Nova senha</Label>
            <Input id={`password-${user.id}`} name="password" type="password" placeholder="Manter atual" disabled={!canEdit} minLength={8} />
          </div>
        </div>
        {!canEdit ? <p className="text-sm text-muted-foreground">Somente Administrador Master pode editar este usuario.</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canEdit}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UserIdentity({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  return (
    <div className="flex items-center gap-3">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200" />
      ) : (
        <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {initials}
        </div>
      )}
      <span>{name}</span>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-lg border bg-card shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: UserRow["status"] }) {
  return (
    <Badge className={status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}>
      {status === "ACTIVE" ? "Ativo" : "Desativado"}
    </Badge>
  );
}
