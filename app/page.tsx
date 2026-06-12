import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";

export default async function HomePage() {
  const session = await auth();
  const user = session?.user ?? null;

  if (!user) redirect("/login");
  if (hasPermission(user, "dashboard.view")) redirect("/dashboard");
  if (hasPermission(user, "atacado.pedidos.create")) redirect("/atacado/pedidos");
  if (hasPermission(user, "atacado.separacao.view")) redirect("/atacado/separacao");
  if (hasPermission(user, "atacado.financeiro.view")) redirect("/atacado/financeiro");
  if (hasPermission(user, "atacado.entregas.view")) redirect("/atacado/entregas");

  redirect("/dashboard");
}
