"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeftIcon, LogoutIcon, ProfileIcon } from "@/components/ui/icons";
import { ADMIN_MAIN_NAV, isAdminNavItemActive } from "./navigation";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#E4E0D8] bg-[#F8F6F1] px-4 py-6 lg:flex">
      <div className="px-2.5 pb-8">
        <p className="text-sm font-semibold tracking-[0.05em] text-[#171817]">UNIQUE PLACES</p>
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
                active ? "bg-[#52664E] text-[#FAFAF7]" : "text-[#74736E] hover:bg-[#F1EDE4] hover:text-[#171817]"
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${
                  active ? "text-[#FAFAF7]" : "text-[#74736E]/70 group-hover:text-[#171817]"
                }`}
              />
              <span className={active ? "font-medium" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex flex-col gap-1 border-t border-[#E4E0D8] pt-4">
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-[#74736E] transition-colors hover:bg-[#F1EDE4] hover:text-[#171817]"
        >
          <ChevronLeftIcon className="h-[18px] w-[18px] shrink-0 text-[#74736E]/70 group-hover:text-[#171817]" />
          Zurück zum Owner Center
        </Link>
        <button
          type="button"
          className="group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm text-[#74736E] transition-colors hover:bg-[#F1EDE4] hover:text-[#171817]"
        >
          <ProfileIcon className="h-[18px] w-[18px] shrink-0 text-[#74736E]/70 group-hover:text-[#171817]" />
          Profil
        </button>
        <button
          type="button"
          className="group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm text-[#74736E] transition-colors hover:bg-[#F1EDE4] hover:text-[#171817]"
        >
          <LogoutIcon className="h-[18px] w-[18px] shrink-0 text-[#74736E]/70 group-hover:text-[#171817]" />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
