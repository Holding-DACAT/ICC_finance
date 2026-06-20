"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { setAgenciesActive } from "@/app/(app)/agences/actions";

interface ActiveToggleButtonProps {
  /** Agences impactées : une seule pour une agence, toutes celles de la société sinon. */
  agencyIds: string[];
  /** État courant (actif = au moins une agence active). */
  active: boolean;
  /** Libellé de la cible, ex. « l'agence “Paris” » ou « la société “ICC SAS” ». */
  scopeLabel: string;
  /** Nombre de membres rattachés (affiché dans la confirmation). */
  memberCount: number;
  /** Nombre d'agences (affiché pour une société). */
  agencyCount?: number;
  /** Bouton compact icône seule (pour les colonnes d'actions). */
  iconOnly?: boolean;
  className?: string;
}

export function ActiveToggleButton({
  agencyIds,
  active,
  scopeLabel,
  memberCount,
  agencyCount,
  iconOnly = false,
  className,
}: ActiveToggleButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const next = !active;
  const verb = next ? "Activer" : "Désactiver";

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await setAgenciesActive(agencyIds, next);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Échec du changement de statut.");
      }
    });
  }

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          title={`${verb} ${scopeLabel}`}
          aria-label={`${verb} ${scopeLabel}`}
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className={cn(
            "grid size-8 place-items-center rounded-md transition-colors hover:bg-white/10",
            active ? "text-state-success hover:text-state-success" : "text-state-danger",
            className,
          )}
        >
          <Power className="size-4" />
        </button>
      ) : (
        <Button
          size="sm"
          variant={active ? "outline" : "default"}
          className={className}
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          title={`${verb} ${scopeLabel}`}
        >
          <Power className="size-3.5" /> {verb}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verb} {scopeLabel} ?
            </DialogTitle>
            <DialogDescription>
              {next ? (
                <>
                  {scopeLabel} sera réactivée
                  {agencyCount ? ` (${agencyCount} agence(s))` : ""}, ainsi que les membres
                  précédemment inactifs et non partis.
                </>
              ) : (
                <>
                  {scopeLabel} sera désactivée
                  {agencyCount ? ` (${agencyCount} agence(s))` : ""} et les{" "}
                  <strong>{memberCount} membre(s)</strong> rattaché(s) passeront également inactifs.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {error ? <p className="text-sm font-semibold text-state-danger">{error}</p> : null}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button
              size="sm"
              variant={next ? "default" : "destructive"}
              onClick={confirm}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-3.5" />}
              {verb}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
