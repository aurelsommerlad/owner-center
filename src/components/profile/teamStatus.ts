import type { OwnerTeamUserStatus } from "@/types";
import { getDictionary, type Locale } from "@/i18n";

export type TeamStatusTone = "positive" | "strong" | "neutral" | "muted";

/**
 * Same dot-colour mapping the admin area's AdminStatusBadge uses for the
 * identical four states (see components/admin/AdminStatusBadge.tsx) -
 * intentionally the same hex values, kept here as its own tiny copy rather
 * than a shared import, so the Owner Center side never pulls in anything
 * from `@/types/admin`.
 */
export const TEAM_STATUS_DOT_CLASS: Record<TeamStatusTone, string> = {
  positive: "bg-[#87977E]",
  strong: "bg-[#52664E]",
  neutral: "bg-ink-soft",
  muted: "border border-ink/25 bg-transparent",
};

export function teamUserStatusBadge(
  status: OwnerTeamUserStatus,
  invitationExpiresAt?: string,
  locale: Locale = "de"
): { label: string; tone: TeamStatusTone } {
  const dict = getDictionary(locale).profile;
  if (status === "active") return { label: dict.statusActive, tone: "positive" };
  if (status === "inactive") return { label: dict.statusDeactivated, tone: "muted" };
  if (invitationExpiresAt && new Date(invitationExpiresAt) < new Date()) {
    return { label: dict.statusExpired, tone: "strong" };
  }
  return { label: dict.statusInvited, tone: "neutral" };
}
