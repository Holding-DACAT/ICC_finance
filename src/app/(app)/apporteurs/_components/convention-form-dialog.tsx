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
import {
  CONVENTION_STATUS_LABELS,
  REMUNERATION_BASE_LABELS,
  REMUNERATION_TYPE_LABELS,
} from "@/lib/labels";
import {
  conventionFormSchema,
  conventionStatuses,
  remunerationBases,
  remunerationTypes,
  type ConventionFormValues,
} from "@/lib/validations/apporteur";
import { createConvention, updateConvention } from "../actions";
import { Field } from "./form-fields";
import type { CompanyOption, ConventionDTO } from "../types";

interface ConventionFormDialogProps {
  apporteurId: string;
  apporteurName: string;
  companies: CompanyOption[];
  convention?: ConventionDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NONE = "__aucune__";

function money(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value).replace(".", ",");
}

function toFormValues(
  apporteurId: string,
  convention: ConventionDTO | null | undefined,
): ConventionFormValues {
  return {
    apporteurId,
    number: convention?.number ?? "",
    requestedBy: convention?.requestedBy ?? "",
    signatureStatus: convention?.signatureStatus ?? "A_FAIRE",
    conventionDate: convention?.conventionDate ? convention.conventionDate.slice(0, 10) : "",
    kbisDate: convention?.kbisDate ? convention.kbisDate.slice(0, 10) : "",
    holderName: convention?.holderName ?? "",
    address: convention?.address ?? "",
    postalCode: convention?.postalCode ?? "",
    city: convention?.city ?? "",
    endDate: convention?.endDate ? convention.endDate.slice(0, 10) : "",
    companyId: convention?.companyId ?? "",
    notes: convention?.notes ?? "",
    remunerationType: convention?.remunerationType ?? "POURCENTAGE",
    remunerationRate:
      convention?.remunerationRate != null
        ? String(Math.round(convention.remunerationRate * 1000) / 10).replace(".", ",")
        : "",
    remunerationFixed: money(convention?.remunerationFixed),
    remunerationCap: money(convention?.remunerationCap),
    remunerationBase: convention?.remunerationBase ?? "COMMISSION",
  };
}

/**
 * Création / édition d'une convention d'apport : état de signature et **règle
 * de rétrocession structurée** (type, taux, assiette, plafond).
 */
export function ConventionFormDialog({
  apporteurId,
  apporteurName,
  companies,
  convention,
  open,
  onOpenChange,
}: ConventionFormDialogProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(convention);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConventionFormValues>({
    resolver: zodResolver(conventionFormSchema),
    defaultValues: toFormValues(apporteurId, convention),
  });

  useEffect(() => {
    if (open) {
      reset(toFormValues(apporteurId, convention));
      setServerError(null);
    }
  }, [open, apporteurId, convention, reset]);

  const remunerationType = watch("remunerationType");

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = isEdit
      ? await updateConvention(convention!.id, values)
      : await createConvention(values);
    if (!result.ok) {
      setServerError(result.error ?? "Enregistrement impossible.");
      return;
    }
    onOpenChange(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[760px] max-w-[96vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la convention" : "Nouvelle convention"} — {apporteurName}
          </DialogTitle>
          <DialogDescription>
            La règle de rétrocession sert au calcul de la ristourne attendue et au contrôle des
            écarts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="N° de convention">
              <Input {...register("number")} placeholder="ICCD-2026-001" />
            </Field>
            <Field label="Demandée par">
              <Input {...register("requestedBy")} placeholder="Prénom NOM" />
            </Field>
            <Field label="Statut de signature">
              <Controller
                control={control}
                name="signatureStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conventionStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {CONVENTION_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Société détentrice">
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
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Date de convention">
              <Input type="date" {...register("conventionDate")} />
            </Field>
            <Field label="Date du kbis">
              <Input type="date" {...register("kbisDate")} />
            </Field>
            <Field label="Date de fin" hint="Renseignée si résiliée">
              <Input type="date" {...register("endDate")} />
            </Field>
            <Field label="Titulaire">
              <Input {...register("holderName")} placeholder="NOM Prénom" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr,1fr,1fr]">
            <Field label="Adresse">
              <Input {...register("address")} />
            </Field>
            <Field label="Code postal">
              <Input {...register("postalCode")} />
            </Field>
            <Field label="Ville">
              <Input {...register("city")} />
            </Field>
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 text-[12.5px] font-bold">Règle de rétrocession</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="Type">
                <Controller
                  control={control}
                  name="remunerationType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {remunerationTypes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {REMUNERATION_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              {remunerationType === "POURCENTAGE" ? (
                <>
                  <Field label="Taux (%)" error={errors.remunerationRate?.message}>
                    <Input {...register("remunerationRate")} inputMode="decimal" placeholder="30" />
                  </Field>
                  <Field label="Assiette">
                    <Controller
                      control={control}
                      name="remunerationBase"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {remunerationBases.map((b) => (
                              <SelectItem key={b} value={b}>
                                {REMUNERATION_BASE_LABELS[b]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                </>
              ) : null}

              {remunerationType === "FORFAIT" ? (
                <Field label="Forfait TTC (€)" error={errors.remunerationFixed?.message}>
                  <Input {...register("remunerationFixed")} inputMode="decimal" placeholder="500" />
                </Field>
              ) : null}

              {remunerationType !== "AUCUNE" ? (
                <Field
                  label="Plafond TTC (€)"
                  hint="Vide = non plafonnée"
                  error={errors.remunerationCap?.message}
                >
                  <Input {...register("remunerationCap")} inputMode="decimal" placeholder="500" />
                </Field>
              ) : null}
            </div>
          </div>

          <Field label="Notes">
            <Textarea {...register("notes")} rows={2} />
          </Field>

          {serverError ? (
            <p className="text-[12.5px] font-semibold text-state-danger">{serverError}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer la convention"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
