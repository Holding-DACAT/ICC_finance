"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Upload, X } from "lucide-react";

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
import type { AgencyOption, CompanyOption, MemberDTO } from "../types";

interface MemberFormDialogProps {
  agencies: AgencyOption[];
  companies?: CompanyOption[];
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
    personalEmail: member?.personalEmail ?? "",
    phone: member?.phone ?? "",
    photoUrl: member?.photoUrl ?? "",
    birthDate: member?.birthDate ? member.birthDate.slice(0, 10) : "",
    postalAddress: member?.postalAddress ?? "",
    siren: member?.siren ?? "",
    legalMentions: member?.legalMentions ?? "",
    contractType: member?.contractType ?? "MANDAT",
    functionTitle: member?.functionTitle ?? "",
    functionSub: member?.functionSub ?? "",
    network: member?.network ?? "FILIALE",
    status: member?.status ?? "ACTIF",
    companyId: member?.companyId ?? "",
    agencyId: member?.agencyId ?? "",
    arrivalDate: member?.arrivalDate ? member.arrivalDate.slice(0, 10) : "",
    departureDate: member?.departureDate ? member.departureDate.slice(0, 10) : "",
    oriasNumber: member?.orias?.oriasNumber ?? "",
    oriasLogin: member?.orias?.oriasLogin ?? "",
    oriasPassword: member?.orias?.oriasPassword ?? "",
    oriasCategories: (member?.orias?.categories ?? []) as OriasCategory[],
    complianceStatus: member?.orias?.status ?? "A_JOUR",
    rcProInsurer: member?.orias?.rcProInsurer ?? "",
    rcProPolicy: member?.orias?.rcProPolicy ?? "",
    rcProExpiry: member?.orias?.rcProExpiry ? member.orias.rcProExpiry.slice(0, 10) : "",
    guaranteeAmount: member?.orias?.guaranteeAmount != null ? String(member.orias.guaranteeAmount) : "",
    guaranteeExpiry: member?.orias?.guaranteeExpiry ? member.orias.guaranteeExpiry.slice(0, 10) : "",
    assocMiobspLogin: member?.orias?.assocMiobspLogin ?? "",
    assocMiobspPassword: member?.orias?.assocMiobspPassword ?? "",
    assocMiaLogin: member?.orias?.assocMiaLogin ?? "",
    assocMiaPassword: member?.orias?.assocMiaPassword ?? "",
  };
}

