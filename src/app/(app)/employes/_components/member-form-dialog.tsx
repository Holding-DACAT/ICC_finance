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
import { CONTRACT_LABELS, MEMBER_STATUS_LABELS, NETWORK_LABELS } from "@/lib/labels";
import { ORIAS_LABELS } from "@/lib/labels";
import {
  complianceStatuses,
  contractTypes,
  memberFormSchema,
  memberStatuses,
  networkTypes,
  oriasCategories,
  type MemberFormValues,
} from "@/lib/validations/member";

type OriasCategory = (typeof oriasCategories)[number];

const COMPLIANCE_LABELS: Record<(typeof complianceStatuses)[number], string> = {
  A_JOUR: "À jour",
  A_RENOUVELER: "À renouveler",
  EXPIRE: "Expiré",
};
import { createMember, updateMember } from "../actions";
import type { AgencyOption, MemberDTO } from "../types";

interface MemberFormDialogProps {
  agencies: AgencyOption[];
  member?: MemberDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormValues(member: MemberDTO | null | undefined): MemberFormValues {
  return {
    civility: member?.civility ?? "",
    firstName: member?.firstName ?? "",
    lastName: member?.lastName ?? "",
    email: member?.email ?? "",
    phone: member?.phone ?? "",
    birthDate: member?.birthDate ? member.birthDate.slice(0, 10) : "",
    postalAddress: member?.postalAddress ?? "",
    siren: member?.siren ?? "",
    legalMentions: member?.legalMentions ?? "",
    contractType: member?.contractType ?? "MANDAT",
    functionTitle: member?.functionTitle ?? "",
    functionSub: member?.functionSub ?? "",
    network: member?.network ?? "FILIALE",
    status: member?.status ?? "ACTIF",
    agencyId: member?.agencyId ?? "",
    arrivalDate: member?.arrivalDate ? member.arrivalDate.slice(0, 10) : "",
    departureDate: member?.departureDate ? member.departureDate.slice(0, 10) : "",
    oriasNumber: member?.orias?.oriasNumber ?? "",
    oriasLogin: member?.orias?.oriasLogin ?? "",
    oriasCategories: (member?.orias?.categories ?? []) as OriasCategory[],
    oriasRenewalDate: member?.orias?.renewalDate ? member.orias.renewalDate.slice(0, 10) : "",
    complianceStatus: member?.orias?.status ?? "A_JOUR",
    rcProInsurer: member?.orias?.rcProInsurer ?? "",
    rcProPolicy: member?.orias?.rcProPolicy ?? "",
    rcProExpiry: member?.orias?.rcProExpiry ? member.orias.rcProExpiry.slice(0, 10) : "",
    guaranteeAmount: member?.orias?.guaranteeAmount != null ? String(member.orias.guaranteeAmount) : "",
    guaranteeExpiry: member?.orias?.guaranteeExpiry ? member.orias.guaranteeExpiry.slice(0, 10) : "",
    assocLogin: member?.orias?.assocLogin ?? "",
  };
}

export function MemberFormDialog({ agencies, member, open, onOpenChange }: MemberFormDialogProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(member);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: toFormValues(member),
  });

  // Réinitialise le formulaire à chaque ouverture (création ou édition).
  const handleOpenChange = (next: boolean) => {
    if (next) {
      reset(toFormValues(member));
      setServerError(null);
    }
    onOpenChange(next);
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result =
      isEdit && member ? await updateMember(member.id, values) : await createMember(values);
    if (result.ok) {
      onOpenChange(false);
      router.refresh();
    } else {
      setServerError(result.error ?? "Une erreur est survenue.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le membre" : "Créer un membre"}</DialogTitle>
          <DialogDescription>
            Les champs marqués d&apos;un astérisque sont obligatoires.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Prénom *" error={errors.firstName?.message}>
            <Input {...register("firstName")} />
          </Field>
          <Field label="Nom *" error={errors.lastName?.message}>
            <Input {...register("lastName")} />
          </Field>
          <Field label="Email *" error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </Field>
          <Field label="Téléphone" error={errors.phone?.message}>
            <Input {...register("phone")} />
          </Field>
          <Field label="Date de naissance" error={errors.birthDate?.message}>
            <Input type="date" {...register("birthDate")} />
          </Field>
          <Field label="Adresse postale" error={errors.postalAddress?.message}>
            <Input {...register("postalAddress")} />
          </Field>
          <Field label="SIREN" error={errors.siren?.message}>
            <Input {...register("siren")} />
          </Field>
          <Field label="Mentions légales" error={errors.legalMentions?.message}>
            <Input {...register("legalMentions")} />
          </Field>

          <Field label="Type de contrat *" error={errors.contractType?.message}>
            <Controller
              control={control}
              name="contractType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractTypes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CONTRACT_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Réseau *" error={errors.network?.message}>
            <Controller
              control={control}
              name="network"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {networkTypes.map((n) => (
                      <SelectItem key={n} value={n}>
                        {NETWORK_LABELS[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field label="Fonction *" error={errors.functionTitle?.message}>
            <Input {...register("functionTitle")} placeholder="Mandataire, Directeur d'agence…" />
          </Field>
          <Field label="Précision (catégories ORIAS)" error={errors.functionSub?.message}>
            <Input {...register("functionSub")} placeholder="MIOBSP & MIA" />
          </Field>

          <Field label="Agence *" error={errors.agencyId?.message}>
            <Controller
              control={control}
              name="agencyId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une agence" />
                  </SelectTrigger>
                  <SelectContent>
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
          <Field label="Statut" error={errors.status?.message}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {memberStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {MEMBER_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field label="Date d'arrivée *" error={errors.arrivalDate?.message}>
            <Input type="date" {...register("arrivalDate")} />
          </Field>
          <Field label="Date de départ" error={errors.departureDate?.message}>
            <Input type="date" {...register("departureDate")} />
          </Field>

          {/* --- Habilitation ORIAS --- */}
          <SectionHeading>Habilitation ORIAS</SectionHeading>
          <Field label="N° ORIAS" error={errors.oriasNumber?.message}>
            <Input {...register("oriasNumber")} />
          </Field>
          <Field label="Identifiant ORIAS" error={errors.oriasLogin?.message}>
            <Input {...register("oriasLogin")} />
          </Field>
          <Field label="Date de renouvellement" error={errors.oriasRenewalDate?.message}>
            <Input type="date" {...register("oriasRenewalDate")} />
          </Field>
          <Field label="Conformité" error={errors.complianceStatus?.message}>
            <Controller
              control={control}
              name="complianceStatus"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {complianceStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {COMPLIANCE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <div className="col-span-full flex flex-col gap-1.5">
            <Label>Catégories ORIAS</Label>
            <Controller
              control={control}
              name="oriasCategories"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {oriasCategories.map((cat) => {
                    const checked = field.value?.includes(cat) ?? false;
                    return (
                      <label
                        key={cat}
                        title={ORIAS_LABELS[cat]}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const set = new Set<OriasCategory>(field.value ?? []);
                            if (e.target.checked) set.add(cat);
                            else set.delete(cat);
                            field.onChange([...set]);
                          }}
                        />
                        <span className="font-semibold">{cat}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </div>

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

          {/* --- Associations professionnelles --- */}
          <SectionHeading>Associations professionnelles</SectionHeading>
          <Field label="Identifiant" error={errors.assocLogin?.message}>
            <Input {...register("assocLogin")} />
          </Field>

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
              {isEdit ? "Enregistrer" : "Créer le membre"}
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
