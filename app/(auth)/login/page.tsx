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
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(10,14,22,0.82),rgba(10,14,22,0.58))]" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top,_rgba(255,174,47,0.15),_transparent_35%)]" />
      <div className="relative z-20 flex w-full max-w-[480px] flex-col items-center gap-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Marketplace Vendas
        </div>
        <div className="space-y-3 text-white">
          <h1 className="font-title text-3xl font-semibold tracking-tight md:text-5xl">Gestao de vendas Marketplace</h1>
          <p className="mx-auto max-w-lg text-sm leading-6 text-white/75 md:text-base">
            Acesso centralizado para operar com mais clareza, velocidade e controle.
          </p>
        </div>
        <Card className="w-full border-white/15 bg-card/95 text-left shadow-[0_28px_70px_-38px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <CardHeader className="pb-4">
            <div className="mb-2 grid h-12 w-12 place-items-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
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
