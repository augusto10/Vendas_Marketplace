"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserAction } from "@/lib/services/admin-service";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

type UserFormProps = {
  roles: Array<{
    name: string;
    slug: string;
  }>;
};

export function UserForm({ roles }: UserFormProps) {
  const [state, action, pending] = useActionState(createUserAction, null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", role: roles[0]?.slug ?? "" }
  });

  return (
    <form action={action} className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input {...form.register("name")} placeholder="Novo usuario" />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input {...form.register("email")} type="email" placeholder="usuario@empresa.com" />
      </div>
      <div className="space-y-2">
        <Label>Cargo</Label>
        <select
          {...form.register("role")}
          className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!roles.length}
        >
          {roles.map((role) => (
            <option key={role.slug} value={role.slug}>
              {role.name}
            </option>
          ))}
        </select>
      </div>
      <Button className="self-end" type="submit" disabled={pending}>
        {pending ? "Criando" : "Criar usuario"}
      </Button>
      {state?.message ? <div className="md:col-span-4 rounded-md border bg-muted p-3 text-sm">{state.message}</div> : null}
    </form>
  );
}
