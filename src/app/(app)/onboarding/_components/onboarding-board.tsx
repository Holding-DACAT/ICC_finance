"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KanbanSquare, Plus, UserPlus } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OnboardingCard } from "@/lib/onboarding";
import { moveOnboardingCard, startOnboarding } from "../actions";

interface OnboardingBoardProps {
  columns: string[];
  cards: OnboardingCard[];
  eligibleMembers: { id: string; name: string }[];
  canWrite: boolean;
}

export function OnboardingBoard({
  columns,
  cards,
  eligibleMembers,
  canWrite,
}: OnboardingBoardProps) {
  const router = useRouter();
  const [items, setItems] = useState(cards);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Resynchronise après un revalidate / refresh serveur.
  useEffect(() => setItems(cards), [cards]);

  const doneColumnIndex = columns.length - 1;

  function move(cardId: string, targetCol: number) {
    const card = items.find((c) => c.id === cardId);
    if (!card || card.columnIndex === targetCol) return;
    setError(null);
    // Mise à jour optimiste.
    setItems((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, columnIndex: targetCol } : c)),
    );
    startTransition(async () => {
      const res = await moveOnboardingCard(cardId, targetCol);
      if (!res.ok) {
        setError(res.error ?? "Échec du déplacement.");
        setItems(cards); // rollback
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-soft">
          {canWrite
            ? "Glissez-déposez une carte d'une colonne à l'autre pour faire avancer l'intégration."
            : "Vue en lecture seule du parcours d'intégration."}
        </p>
        {canWrite ? (
          <StartOnboardingButton eligibleMembers={eligibleMembers} />
        ) : null}
      </div>

      {error ? <p className="text-sm font-semibold text-state-danger">{error}</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {columns.map((label, colIndex) => {
          const colCards = items.filter((c) => c.columnIndex === colIndex);
          const isDone = colIndex === doneColumnIndex;
          return (
            <div
              key={label}
              onDragOver={(e) => {
                if (!canWrite || !dragId) return;
                e.preventDefault();
                setOverCol(colIndex);
              }}
              onDragLeave={() => setOverCol((c) => (c === colIndex ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                if (canWrite && dragId) move(dragId, colIndex);
                setDragId(null);
                setOverCol(null);
              }}
              className={cn(
                "flex min-h-[140px] flex-col rounded-xl border border-border bg-card p-2 transition-colors",
                overCol === colIndex && "border-state-success/70 bg-brand-card-soft/40",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2 px-1.5 pt-1">
                <div className="flex items-center gap-1.5 text-[12px] font-bold">
                  {isDone ? (
                    <CheckCircle2 className="size-[15px] text-state-success" />
                  ) : (
                    <KanbanSquare className="size-[15px] text-text-soft" />
                  )}
                  <span className={cn(isDone && "text-state-success")}>{label}</span>
                </div>
                <span className="grid size-5 place-items-center rounded-full bg-brand-card-soft text-[10.5px] font-bold text-text-soft">
                  {colCards.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2">
                {colCards.map((card) => (
                  <article
                    key={card.id}
                    draggable={canWrite}
                    onDragStart={() => setDragId(card.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    className={cn(
                      "rounded-lg border border-border bg-background p-2.5 shadow-sm transition-opacity",
                      canWrite && "cursor-grab active:cursor-grabbing",
                      dragId === card.id && "opacity-50",
                      isPending && "pointer-events-none",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar first={card.firstName} last={card.lastName} active={card.active} />
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-bold">
                          {card.lastName} {card.firstName}
                        </div>
                        <div className="truncate text-[11px] text-text-soft">
                          {card.functionTitle}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 space-y-0.5 text-[11px] text-text-soft">
                      {card.agencyName ? (
                        <div className="truncate">🏢 {card.agencyName}</div>
                      ) : null}
                      <div>📅 Arrivée le {formatDate(card.arrivalDate)}</div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-state-success"
                          style={{
                            width: `${card.totalSteps ? (card.doneSteps / card.totalSteps) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10.5px] text-text-soft">
                        {card.doneSteps}/{card.totalSteps}
                      </span>
                    </div>
                  </article>
                ))}

                {colCards.length === 0 ? (
                  <div className="grid flex-1 place-items-center rounded-lg border border-dashed border-border/60 py-4 text-[11px] text-text-faint">
                    —
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StartOnboardingButton({
  eligibleMembers,
}: {
  eligibleMembers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!memberId) {
      setError("Sélectionnez un membre.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await startOnboarding(memberId);
      if (!res.ok) {
        setError(res.error ?? "Échec du démarrage.");
        return;
      }
      setOpen(false);
      setMemberId("");
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Démarrer un onboarding
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5" /> Démarrer un onboarding
            </DialogTitle>
            <DialogDescription>
              Lance le parcours d&apos;intégration d&apos;un nouveau collaborateur.
            </DialogDescription>
          </DialogHeader>

          {eligibleMembers.length === 0 ? (
            <p className="text-sm text-text-soft">
              Tous les membres actifs ont déjà un onboarding.
            </p>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Collaborateur</label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un membre" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error ? <p className="text-sm font-semibold text-state-danger">{error}</p> : null}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={isPending || eligibleMembers.length === 0}
            >
              {isPending ? "Démarrage…" : "Démarrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
