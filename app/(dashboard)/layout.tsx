import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = {
    name: session.user.name,
    roles: session.user.roles,
    permissions: session.user.permissions
  };

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar user={user} />
      <div className="min-w-0 flex-1">
        <Topbar name={session.user.name} roles={session.user.roles} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
