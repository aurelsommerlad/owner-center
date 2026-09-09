"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOOTER_NAV, LOGOUT_ITEM, MAIN_NAV, navHref, type NavItem } from "./navigation";

function NavLink({ item, propertyId, active }: { item: NavItem; propertyId: string; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={navHref(propertyId, item.segment)}
      className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
        active
          ? "bg-primary-dark text-on-image"
          : "text-ink-soft hover:bg-paper-dim hover:text-ink"
      }`}
    >
      <Icon
        className={`h-[18px] w-[18px] shrink-0 ${active ? "text-on-image" : "text-ink-soft/70 group-hover:text-ink"}`}
      />
      <span className={active ? "font-medium" : ""}>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ propertyId }: { propertyId: string }) {
  const pathname = usePathname();
  const activeSegment = pathname.split("/")[2] ?? "uebersicht";

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-paper px-4 py-6 lg:flex">
      <nav className="flex flex-1 flex-col gap-1 pt-1">
        {MAIN_NAV.map((item) => (
          <NavLink key={item.key} item={item} propertyId={propertyId} active={activeSegment === item.segment} />
        ))}
      </nav>

      <div className="mt-6 flex flex-col gap-1 border-t border-line pt-4">
        {FOOTER_NAV.map((item) => (
          <NavLink key={item.key} item={item} propertyId={propertyId} active={activeSegment === item.segment} />
        ))}
        <button
          type="button"
          className="group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
        >
          <LOGOUT_ITEM.icon className="h-[18px] w-[18px] shrink-0 text-ink-soft/70 group-hover:text-ink" />
          {LOGOUT_ITEM.label}
        </button>
      </div>

      <div className="mt-8 border-t border-line px-2 pt-5">
        <span className="font-sans text-xs font-medium tracking-[0.14em] text-ink">UNIQUE PLACES</span>
      </div>
    </aside>
  );
}
