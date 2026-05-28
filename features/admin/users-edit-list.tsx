import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserAction } from "@/lib/services/admin-service";

type RoleOption = {
  name: string;
  slug: string;
};

type EditableUser = {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "DISABLED";
  roles: string[];
};

export function UsersEditList({ users, roles, canEditMaster }: { users: EditableUser[]; roles: RoleOption[]; canEditMaster: boolean }) {
  return (
    <div className="space-y-3">
      {users.map((user) => {
        const isMaster = user.roles.includes("master");
        const canEdit = canEditMaster || !isMaster;
        const selectedRole = user.roles.find((role) => roles.some((option) => option.slug === role)) ?? roles[0]?.slug ?? "";

        return (
          <form key={user.id} action={updateUserAction} className="grid gap-3 rounded-lg border bg-background/70 p-4 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.75)] lg:grid-cols-[1fr_1.2fr_180px_150px_180px_auto]">
            <input type="hidden" name="userId" value={user.id} />
            <div className="space-y-2">
              <Label htmlFor={`name-${user.id}`}>Nome</Label>
              <Input id={`name-${user.id}`} name="name" defaultValue={user.name} disabled={!canEdit} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`email-${user.id}`}>Email</Label>
              <Input id={`email-${user.id}`} name="email" type="email" defaultValue={user.email} disabled={!canEdit} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`role-${user.id}`}>Cargo</Label>
              <select
                id={`role-${user.id}`}
                name="role"
                defaultValue={selectedRole}
                disabled={!canEdit}
                className="form-select"
              >
                {roles.map((role) => (
                  <option key={role.slug} value={role.slug}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`status-${user.id}`}>Status</Label>
              <select
                id={`status-${user.id}`}
                name="status"
                defaultValue={user.status}
                disabled={!canEdit}
                className="form-select"
              >
                <option value="ACTIVE">Ativo</option>
                <option value="DISABLED">Desativado</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`password-${user.id}`}>Nova senha</Label>
              <Input id={`password-${user.id}`} name="password" type="password" placeholder="Manter atual" disabled={!canEdit} minLength={8} />
            </div>
            <Button className="self-end" type="submit" disabled={!canEdit}>
              Salvar
            </Button>
            {!canEdit ? <p className="text-xs text-muted-foreground lg:col-span-6">Somente Administrador Master pode editar este usuario.</p> : null}
          </form>
        );
      })}
    </div>
  );
}
