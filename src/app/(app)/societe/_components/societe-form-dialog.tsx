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
import { companyFormSchema, type CompanyFormValues } from "@/lib/validations/company";
import { createCompany, updateCompany } from "../actions";
import type { MemberOption, SocieteDTO } from "../data";

interface SocieteFormDialogProps {
  memberOptions: MemberOption[];
  societe?: SocieteDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormValues(s: SocieteDTO | null | undefined): CompanyFormValues {
  return {
    name: s?.name ?? "",
    legalForm: s?.legalForm ?? "",
    siren: s?.siren ?? "",
    oriasNumber: s?.oriasNumber ?? "",
    address: s?.address ?? "",
    phone: s?.phone ?? "",
    email: s?.email ?? "",
    rcProInsurer: s?.rcProInsurer ?? "",
    rcProPolicy: s?.rcProPolicy ?? "",
    rcProExpiry: s?.rcProExpiry ? s.rcProExpiry.slice(0, 10) : "",
    guaranteeAmount: s?.guaranteeAmount != null ? String(s.guaranteeAmount) : "",
    guaranteeExpiry: s?.guaranteeExpiry ? s.guaranteeExpiry.slice(0, 10) : "",
    sharePointUrl: s?.sharePointUrl ?? "",
    directorIds: s?.directors.map((d) => d.id) ?? [],
  };
}

export function SocieteFormDialog({
  memberOptions,
  societe,
  open,
  onOpenChange,
}: SocieteFormDialogProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(societe);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: toFormValues(societe),
  });

  useEffect(() => {
    if (open) {
      reset(toFormValues(societe));
      setServerError(null);
    }
  }, [open, societe, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result =
      isEdit && societe ? await updateCompany(societe.id, values) : await createCompany(values);
    if (result.ok) {
      onOpenChange(false);
      router.refresh();
    } else {
      setServerError(result.error ?? "Une erreur est survenue.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la société" : "Créer une société"}</DialogTitle>
          <DialogDescription>
            Raison sociale, informations juridiques, assurances et direction.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Raison sociale *" error={errors.name?.message}>
            <Input {...register("name")} placeholder="Ex. ICC Pays Basque" />
          </Field>
          <Field label="Forme juridique" error={errors.legalForm?.message}>
            <Input {...register("legalForm")} placeholder="SAS, SARL…" />
          </Field>

          <Field label="SIREN" error={errors.siren?.message}>
            <Input {...register("siren")} />
          </Field>
          <Field label="N° ORIAS" error={errors.oriasNumber?.message}>
            <Input {...register("oriasNumber")} />
          </Field>

          <Field label="Adresse" error={errors.address?.message}>
            <Input {...register("address")} />
          </Field>
          <Field label="Téléphone" error={errors.phone?.message}>
            <Input {...register("phone")} />
          </Field>

          <Field label="Adresse mail" error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </Field>
          <Field label="Lien SharePoint" error={errors.sharePointUrl?.message}>
            <Input {...register("sharePointUrl")} placeholder="https://…" />
          </Field>

          {/* --- RC Pro --- */}
          <SectionHeading>RC Pro</SectionHeading>
          <Field label="Assureur" error={errors.rcProInsurer?.message}>
            <Input {...register("rcProInsurer")} />
          </Field>
          <Field label="N° police / contrat" error={errors.rcProPolicy?.message}>
            <Input {...register("rcProPolicy")} />
          </Field>
          <Field label="Échéance" error={errors.rcProExpiry?.message}>
            <Input type="date" {...register("rcProExpiry")} />
          </Field>

          {/* --- Garantie financière --- */}
          <SectionHeading>Garantie financière</SectionHeading>
          <Field label="Montant (€)" error={errors.guaranteeAmount?.message}>
            <Input inputMode="numeric" {...register("guaranteeAmount")} />
          </Field>
          <Field label="Échéance" error={errors.guaranteeExpiry?.message}>
            <Input type="date" {...register("guaranteeExpiry")} />
          </Field>

          {/* Directeur(s) / gérant(s) */}
          <div className="col-span-full">
            <Label>Directeur(s) / gérant(s)</Label>
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
              {isEdit ? "Enregistrer" : "Créer la société"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full mt-2 border-t border-border pt-3 text-[11px] font-extrabold uppercase tracking-wide text-primary">
      {children}
    </div>
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
