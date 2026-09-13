import type { OwnerTeamUserStatus } from "@/types";

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
  invitationExpiresAt?: string
): { label: string; tone: TeamStatusTone } {
  if (status === "active") return { label: "Aktiv", tone: "positive" };
  if (status === "inactive") return { label: "Deaktiviert", tone: "muted" };
  if (invitationExpiresAt && new Date(invitationExpiresAt) < new Date()) {
    return { label: "Einladung abgelaufen", tone: "strong" };
  }
  return { label: "Eingeladen", tone: "neutral" };
}
