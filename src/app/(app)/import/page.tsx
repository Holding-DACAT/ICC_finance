import { Upload } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ImportClient } from "./_components/import-client";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role } = session.user;
  if (role !== "ADMIN" && role !== "RH") {
    redirect("/");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold">
          <Upload className="size-5 text-primary" /> Espace import
        </h1>
        <p className="text-sm text-text-soft">
          Intégrez le fichier « Liste du Réseau » (Excel ou CSV) pour alimenter la base des
          membres et des agences. Analysez d&apos;abord le fichier, vérifiez l&apos;aperçu, puis
          lancez l&apos;intégration.
        </p>
      </div>

      <ImportClient />
    </div>
  );
}
