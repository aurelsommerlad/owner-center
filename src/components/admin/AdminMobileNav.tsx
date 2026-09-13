"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloseIcon, LogoutIcon, MenuIcon, ProfileIcon } from "@/components/ui/icons";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { ADMIN_MAIN_NAV, isAdminNavItemActive } from "./navigation";

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E0D8] text-[#171817] lg:hidden"
        aria-label="Menü öffnen"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Menü schließen"
              className="absolute inset-0 bg-[#171817]/40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-[#F8F6F1] px-5 py-6 shadow-[0_4px_12px_rgba(23,24,23,0.05),0_16px_40px_rgba(23,24,23,0.08)]">
              <div className="mb-8 flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-semibold tracking-[0.05em] text-[#171817]">UNIQUE PLACES</p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#171817]/55">
                    Admin
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E0D8] text-[#171817]"
                  aria-label="Menü schließen"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex flex-1 flex-col gap-1">
                {ADMIN_MAIN_NAV.map((item) => {
                  const active = isAdminNavItemActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] ${
                        active ? "bg-[#52664E] text-[#FAFAF7] font-medium" : "text-[#74736E]"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? "text-[#FAFAF7]" : "text-[#74736E]/70"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex flex-col gap-1 border-t border-[#E4E0D8] pt-4">
                <Link
                  href="/"
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] text-[#74736E]"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-[#74736E]/70" />
                  Zurück zum Owner Center
                </Link>
                <button type="button" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[15px] text-[#74736E]">
                  <ProfileIcon className="h-5 w-5 text-[#74736E]/70" />
                  Profil
                </button>
                <button type="button" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[15px] text-[#74736E]">
                  <LogoutIcon className="h-5 w-5 text-[#74736E]/70" />
                  Abmelden
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
