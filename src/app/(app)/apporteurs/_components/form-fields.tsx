"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { Label } from "@/components/ui/label";

/** Libellé + champ + aide/erreur : mise en page commune des formulaires du module. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[12px] text-text-soft">{label}</Label>
      {children}
      {hint && !error ? <p className="text-[11px] text-text-faint">{hint}</p> : null}
      {error ? <p className="text-[11px] font-semibold text-state-danger">{error}</p> : null}
    </div>
  );
}

/** Case à cocher pilotée par React Hook Form. */
export function FormCheckbox<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
}) {
  return (
    <div className="flex items-end pb-2">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px]">
            <input
              type="checkbox"
              checked={Boolean(field.value)}
              onChange={(e) => field.onChange(e.target.checked)}
              className="size-4 accent-primary"
            />
            {label}
          </label>
        )}
      />
    </div>
  );
}
