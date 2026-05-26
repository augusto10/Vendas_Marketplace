import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { BarChart3, LockKeyhole, ShieldCheck } from "lucide-react";
import { signIn, auth } from "@/lib/auth/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const params = await searchParams;
  const redirectTo = params.callbackUrl?.startsWith("/") && params.callbackUrl !== "/" ? params.callbackUrl : "/dashboard";

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect("/login?error=credentials");
      }
      throw error;
    }
  }

  return (
    <main className="grid min-h-screen bg-background px-4 py-8 lg:grid-cols-[1fr_480px] lg:p-0">
      <section className="hidden min-h-screen flex-col justify-between border-r bg-card px-10 py-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">BI</div>
          <div>
            <div className="font-semibold">Marketplace BI</div>
            <div className="text-sm text-muted-foreground">Shopee, fiscal e financeiro</div>
          </div>
        </div>
        <div className="max-w-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            RBAC, auditoria e dados centralizados
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Gestao profissional para vendas, taxas, fiscal e conciliacao Shopee.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">Importe planilhas recorrentes, acompanhe indicadores por periodo e entregue relatórios financeiros e fiscais com controle de acesso.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["Financeiro", "Fiscal", "Operacao"].map((item) => (
            <div key={item} className="rounded-lg border bg-background p-4">
              <BarChart3 className="mb-3 h-5 w-5 text-primary" />
              <div className="text-sm font-medium">{item}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="grid min-h-screen place-items-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">Entrar no Marketplace BI</CardTitle>
          <p className="text-sm text-muted-foreground">Acesse dashboards, importacoes e relatorios.</p>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue="master@empresa.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" defaultValue="Admin@12345" required />
            </div>
            {params.error ? <p className="text-sm text-destructive">Credenciais invalidas ou usuario desativado.</p> : null}
            <Button className="w-full" type="submit">
              Entrar
            </Button>
            <p className="text-xs text-muted-foreground">Recuperacao de senha preparada para provedor de email/Supabase Auth.</p>
          </form>
        </CardContent>
      </Card>
      </section>
    </main>
  );
}
