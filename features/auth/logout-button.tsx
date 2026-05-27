"use client";

import { useTransition } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          void signOut({ redirect: false }).then(() => {
            window.location.assign("/login");
          });
        });
      }}
    >
      {pending ? "Saindo" : "Sair"}
    </Button>
  );
}
