"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ redirectTo, hasInitialError }: { redirectTo: string; hasInitialError: boolean }) {
  const [error, setError] = useState(hasInitialError);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(false);

        startTransition(() => {
          void signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirect: false
          }).then((result) => {
            if (!result?.ok) {
              setError(true);
              return;
            }
            window.location.assign(redirectTo);
          });
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue="master@empresa.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" defaultValue="Admin@12345" required />
      </div>
      {error ? <p className="text-sm text-destructive">Credenciais invalidas ou usuario desativado.</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Entrando" : "Entrar"}
      </Button>
    </form>
  );
}
