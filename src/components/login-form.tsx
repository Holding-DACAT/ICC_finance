"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function LoginForm({ useMocks }: { useMocks: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn(useMocks ? "mock" : "microsoft-entra-id", { callbackUrl: "/" });
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleSignIn} disabled={loading} className="w-full" size="lg">
        <LogIn className="size-4" />
        {useMocks ? "Se connecter (mode démo)" : "Se connecter avec Microsoft"}
      </Button>
      {useMocks ? (
        <p className="text-center text-xs text-text-soft">
          Mode démonstration : connexion sans mot de passe avec un compte administrateur.
        </p>
      ) : (
        <p className="text-center text-xs text-text-soft">
          Authentification unique via Microsoft Entra ID (Azure AD).
        </p>
      )}
    </div>
  );
}
