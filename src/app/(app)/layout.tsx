import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { auth } from "@/auth";
import { ROLE_LABELS } from "@/lib/rbac";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userName = session.user.name ?? session.user.email ?? "Utilisateur";
  const roleLabel = ROLE_LABELS[session.user.role] ?? "Utilisateur";

  return (
    <div className="flex min-h-screen">
      <AppSidebar userName={userName} roleLabel={roleLabel} role={session.user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* En-tête mobile (la barre latérale est masquée < md) */}
        <header className="flex items-center gap-2 border-b border-border bg-brand-sidebar px-4 py-3 md:hidden">
          <span className="rounded bg-primary px-2 py-px text-sm font-extrabold text-white">
            GESTION RH
          </span>
          <span className="ml-auto text-xs text-text-soft">{userName}</span>
        </header>
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
