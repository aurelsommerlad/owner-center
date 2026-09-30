import type { ComponentType, SVGProps } from "react";
import {
  CalendarIcon,
  ChartIcon,
  DocumentsIcon,
  HelpIcon,
  LogoutIcon,
  OverviewIcon,
  ProfileIcon,
  ReceiptIcon,
} from "@/components/ui/icons";
import type { TranslationKey } from "@/i18n";

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface NavItem {
  key: string;
  /** Resolved via t() at render time - see components/layout/Sidebar.tsx/MobileNav.tsx - never a hardcoded label, so the nav renders in whichever locale is active. */
  translationKey: TranslationKey;
  segment: string;
  icon: NavIcon;
}

export const MAIN_NAV: NavItem[] = [
  { key: "uebersicht", translationKey: "nav.overview", segment: "uebersicht", icon: OverviewIcon },
  { key: "kalender", translationKey: "nav.calendar", segment: "kalender", icon: CalendarIcon },
  { key: "statistiken", translationKey: "nav.statistics", segment: "statistiken", icon: ChartIcon },
  { key: "abrechnungen", translationKey: "nav.statements", segment: "abrechnungen", icon: ReceiptIcon },
  { key: "dokumente", translationKey: "nav.documents", segment: "dokumente", icon: DocumentsIcon },
];

export const FOOTER_NAV: NavItem[] = [
  { key: "profil", translationKey: "nav.profile", segment: "profil", icon: ProfileIcon },
  { key: "hilfe", translationKey: "nav.help", segment: "hilfe", icon: HelpIcon },
];

/**
 * The restricted nav shown to a read-only "accounting" login (see
 * prisma/schema.prisma#OwnerUser.role) - Abrechnungen only, plus Profil for
 * its own password/name self-service. This is a UI convenience, never the
 * actual access boundary: every one of these routes is independently
 * server-side gated too (see services/propertyService.ts#getProperty's
 * `allowAccountingRole` and the guards in [propertyId]/profil/actions.ts),
 * so hiding the other items here is defence-in-depth, not the enforcement
 * itself - an accounting session that types /kalender directly still hits
 * a 404 regardless of what this constant renders.
 */
export const ACCOUNTING_MAIN_NAV: NavItem[] = [
  { key: "abrechnungen", translationKey: "nav.statements", segment: "abrechnungen", icon: ReceiptIcon },
];

export const ACCOUNTING_FOOTER_NAV: NavItem[] = [
  { key: "profil", translationKey: "nav.profile", segment: "profil", icon: ProfileIcon },
];

export const LOGOUT_ITEM: NavItem = {
  key: "logout",
  translationKey: "nav.logout",
  segment: "abmelden",
  icon: LogoutIcon,
};

export function navHref(propertyId: string, segment: string): string {
  return `/${propertyId}/${segment}`;
}
