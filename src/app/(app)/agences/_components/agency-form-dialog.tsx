"use client";

import { useState } from "react";
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
import { agencyFormSchema, type AgencyFormValues } from "@/lib/validations/agency";
import { createAgency, updateAgency } from "../actions";
import type { AgencyDTO, MemberOption } from "../types";

interface AgencyFormDialogProps {
  memberOptions: MemberOption[];
  agency?: AgencyDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormValues(a: AgencyDTO | null | undefined): AgencyFormValues {
  return {
    name: a?.name ?? "",
    type: a?.type ?? "FRANCHISE",
    // Les agences n'utilisent que ACTIF/INACTIF (statut « en cours » réservé aux membres).
    status: a?.status === "INACTIF" ? "INACTIF" : "ACTIF",
    legalName: a?.legalName ?? "",
    legalForm: a?.legalForm ?? "",
    siren: a?.siren ?? "",
    address: a?.address ?? "",
    phone: a?.phone ?? "",
    email: a?.email ?? "",
    oriasNumber: a?.oriasNumber ?? "",
    rcProInsurer: a?.rcProInsurer ?? "",
    rcProExpiry: a?.rcProExpiry ? a.rcProExpiry.slice(0, 10) : "",
    guaranteeAmount: a?.guaranteeAmount != null ? String(a.guaranteeAmount) : "",
    guaranteeExpiry: a?.guaranteeExpiry ? a.guaranteeExpiry.slice(0, 10) : "",
    sharePointUrl: a?.sharePointUrl ?? "",
    redevanceExcluded: a?.redevanceExcluded ?? false,
    directorIds: a?.directors.map((d) => d.id) ?? [],
  };
}

export function AgencyFormDialog({
  memberOptions,
  agency,
  open,
  onOpenChange,
}: AgencyFormDialogProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(agency);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AgencyFormValues>({
    resolver: zodResolver(agencyFormSchema),
    defaultValues: toFormValues(agency),
  });

  const handleOpenChange = (next: boolean) => {
    if (next) {
      reset(toFormValues(agency));
      setServerError(null);
    }
    onOpenChange(next);
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result =
      isEdit && agency ? await updateAgency(agency.id, values) : await createAgency(values);
    if (result.ok) {
      onOpenChange(false);
      router.refresh();
    } else {
      setServerError(result.error ?? "Une erreur est survenue.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'agence" : "Créer une agence"}</DialogTitle>
          <DialogDescription>Renseignez les informations de l&apos;agence.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nom *" error={errors.name?.message}>
            <Input {...register("name")} />
          </Field>
          <Field label="Type *" error={errors.type?.message}>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FRANCHISE">Franchise</SelectItem>
                    <SelectItem value="FILIALE">Filiale</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field label="Raison sociale" error={errors.legalName?.message}>
            <Input {...register("legalName")} />
          </Field>
          <Field label="Forme juridique" error={errors.legalForm?.message}>
            <Input {...register("legalForm")} placeholder="SAS, SARL…" />
          </Field>

          <Field label="SIREN" error={errors.siren?.message}>
            <Input {...register("siren")} />
          </Field>
          <Field label="Téléphone" error={errors.phone?.message}>
            <Input {...register("phone")} />
          </Field>

          <Field label="Adresse mail" error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </Field>

          <Field label="Statut">
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIF">Active</SelectItem>
                    <SelectItem value="INACTIF">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="N° ORIAS" error={errors.oriasNumber?.message}>
            <Input {...register("oriasNumber")} />
          </Field>

          <Field label="Adresse" error={errors.address?.message}>
            <Input {...register("address")} />
          </Field>
          <Field label="Lien SharePoint" error={errors.sharePointUrl?.message}>
            <Input {...register("sharePointUrl")} placeholder="https://…" />
          </Field>

          <Field label="RC Pro — assureur" error={errors.rcProInsurer?.message}>
            <Input {...register("rcProInsurer")} />
          </Field>
          <Field label="RC Pro — échéance" error={errors.rcProExpiry?.message}>
            <Input type="date" {...register("rcProExpiry")} />
          </Field>

          <Field label="Garantie financière (€)" error={errors.guaranteeAmount?.message}>
            <Input type="number" min="0" {...register("guaranteeAmount")} />
          </Field>
          <Field label="Garantie — échéance" error={errors.guaranteeExpiry?.message}>
            <Input type="date" {...register("guaranteeExpiry")} />
          </Field>

          {/* Directeur(s) */}
          <div className="col-span-full">
            <Label>Directeur(s)</Label>
            <Controller
              control={control}
              name="directorIds"
              render={({ field }) => (
                <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-popover p-2">
                  {memberOptions.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-text-soft">Aucun membre disponible.</p>
                  ) : (
                    memberOptions.map((m) => {
                      const checked = field.value.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-white/5"
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-[hsl(var(--primary))]"
                            checked={checked}
                            onChange={(e) =>
                              field.onChange(
                                e.target.checked
                                  ? [...field.value, m.id]
                                  : field.value.filter((id) => id !== m.id),
                              )
                            }
                          />
                          {m.name}
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            />
          </div>

          {/* Exclusion redevance */}
          <div className="col-span-full">
            <Controller
              control={control}
              name="redevanceExcluded"
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-text-soft">
                  <input
                    type="checkbox"
                    className="size-4 accent-[hsl(var(--primary))]"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  Exclure du calcul de redevance (« sans ICC Dev. »)
                </label>
              )}
            />
          </div>

          {serverError ? (
            <p className="col-span-full text-sm font-semibold text-state-danger">{serverError}</p>
          ) : null}

          <div className="col-span-full mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="size-4" />
              {isEdit ? "Enregistrer" : "Créer l'agence"}
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
