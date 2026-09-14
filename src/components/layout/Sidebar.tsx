"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOOTER_NAV, LOGOUT_ITEM, MAIN_NAV, navHref, type NavItem } from "./navigation";
import { logoutAction } from "@/app/actions";
import { useTranslations } from "@/components/i18n/LocaleProvider";
import type { SignedInOwnerIdentity } from "@/server/ownerIdentity";

function NavLink({
  item,
  propertyId,
  active,
  label,
}: {
  item: NavItem;
  propertyId: string;
  active: boolean;
  label: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={navHref(propertyId, item.segment)}
      className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
        active
          ? "bg-ink text-paper"
          : "text-ink-soft hover:bg-paper-dim hover:text-ink"
      }`}
    >
      <Icon
        className={`h-[18px] w-[18px] shrink-0 ${active ? "text-paper" : "text-ink-soft/70 group-hover:text-ink"}`}
      />
      <span className={active ? "font-medium" : ""}>{label}</span>
    </Link>
  );
}

export function Sidebar({
  propertyId,
  identity,
}: {
  propertyId: string;
  /**
   * The real signed-in owner - resolved server-side (see
   * server/ownerIdentity.ts) and passed down rather than looked up again
   * here. `null` for an admin's own session or an "Als Owner ansehen"
   * preview with no single specific OwnerUser to name - rendered as a
   * neutral role label rather than a guessed/fabricated name.
   */
  identity: SignedInOwnerIdentity | null;
}) {
  const pathname = usePathname();
  const activeSegment = pathname.split("/")[2] ?? "uebersicht";
  const { t } = useTranslations();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-paper px-4 py-6 lg:flex">
      <div className="px-2.5 pb-8">
        <p className="font-sans text-sm font-semibold tracking-[0.05em] text-[#171817]">{t("nav.brand")}</p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#171817]/55">
          {t("nav.brandSubtitleDesktop")}
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {MAIN_NAV.map((item) => (
          <NavLink
            key={item.key}
            item={item}
            propertyId={propertyId}
            active={activeSegment === item.segment}
            label={t(item.translationKey)}
          />
        ))}
      </nav>

      <div className="mt-6 flex flex-col gap-1 border-t border-line pt-4">
        {FOOTER_NAV.map((item) => (
          <NavLink
            key={item.key}
            item={item}
            propertyId={propertyId}
            active={activeSegment === item.segment}
            label={t(item.translationKey)}
          />
        ))}

        <div className="mt-3 border-t border-line pt-3">
          <div className="px-3.5 pb-2">
            <p className="truncate text-sm font-semibold text-ink">
              {identity ? `${identity.firstName} ${identity.lastName}` : t("nav.ownerRole")}
            </p>
            {identity && <p className="text-xs text-[#74736E]">{t("nav.ownerRole")}</p>}
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
            >
              <LOGOUT_ITEM.icon className="h-[18px] w-[18px] shrink-0 text-ink-soft/70 group-hover:text-ink" />
              {t(LOGOUT_ITEM.translationKey)}
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
