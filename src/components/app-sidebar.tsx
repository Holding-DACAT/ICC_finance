"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeEuro,
  Bell,
  Building2,
  KanbanSquare,
  Landmark,
  LayoutDashboard,
  LogOut,
  Monitor,
  ScrollText,
  Upload,
  Users,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/onboarding", label: "Onboarding", icon: KanbanSquare },
  { href: "/employes", label: "Employés", icon: Users },
  { href: "/agences", label: "Agences", icon: Building2 },
  { href: "/societe", label: "Société", icon: Landmark },
  { href: "/ordinateurs", label: "Ordinateurs", icon: Monitor },
  { href: "/redevance", label: "Redevance info.", icon: BadgeEuro },
] as const;

const NAV_SECONDARY = [
  { href: "/import", label: "Import", icon: Upload, roles: ["ADMIN", "RH"] as const },
  { href: "/alertes", label: "Alertes", icon: Bell },
  { href: "/journal", label: "Journal d'audit", icon: ScrollText },
] as const;

interface AppSidebarProps {
  userName: string;
  roleLabel: string;
  role: string;
}

export function AppSidebar({ userName, roleLabel, role }: AppSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const secondary = NAV_SECONDARY.filter(
    (item) => !("roles" in item) || item.roles.includes(role as "ADMIN" | "RH"),
  );

  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col rounded-r-[18px] bg-brand-sidebar p-4 md:flex">
      <div className="flex items-center gap-2.5 px-1.5 pb-5 pt-1.5">
        <div className="grid size-9 place-items-center rounded-[9px] bg-primary">
          <Building2 className="size-[18px] text-white" />
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-[1px] text-text-soft">ICC Finance</div>
          <div className="mt-0.5 inline-block rounded bg-primary px-2 py-px text-[15px] font-extrabold tracking-wide text-white">
            GESTION RH
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-white/[0.09] text-white"
                  : "text-text-soft hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-[18px]" /> {label}
            </Link>
          );
        })}

        <div className="mb-1 mt-4 px-3 text-[9.5px] uppercase tracking-[1px] text-text-faint">
          Administration
        </div>
        {secondary.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-white/[0.09] text-white"
                  : "text-text-soft hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-[18px]" /> {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto text-center">
        <div className="mb-2 truncate rounded-[10px] bg-primary px-3 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white">
          {userName}
        </div>
        <div className="mb-3 text-[10px] text-text-soft">{roleLabel}</div>
        <button
          onClick={() => signOut({ redirectUrl: "/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-white/15 px-3 py-2 text-[12px] font-semibold text-text-soft transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-4" /> Se déconnecter
        </button>
        <div className="mt-3 text-[10px] text-text-faint">© 2026 — ICC Finance (1.3.99)</div>
      </div>
    </aside>
  );
}
