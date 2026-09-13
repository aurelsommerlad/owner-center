"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeftIcon, LogoutIcon, ProfileIcon } from "@/components/ui/icons";
import { ADMIN_MAIN_NAV, isAdminNavItemActive } from "./navigation";
import { logoutAction } from "@/app/actions";

// Mirrors components/layout/Sidebar.tsx exactly (same tokens, spacing,
// active/hover states) - only the nav items and the wordmark's second line
// differ, so Admin and Owner Center read as one product.

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-paper px-4 py-6 lg:flex">
      <div className="px-2.5 pb-8">
        <p className="font-sans text-sm font-semibold tracking-[0.05em] text-[#171817]">UNIQUE PLACES</p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#171817]/55">Admin</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {ADMIN_MAIN_NAV.map((item) => {
          const active = isAdminNavItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
                active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-dim hover:text-ink"
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${active ? "text-paper" : "text-ink-soft/70 group-hover:text-ink"}`}
              />
              <span className={active ? "font-medium" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex flex-col gap-1 border-t border-line pt-4">
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
        >
          <ChevronLeftIcon className="h-[18px] w-[18px] shrink-0 text-ink-soft/70 group-hover:text-ink" />
          Zurück zum Owner Center
        </Link>
        <button
          type="button"
          className="group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
        >
          <ProfileIcon className="h-[18px] w-[18px] shrink-0 text-ink-soft/70 group-hover:text-ink" />
          Profil
        </button>
        <form action={logoutAction}>
          <button
            type="submit"
            className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
          >
            <LogoutIcon className="h-[18px] w-[18px] shrink-0 text-ink-soft/70 group-hover:text-ink" />
            Abmelden
          </button>
        </form>
      </div>
    </aside>
  );
}
