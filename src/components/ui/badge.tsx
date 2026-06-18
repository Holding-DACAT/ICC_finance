import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide text-white",
  {
    variants: {
      variant: {
        default: "bg-primary",
        success: "bg-state-success",
        warning: "bg-state-warning",
        danger: "bg-state-danger",
        info: "bg-state-info",
        neutral: "bg-brand-card-soft",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
