import { SignUp } from "@clerk/nextjs";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Écran d'inscription (Clerk) — utilisé pour l'acceptation des invitations.
 * Les inscriptions libres doivent être restreintes côté tableau de bord Clerk
 * (« Restrict sign-ups ») : seuls les e-mails invités peuvent créer un compte.
 */
export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="grid size-12 place-items-center rounded-xl bg-primary">
          <Building2 className="size-6 text-white" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-text-soft">ICC Finance</div>
          <div className="mt-1 inline-block rounded bg-primary px-2.5 py-0.5 text-lg font-extrabold text-white">
            GESTION RH
          </div>
        </div>
        <p className="text-sm text-text-soft">Activation de votre compte sur invitation.</p>
      </div>
      <SignUp />
    </div>
  );
}