export function MemberFormDialog({
  agencies,
  companies = [],
  member,
  open,
  onOpenChange,
}: MemberFormDialogProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(member);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: toFormValues(member),
  });

  const photoUrl = watch("photoUrl");
  const selectedCompanyId = watch("companyId");
  const selectedAgencyId = watch("agencyId");
  const firstName = watch("firstName");
  const lastName = watch("lastName");

  // Agences proposées : filtrées par la société de rattachement si elle est choisie.
  const visibleAgencies = selectedCompanyId
    ? agencies.filter((a) => a.companyId === selectedCompanyId)
    : agencies;

  async function handlePhotoFile(file: File) {
    setPhotoError(null);
    if (!file.type.startsWith("image/")) {
      setPhotoError("Fichier image attendu.");
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256);
      setValue("photoUrl", dataUrl, { shouldDirty: true });
    } catch {
      setPhotoError("Impossible de charger cette image.");
    }
  }

  // Réinitialise le formulaire à chaque ouverture (création ou édition).
  // Indispensable car l'ouverture est pilotée par le parent (clic « Éditer »
  // ou « Démarrer un onboarding ») : Radix n'appelle pas onOpenChange lors d'un
  // changement programmatique de `open`, donc le reset doit s'appuyer sur un
  // effet observant `open`/`member`.
  useEffect(() => {
    if (open) {
      reset(toFormValues(member));
      setServerError(null);
    }
  }, [open, member, reset]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le membre" : "Créer un membre"}</DialogTitle>
          <DialogDescription>
            Les champs marqués d&apos;un astérisque sont obligatoires.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Photo du collaborateur */}
          <div className="col-span-full flex items-center gap-3">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="Photo du collaborateur"
                className="size-16 rounded-xl object-cover"
              />
            ) : (
              <div className="grid size-16 place-items-center rounded-xl bg-brand-card-soft text-sm font-bold text-white">
                {(firstName?.[0] ?? "").toUpperCase()}
                {(lastName?.[0] ?? "").toUpperCase()}
              </div>
            )}
            <input type="hidden" {...register("photoUrl")} />
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-3.5" /> {photoUrl ? "Changer la photo" : "Ajouter une photo"}
                </Button>
                {photoUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setValue("photoUrl", "", { shouldDirty: true })}
                  >
                    <X className="size-3.5" /> Retirer
                  </Button>
                ) : null}
              </div>
              {photoError ? (
                <span className="text-[11px] text-state-danger">{photoError}</span>
              ) : errors.photoUrl?.message ? (
                <span className="text-[11px] text-state-danger">{errors.photoUrl.message}</span>
              ) : (
                <span className="text-[11px] text-text-faint">JPG/PNG — redimensionnée automatiquement.</span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handlePhotoFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <Field label="Civilité" error={errors.civility?.message}>
            <Input {...register("civility")} placeholder="M., Mme…" />
          </Field>
          <Field label="Prénom *" error={errors.firstName?.message}>
            <Input {...register("firstName")} />
          </Field>
          <Field label="Nom *" error={errors.lastName?.message}>
            <Input {...register("lastName")} />
          </Field>
          <Field label="Adresse mail ICC Finance *" error={errors.email?.message}>
            <Input type="email" {...register("email")} placeholder="prenom.nom@icc-finance.fr" />
          </Field>
          <Field label="Adresse mail personnelle" error={errors.personalEmail?.message}>
            <Input type="email" {...register("personalEmail")} placeholder="prenom.nom@email.com" />
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
          <Field label="Poste occupé" error={errors.functionSub?.message}>
            <Input {...register("functionSub")} placeholder="Ex. Mandataire, Assistante…" />
          </Field>

          <Field label="Société de rattachement" error={errors.companyId?.message}>
            <Controller
              control={control}
              name="companyId"
              render={({ field }) => (
                <Select
                  value={field.value || "__none__"}
                  onValueChange={(v) => {
                    const next = v === "__none__" ? "" : v;
                    field.onChange(next);
                    // Réinitialise l'agence si elle n'appartient plus à la société.
                    const current = agencies.find((a) => a.id === selectedAgencyId);
                    if (next && current && current.companyId !== next) {
                      setValue("agencyId", "");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une société" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Déduite de l&apos;agence —</SelectItem>
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
          <Field label="Agence de rattachement *" error={errors.agencyId?.message}>
            <Controller
              control={control}
              name="agencyId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une agence" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleAgencies.map((a) => (
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
          <Field label="Mot de passe ORIAS" error={errors.oriasPassword?.message}>
            <Input {...register("oriasPassword")} autoComplete="off" />
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

          {/* --- Association professionnelle MIOBSP --- */}
          <SectionHeading>Association professionnelle — MIOBSP</SectionHeading>
          <Field label="Identifiant MIOBSP" error={errors.assocMiobspLogin?.message}>
            <Input {...register("assocMiobspLogin")} />
          </Field>
          <Field label="Mot de passe MIOBSP" error={errors.assocMiobspPassword?.message}>
            <Input {...register("assocMiobspPassword")} autoComplete="off" />
          </Field>

          {/* --- Association professionnelle MIA --- */}
          <SectionHeading>Association professionnelle — MIA</SectionHeading>
          <Field label="Identifiant MIA" error={errors.assocMiaLogin?.message}>
            <Input {...register("assocMiaLogin")} />
          </Field>
          <Field label="Mot de passe MIA" error={errors.assocMiaPassword?.message}>
            <Input {...register("assocMiaPassword")} autoComplete="off" />
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

/**
 * Redimensionne une image (côté navigateur) en un carré de `size` px max et
 * renvoie une data URL JPEG. Évite de stocker des photos trop lourdes en base.
 */
function resizeImageToDataUrl(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas"));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
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
