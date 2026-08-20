"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { APPORTEUR_STATUS_LABELS } from "@/lib/labels";
import {
  apporteurFormSchema,
  apporteurStatuses,
  type ApporteurFormValues,
} from "@/lib/validations/apporteur";
import { createApporteur, updateApporteur } from "../actions";
import { Field, FormCheckbox } from "./form-fields";
import type { ApporteurDTO, CompanyOption } from "../types";

interface ApporteurFormDialogProps {
  companies: CompanyOption[];
  apporteur?: ApporteurDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NONE = "__aucune__";

function toFormValues(apporteur: ApporteurDTO | null | undefined): ApporteurFormValues {
  return {
    name: apporteur?.name ?? "",
    siren: apporteur?.siren ?? "",
    enseigne: apporteur?.enseigne ?? "",
    holderName: apporteur?.holderName ?? "",
    email: apporteur?.email ?? "",
    phone: apporteur?.phone ?? "",
    address: apporteur?.address ?? "",
    postalCode: apporteur?.postalCode ?? "",
    city: apporteur?.city ?? "",
    kbisDate: apporteur?.kbisDate ? apporteur.kbisDate.slice(0, 10) : "",
    ribReceived: apporteur?.ribReceived ?? false,
    status: apporteur?.status ?? "ACTIF",
    companyId: apporteur?.companyId ?? "",
    notes: apporteur?.notes ?? "",
  };
}

/** Création / édition d'une fiche apporteur (hors convention). */
export function ApporteurFormDialog({
  companies,
  apporteur,
  open,
  onOpenChange,
}: ApporteurFormDialogProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(apporteur);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApporteurFormValues>({
    resolver: zodResolver(apporteurFormSchema),
    defaultValues: toFormValues(apporteur),
  });

  useEffect(() => {
    if (open) {
      reset(toFormValues(apporteur));
      setServerError(null);
    }
  }, [open, apporteur, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = isEdit
      ? await updateApporteur(apporteur!.id, values)
      : await createApporteur(values);
    if (!result.ok) {
      setServerError(result.error ?? "Enregistrement impossible.");
      return;
    }
    onOpenChange(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[720px] max-w-[96vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'apporteur" : "Nouvel apporteur"}</DialogTitle>
          <DialogDescription>
            Identité et coordonnées de l&apos;apporteur. Aucune coordonnée bancaire n&apos;est
            stockée : seul l&apos;indicateur « RIB reçu » est conservé.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Nom / raison sociale" error={errors.name?.message}>
              <Input {...register("name")} placeholder="HOMEKARE" />
            </Field>
            <Field label="SIREN" error={errors.siren?.message} hint="9 chiffres">
              <Input {...register("siren")} inputMode="numeric" placeholder="490616281" />
            </Field>
            <Field label="Enseigne / réseau">
              <Input {...register("enseigne")} placeholder="ORPI, IAD, Century 21…" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Titulaire">
              <Input {...register("holderName")} placeholder="NOM Prénom" />
            </Field>
            <Field label="E-mail" error={errors.email?.message}>
              <Input {...register("email")} type="email" placeholder="contact@exemple.fr" />
            </Field>
            <Field label="Téléphone">
              <Input {...register("phone")} placeholder="05 61 00 00 00" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr,1fr,1fr]">
            <Field label="Adresse">
              <Input {...register("address")} placeholder="12 rue de l'Exemple" />
            </Field>
            <Field label="Code postal">
              <Input {...register("postalCode")} placeholder="31000" />
            </Field>
            <Field label="Ville">
              <Input {...register("city")} placeholder="Toulouse" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Date du kbis">
              <Input type="date" {...register("kbisDate")} />
            </Field>
            <Field label="Société de rattachement">
              <Controller
                control={control}
                name="companyId"
                render={({ field }) => (
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
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
                      {apporteurStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {APPORTEUR_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <FormCheckbox control={control} name="ribReceived" label="RIB reçu" />
          </div>

          <Field label="Notes">
            <Textarea {...register("notes")} rows={2} placeholder="Commentaire interne…" />
          </Field>

          {serverError ? (
            <p className="text-[12.5px] font-semibold text-state-danger">{serverError}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer l'apporteur"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
