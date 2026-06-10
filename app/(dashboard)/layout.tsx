import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = {
    name: session.user.name,
    image: session.user.image,
    roles: session.user.roles,
    permissions: session.user.permissions
  };

  return (
    <div className="min-h-screen bg-transparent lg:flex">
      <Sidebar user={user} />
      <div className="min-w-0 flex-1">
        <Topbar name={session.user.name} image={session.user.image} roles={session.user.roles} permissions={session.user.permissions} />
        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 md:px-8 lg:px-10">
          <div className="page-shell">{children}</div>
        </main>
      </div>
    </div>
  );
}
