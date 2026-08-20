"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";

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
import { Field, FormCheckbox } from "./form-fields";
import { MONTH_LABELS } from "@/lib/apporteur";
import {
  PAYMENT_MODE_LABELS,
  VERSEMENT_STATUS_LABELS,
  VERSEMENT_TYPE_LABELS,
} from "@/lib/labels";
import {
  paymentModes,
  versementFormSchema,
  versementStatuses,
  versementTypes,
  type VersementFormValues,
} from "@/lib/validations/apporteur";
import { createVersement, searchActeloCases, updateVersement, type ActeloCaseOption } from "../actions";
import type { AgencyOption, ApporteurDTO, CompanyOption, VersementDTO } from "../types";

interface VersementFormDialogProps {
  apporteurs: ApporteurDTO[];
  companies: CompanyOption[];
  agencies: AgencyOption[];
  versement?: VersementDTO | null;
  /** Apporteur pré-sélectionné à la création depuis une fiche. */
  defaultApporteurId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NONE = "__aucun__";

function money(value: number | null): string {
  return value === null ? "" : String(value).replace(".", ",");
}

function toFormValues(
  versement: VersementDTO | null | undefined,
  defaultApporteurId?: string,
): VersementFormValues {
  return {
    apporteurId: versement?.apporteurId ?? defaultApporteurId ?? "",
    conventionId: versement?.conventionId ?? "",
    companyId: versement?.companyId ?? "",
    agencyId: versement?.agencyId ?? "",
    memberId: versement?.memberId ?? "",
    commercialName: versement?.commercialName ?? "",
    type: versement?.type ?? "RISTOURNE",
    year: String(versement?.year ?? new Date().getFullYear()),
    month: versement?.month ? String(versement.month) : "",
    dossierLabel: versement?.dossierLabel ?? "",
    acteloCaseId: versement?.acteloCaseId ?? "",
    amount: money(versement?.amount ?? null),
    commission: money(versement?.commission ?? null),
    fees: money(versement?.fees ?? null),
    paymentMode: versement?.paymentMode ?? "VIREMENT",
    paymentRef: versement?.paymentRef ?? "",
    invoiceReceived: versement?.invoiceReceived ?? false,
    paymentDate: versement?.paymentDate ? versement.paymentDate.slice(0, 10) : "",
    sirenKbis: versement?.sirenKbis ?? "",
    sirenInvoice: versement?.sirenInvoice ?? "",
    sirenVerified: versement?.sirenVerified ?? false,
    status: versement?.status ?? "A_VERSER",
    notes: versement?.notes ?? "",
  };
}

/** Formulaire de saisie d'un versement de ristourne (création et édition). */
export function VersementFormDialog({
  apporteurs,
  companies,
  agencies,
  versement,
  defaultApporteurId,
  open,
  onOpenChange,
}: VersementFormDialogProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [acteloResults, setActeloResults] = useState<ActeloCaseOption[] | null>(null);
  const [searching, startSearch] = useTransition();
  const isEdit = Boolean(versement);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VersementFormValues>({
    resolver: zodResolver(versementFormSchema),
    defaultValues: toFormValues(versement, defaultApporteurId),
  });

  useEffect(() => {
    if (open) {
      reset(toFormValues(versement, defaultApporteurId));
      setServerError(null);
      setActeloResults(null);
    }
  }, [open, versement, defaultApporteurId, reset]);

  const apporteurId = watch("apporteurId");
  const dossierLabel = watch("dossierLabel");
  const year = watch("year");
  const selected = apporteurs.find((a) => a.id === apporteurId);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = isEdit
      ? await updateVersement(versement!.id, values)
      : await createVersement(values);
    if (!result.ok) {
      setServerError(result.error ?? "Enregistrement impossible.");
      return;
    }
    onOpenChange(false);
    router.refresh();
  });

  const runActeloSearch = () => {
    startSearch(async () => {
      const results = await searchActeloCases({
        year: Number.parseInt(year, 10) || new Date().getFullYear(),
        query: dossierLabel,
      });
      setActeloResults(results);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[860px] max-w-[96vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le versement" : "Nouveau versement"}</DialogTitle>
          <DialogDescription>
            Ristourne versée à un apporteur au titre d&apos;un dossier. Montants TTC.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Apporteur" error={errors.apporteurId?.message}>
              <Controller
                control={control}
                name="apporteurId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir…" />
                    </SelectTrigger>
                    <SelectContent>
                      {apporteurs.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Convention" hint="Par défaut : convention active de l'apporteur">
              <Controller
                control={control}
                name="conventionId"
                render={({ field }) => (
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Automatique" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Automatique</SelectItem>
                      {(selected?.conventions ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.number ? `N° ${c.number} — ` : ""}
                          {c.remunerationLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Type">
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {versementTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {VERSEMENT_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Société" hint="Entité qui encaisse">
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

            <Field label="Agence">
              <Controller
                control={control}
                name="agencyId"
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
                      {agencies.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Commercial" error={errors.commercialName?.message}>
              <Input {...register("commercialName")} placeholder="Prénom NOM" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Année" error={errors.year?.message}>
                <Input {...register("year")} inputMode="numeric" placeholder="2026" />
              </Field>
              <Field label="Mois">
                <Controller
                  control={control}
                  name="month"
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
                        {MONTH_LABELS.map((label, index) => (
                          <SelectItem key={label} value={String(index + 1)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr,1fr,auto]">
            <Field label="Dossier" error={errors.dossierLabel?.message}>
              <Input {...register("dossierLabel")} placeholder="Nom du dossier client" />
            </Field>
            <Field label="Dossier Actelo" hint="Identifiant du dossier rapproché">
              <Input {...register("acteloCaseId")} placeholder="—" />
            </Field>
            <div className="flex items-end pb-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={runActeloSearch}
                disabled={searching || dossierLabel.trim().length < 2}
              >
                <Search className="mr-1.5 size-4" />
                {searching ? "Recherche…" : "Chercher dans Actelo"}
              </Button>
            </div>
          </div>

          {acteloResults ? (
            <div className="rounded-lg border border-border p-2 text-[12.5px]">
              {acteloResults.length === 0 ? (
                <p className="text-text-soft">
                  Aucun dossier Actelo trouvé pour cette recherche — la saisie libre reste possible.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {acteloResults.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-1.5">
                      <span className="truncate">
                        <span className="font-semibold">{c.ref ?? c.id}</span>
                        <span className="text-text-soft">
                          {" "}
                          · {c.managerName ?? "—"} · {c.agencyName ?? "—"}
                        </span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setValue("acteloCaseId", c.id, { shouldDirty: true });
                          if (c.brokerCommission) {
                            setValue("commission", money(c.brokerCommission), {
                              shouldDirty: true,
                            });
                          }
                          setActeloResults(null);
                        }}
                      >
                        Rattacher
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Montant versé (TTC)" error={errors.amount?.message}>
              <Input {...register("amount")} inputMode="decimal" placeholder="500,00" />
            </Field>
            <Field label="Commission perçue" error={errors.commission?.message}>
              <Input {...register("commission")} inputMode="decimal" placeholder="—" />
            </Field>
            <Field label="Honoraires perçus" error={errors.fees?.message}>
              <Input {...register("fees")} inputMode="decimal" placeholder="—" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Mode de paiement">
              <Controller
                control={control}
                name="paymentMode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModes.map((m) => (
                        <SelectItem key={m} value={m}>
                          {PAYMENT_MODE_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Référence" hint="N° de chèque / virement">
              <Input {...register("paymentRef")} placeholder="—" />
            </Field>
            <Field label="Date de versement">
              <Input type="date" {...register("paymentDate")} />
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
                      {versementStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {VERSEMENT_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="SIREN (kbis)" error={errors.sirenKbis?.message}>
              <Input {...register("sirenKbis")} inputMode="numeric" placeholder="9 chiffres" />
            </Field>
            <Field label="SIREN (facture)" error={errors.sirenInvoice?.message}>
              <Input {...register("sirenInvoice")} inputMode="numeric" placeholder="9 chiffres" />
            </Field>
            <FormCheckbox control={control} name="sirenVerified" label="SIREN vérifié" />
            <FormCheckbox control={control} name="invoiceReceived" label="Facture reçue" />
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
              {isSubmitting ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le versement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
