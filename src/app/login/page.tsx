import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import { LoginForm } from "@/components/login-form";
import { auth, USE_MOCKS } from "@/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-primary">
            <Building2 className="size-6 text-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[1.5px] text-text-soft">ICC Finance</div>
            <div className="mt-1 inline-block rounded bg-primary px-2.5 py-0.5 text-lg font-extrabold text-white">
              GESTION RH
            </div>
          </div>
          <p className="text-sm text-text-soft">Outil interne de gestion RH / IT du réseau.</p>
        </div>
        <LoginForm useMocks={USE_MOCKS} />
      </div>
    </div>
  );
}
