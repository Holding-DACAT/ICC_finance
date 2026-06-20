"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  KanbanSquare,
  Plus,
  Settings2,
  Trash2,
  UserPlus,
} from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OnboardingCard } from "@/lib/onboarding";
import { MemberDetailSheet } from "@/app/(app)/employes/_components/member-detail-sheet";
import { MemberFormDialog } from "@/app/(app)/employes/_components/member-form-dialog";
import type { AgencyOption, MemberDTO } from "@/app/(app)/employes/types";
import { moveOnboardingCard, saveOnboardingStages } from "../actions";

interface OnboardingBoardProps {
  stages: string[];
  columns: string[];
  cards: OnboardingCard[];
  canWrite: boolean;
  /** Fiches complètes des membres, pour ouverture/édition depuis une carte. */
  members: MemberDTO[];
  agencies: AgencyOption[];
  canEditMembers: boolean;
}

export function OnboardingBoard({
  stages,
  columns,
  cards,
  canWrite,
  members,
  agencies,
  canEditMembers,
}: OnboardingBoardProps) {
  const router = useRouter();
  const [items, setItems] = useState(cards);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fiche membre ouverte depuis une carte (consultation + édition).
  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const [detailMember, setDetailMember] = useState<MemberDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formMember, setFormMember] = useState<MemberDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  function openMemberDetail(memberId: string) {
    const member = membersById.get(memberId);
    if (!member) return;
    setDetailMember(member);
    setDetailOpen(true);
  }

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
          <div className="flex items-center gap-2">
            <ManageStagesButton stages={stages} />
            <Button
              size="sm"
              onClick={() => {
                setFormMember(null);
                setFormOpen(true);
              }}
            >
              <UserPlus className="size-4" /> Créer un collaborateur
            </Button>
          </div>
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
                    onClick={() => {
                      // Un drag réel supprime le click ; on garde un garde-fou.
                      if (!dragId) openMemberDetail(card.memberId);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openMemberDetail(card.memberId);
                      }
                    }}
                    title="Ouvrir la fiche du membre"
                    className={cn(
                      "rounded-lg border border-border bg-background p-2.5 shadow-sm transition-opacity hover:border-primary/50",
                      canWrite ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
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

      <MemberDetailSheet
        member={detailMember}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={
          canEditMembers
            ? (m) => {
                setDetailOpen(false);
                setFormMember(m);
                setFormOpen(true);
              }
            : undefined
        }
      />
      <MemberFormDialog
        agencies={agencies}
        member={formMember}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}

function ManageStagesButton({ stages }: { stages: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(stages);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Réinitialise le brouillon à l'ouverture.
  useEffect(() => {
    if (open) {
      setDraft(stages);
      setError(null);
    }
  }, [open, stages]);

  function setLabel(index: number, value: string) {
    setDraft((prev) => prev.map((s, i) => (i === index ? value : s)));
  }
  function remove(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }
  function add() {
    setDraft((prev) => [...prev, ""]);
  }
  function moveStage(index: number, dir: -1 | 1) {
    setDraft((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function submit() {
    const cleaned = draft.map((s) => s.trim());
    if (cleaned.some((s) => s === "")) {
      setError("Les libellés ne peuvent pas être vides.");
      return;
    }
    if (cleaned.length === 0) {
      setError("Au moins une étape est requise.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await saveOnboardingStages(cleaned);
      if (!res.ok) {
        setError(res.error ?? "Échec de l'enregistrement.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="size-4" /> Gérer les étapes
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-5" /> Étapes du kanban
            </DialogTitle>
            <DialogDescription>
              Ajoutez, renommez, réordonnez ou supprimez les étapes d&apos;intégration. Les
              onboardings en cours sont réalignés automatiquement.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {draft.map((label, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="w-5 shrink-0 text-center text-[11px] font-bold text-text-faint">
                  {index + 1}
                </span>
                <Input
                  value={label}
                  onChange={(e) => setLabel(index, e.target.value)}
                  placeholder="Libellé de l'étape"
                  className="h-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0"
                  disabled={index === 0}
                  onClick={() => moveStage(index, -1)}
                  aria-label="Monter l'étape"
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0"
                  disabled={index === draft.length - 1}
                  onClick={() => moveStage(index, 1)}
                  aria-label="Descendre l'étape"
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 text-state-danger"
                  disabled={draft.length <= 1}
                  onClick={() => remove(index)}
                  aria-label="Supprimer l'étape"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={add} disabled={draft.length >= 12}>
            <Plus className="size-4" /> Ajouter une étape
          </Button>

          {error ? <p className="text-sm font-semibold text-state-danger">{error}</p> : null}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={submit} disabled={isPending}>
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
