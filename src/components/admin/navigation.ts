import type { ComponentType, SVGProps } from "react";
import { DocumentsIcon, OverviewIcon, PlugIcon, ReceiptIcon, UnitsIcon, UsersIcon } from "@/components/ui/icons";

export type AdminNavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface AdminNavItem {
  key: string;
  label: string;
  href: string;
  icon: AdminNavIcon;
}

export const ADMIN_MAIN_NAV: AdminNavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/admin", icon: OverviewIcon },
  { key: "owners", label: "Eigentümer", href: "/admin/owners", icon: UsersIcon },
  { key: "properties", label: "Objekte", href: "/admin/properties", icon: UnitsIcon },
  { key: "statements", label: "Abrechnungen", href: "/admin/statements", icon: ReceiptIcon },
  { key: "documents", label: "Dokumente", href: "/admin/documents", icon: DocumentsIcon },
  { key: "integrations", label: "Integrationen", href: "/admin/integrations", icon: PlugIcon },
];

export function isAdminNavItemActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}
