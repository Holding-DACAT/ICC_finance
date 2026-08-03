"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectOption } from "@/lib/pilotage";
import { saveObjective } from "../actions";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const ANNUAL = "__annual__";

interface ObjectiveDialogProps {
  agencies: SelectOption[];
  collaborators: SelectOption[];
  defaultYear: number;
}

export function ObjectiveDialog({ agencies, collaborators, defaultYear }: ObjectiveDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [level, setLevel] = useState<"GLOBAL" | "AGENCY" | "COLLABORATOR">("GLOBAL");
  const [agencyId, setAgencyId] = useState<string>("");
  const [collaboratorId, setCollaboratorId] = useState<string>("");
  const [year, setYear] = useState(String(defaultYear));
  const [month, setMonth] = useState<string>(ANNUAL);
  const [targetCases, setTargetCases] = useState("");
  const [targetRevenue, setTargetRevenue] = useState("");

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveObjective({
        level,
        agencyId: agencyId || null,
        collaboratorId: collaboratorId || null,
        year: Number(year),
        month: month === ANNUAL ? null : Number(month),
        targetCases: Number(targetCases || 0),
        targetRevenue: Number(targetRevenue || 0),
      });
      if (!res.ok) {
        setError(res.error ?? "Erreur.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-black/20 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-black/30">
          <Target className="size-4" /> Définir un objectif
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="size-5 text-primary" /> Objectif commercial
          </DialogTitle>
          <DialogDescription>
            Fixez une cible (nombre de dossiers et CA) pour un périmètre et une période.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Périmètre</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GLOBAL">Réseau (toutes agences)</SelectItem>
                <SelectItem value="AGENCY">Une agence</SelectItem>
                <SelectItem value="COLLABORATOR">Un collaborateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(level === "AGENCY" || level === "COLLABORATOR") && (
            <div className="grid gap-2">
              <Label>Agence</Label>
              <Select value={agencyId} onValueChange={setAgencyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une agence" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {level === "COLLABORATOR" && (
            <div className="grid gap-2">
              <Label>Collaborateur</Label>
              <Select value={collaboratorId} onValueChange={setCollaboratorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un collaborateur" />
                </SelectTrigger>
                <SelectContent>
                  {collaborators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="obj-year">Année</Label>
              <Input
                id="obj-year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Mois</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANNUAL}>Année entière</SelectItem>
                  {MONTHS.map((label, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="obj-cases">Objectif dossiers</Label>
              <Input
                id="obj-cases"
                type="number"
                min={0}
                value={targetCases}
                onChange={(e) => setTargetCases(e.target.value)}
                placeholder="ex. 25"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="obj-ca">Objectif CA (€)</Label>
              <Input
                id="obj-ca"
                type="number"
                min={0}
                value={targetRevenue}
                onChange={(e) => setTargetRevenue(e.target.value)}
                placeholder="ex. 60000"
              />
            </div>
          </div>

          {error ? <p className="text-sm font-medium text-state-danger">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer l'objectif"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
