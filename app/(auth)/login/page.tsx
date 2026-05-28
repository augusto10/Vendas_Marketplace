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
  const loginBgUrl = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=2400&q=80";

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-8">
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBgUrl}), url('/images/login-marketplace-bg.jpg')` }}
      />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(8,13,21,0.76),rgba(8,13,21,0.52))]" />
      <div className="relative z-20 flex w-full max-w-[440px] flex-col items-center gap-6 text-center">
        <div className="text-white">
          <h1 className="font-title text-3xl font-semibold tracking-tight md:text-4xl">Gestao de vendas Marketplace</h1>
        </div>
        <Card className="w-full border-white/20 bg-background/95 text-left shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-4">
            <div className="mb-2 grid h-11 w-11 place-items-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <CardTitle className="text-2xl">Acessar painel</CardTitle>
            <p className="text-sm text-muted-foreground">Entre com suas credenciais para continuar.</p>
          </CardHeader>
          <CardContent>
            <LoginForm redirectTo={redirectTo} hasInitialError={Boolean(params.error)} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
