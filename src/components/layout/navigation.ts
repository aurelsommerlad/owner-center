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
  UnitsIcon,
} from "@/components/ui/icons";

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface NavItem {
  key: string;
  label: string;
  segment: string;
  icon: NavIcon;
}

export const MAIN_NAV: NavItem[] = [
  { key: "uebersicht", label: "Übersicht", segment: "uebersicht", icon: OverviewIcon },
  { key: "kalender", label: "Kalender", segment: "kalender", icon: CalendarIcon },
  { key: "statistiken", label: "Statistiken", segment: "statistiken", icon: ChartIcon },
  { key: "abrechnungen", label: "Abrechnungen", segment: "abrechnungen", icon: ReceiptIcon },
  { key: "einheiten", label: "Einheiten", segment: "einheiten", icon: UnitsIcon },
  { key: "dokumente", label: "Dokumente", segment: "dokumente", icon: DocumentsIcon },
];

export const FOOTER_NAV: NavItem[] = [
  { key: "profil", label: "Profil", segment: "profil", icon: ProfileIcon },
  { key: "hilfe", label: "Hilfe & Kontakt", segment: "hilfe", icon: HelpIcon },
];

export const LOGOUT_ITEM: NavItem = {
  key: "logout",
  label: "Abmelden",
  segment: "abmelden",
  icon: LogoutIcon,
};

export function navHref(propertyId: string, segment: string): string {
  return `/${propertyId}/${segment}`;
}
