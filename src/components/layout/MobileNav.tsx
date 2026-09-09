"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { FOOTER_NAV, LOGOUT_ITEM, MAIN_NAV, navHref } from "./navigation";

export function MobileNav({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const activeSegment = pathname.split("/")[2] ?? "uebersicht";

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
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink lg:hidden"
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
              className="absolute inset-0 bg-ink/40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-paper px-5 py-6 shadow-soft-lg">
              <div className="mb-8 flex items-center justify-between px-1">
                <div>
                  <span className="font-sans text-sm font-medium tracking-[0.14em] text-ink">UNIQUE PLACES</span>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-ink-soft/70">
                    Eigentümerportal
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink"
                  aria-label="Menü schließen"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex flex-1 flex-col gap-1">
                {MAIN_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = activeSegment === item.segment;
                  return (
                    <Link
                      key={item.key}
                      href={navHref(propertyId, item.segment)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] ${
                        active ? "bg-ink text-paper font-medium" : "text-ink-soft"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? "text-paper" : "text-ink-soft/70"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex flex-col gap-1 border-t border-line pt-4">
                {FOOTER_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = activeSegment === item.segment;
                  return (
                    <Link
                      key={item.key}
                      href={navHref(propertyId, item.segment)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] ${
                        active ? "bg-ink text-paper font-medium" : "text-ink-soft"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? "text-paper" : "text-ink-soft/70"}`} />
                      {item.label}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[15px] text-ink-soft"
                >
                  <LOGOUT_ITEM.icon className="h-5 w-5 text-ink-soft/70" />
                  {LOGOUT_ITEM.label}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
