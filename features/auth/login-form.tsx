"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ redirectTo, hasInitialError }: { redirectTo: string; hasInitialError: boolean }) {
  const [error, setError] = useState(hasInitialError);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (submitting) return;
        const formData = new FormData(event.currentTarget);
        setError(false);
        setSubmitting(true);

        try {
          const result = await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirect: false
          });

          if (!result?.ok) {
            setError(true);
            setSubmitting(false);
            return;
          }

          window.location.assign(redirectTo);
        } catch {
          setError(true);
          setSubmitting(false);
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Credenciais invalidas ou usuario desativado.</span>
        </div>
      ) : null}
      <Button className="h-11 w-full" type="submit" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {submitting ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
