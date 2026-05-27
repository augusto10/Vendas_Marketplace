import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const params = await searchParams;
  const redirectTo = params.callbackUrl?.startsWith("/") && params.callbackUrl !== "/" ? params.callbackUrl : "/dashboard";

  return (
    <main
      className="grid min-h-screen place-items-center bg-cover bg-center px-4 py-8"
      style={{ backgroundImage: "linear-gradient(rgba(8, 13, 21, 0.26), rgba(8, 13, 21, 0.44)), url('/images/login-marketplace-bg.jfif')" }}
    >
      <Card className="w-full max-w-md border-white/20 bg-background/95 shadow-2xl backdrop-blur">
        <CardHeader>
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">Gestao de vendas Marketplace</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm redirectTo={redirectTo} hasInitialError={Boolean(params.error)} />
        </CardContent>
      </Card>
    </main>
  );
}
