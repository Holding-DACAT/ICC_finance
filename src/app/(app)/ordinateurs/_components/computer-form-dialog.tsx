"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { computerFormSchema, type ComputerFormValues } from "@/lib/validations/computer";
import { createComputer, updateComputer } from "../actions";
import type { ComputerDTO, MemberOption } from "../types";

const NONE = "__none__";

interface ComputerFormDialogProps {
  memberOptions: MemberOption[];
  computer?: ComputerDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormValues(c: ComputerDTO | null | undefined): ComputerFormValues {
  return {
    name: c?.name ?? "",
    model: c?.model ?? "",
    serialNumber: c?.serialNumber ?? "",
    registrationDate: c?.registrationDate ? c.registrationDate.slice(0, 10) : "",
    lastSyncDate: c?.lastSyncDate ? c.lastSyncDate.slice(0, 10) : "",
    diskFreePct: c?.diskFreePct != null ? String(c.diskFreePct) : "0",
    licenseTier: c?.licenseTier ?? "",
    source: c?.source ?? "",
    assignedMemberId: c?.assignedMemberId ?? "",
  };
}

export function ComputerFormDialog({
  memberOptions,
  computer,
  open,
  onOpenChange,
}: ComputerFormDialogProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(computer);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComputerFormValues>({
    resolver: zodResolver(computerFormSchema),
    defaultValues: toFormValues(computer),
  });

  // L'ouverture est pilotée par le parent (clic « Éditer ») : Radix n'appelle pas
  // onOpenChange lors d'un changement programmatique de `open`, donc on réinitialise
  // le formulaire via un effet observant `open`/`computer`.
  useEffect(() => {
    if (open) {
      reset(toFormValues(computer));
      setServerError(null);
    }
  }, [open, computer, reset]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = isEdit && computer
      ? await updateComputer(computer.id, values)
      : await createComputer(values);
    if (result.ok) {
      onOpenChange(false);
      router.refresh();
    } else {
      setServerError(result.error ?? "Une erreur est survenue.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le poste" : "Ajouter un poste"}</DialogTitle>
          <DialogDescription>Informations du poste informatique.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nom *" error={errors.name?.message}>
            <Input {...register("name")} placeholder="DESKTOP-XXXX" />
          </Field>
          <Field label="N° de série *" error={errors.serialNumber?.message}>
            <Input {...register("serialNumber")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Modèle *" error={errors.model?.message}>
              <Input {...register("model")} />
            </Field>
          </div>

          <Field label="Enregistrement *" error={errors.registrationDate?.message}>
            <Input type="date" {...register("registrationDate")} />
          </Field>
          <Field label="Dernière synchro" error={errors.lastSyncDate?.message}>
            <Input type="date" {...register("lastSyncDate")} />
          </Field>

          <Field label="Espace disque libre (%)" error={errors.diskFreePct?.message}>
            <Input type="number" min="0" max="100" {...register("diskFreePct")} />
          </Field>
          <Field label="Niveau de licence" error={errors.licenseTier?.message}>
            <Controller
              control={control}
              name="licenseTier"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Aucun</SelectItem>
                    <SelectItem value="SILVER">Silver</SelectItem>
                    <SelectItem value="GOLD">Gold</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field label="Source" error={errors.source?.message}>
            <Input {...register("source")} placeholder="Intune, agent de parc, manuel…" />
          </Field>
          <Field label="Utilisateur attribué">
            <Controller
              control={control}
              name="assignedMemberId"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Non attribué" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Non attribué (libre)</SelectItem>
                    {memberOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          {serverError ? (
            <p className="col-span-full text-sm font-semibold text-state-danger">{serverError}</p>
          ) : null}

          <div className="col-span-full mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="size-4" />
              {isEdit ? "Enregistrer" : "Ajouter le poste"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <span className="text-[11px] text-state-danger">{error}</span> : null}
    </div>
  );
}
