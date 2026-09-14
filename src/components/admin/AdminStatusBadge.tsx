import type {
  AccountStatus,
  AdminAccountStatus,
  AdminGeneralDocumentStatus,
  AdminPropertyStatus,
  AdminStatementStatus,
  IntegrationStatus,
  OwnerUserAccountStatus,
} from "@/types/admin";
import type { ApaleoMappingStatus } from "@/server/integrations/apaleo/mappingStatus";
import type { GoogleDriveMappingStatus } from "@/server/integrations/googleDrive/folderMapping";

type AdminStatusTone = "positive" | "strong" | "neutral" | "muted";

// Same pill chrome as components/ui/StatusBadge.tsx (border-line/bg-paper/
// text-ink-soft) - only the dot colour carries meaning, exactly like the
// Owner Center's own status dots (confirmed/blocked/owner-use/free), so no
// new "tinted badge" pattern is introduced for Admin.
const DOT_CLASS: Record<AdminStatusTone, string> = {
  positive: "bg-[#87977E]",
  strong: "bg-[#52664E]",
  neutral: "bg-ink-soft",
  muted: "border border-ink/25 bg-transparent",
};

export function AdminStatusBadge({ label, tone = "neutral" }: { label: string; tone?: AdminStatusTone }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[tone]}`} />
      {label}
    </span>
  );
}

// Small (label, tone) lookups per domain status, kept together with the
// badge itself so every /admin page renders the same status consistently.

export function accountStatusBadge(status: AccountStatus): { label: string; tone: AdminStatusTone } {
  return status === "active" ? { label: "Aktiv", tone: "positive" } : { label: "Inaktiv", tone: "muted" };
}

/**
 * AdminOwnerUser's status badge - like accountStatusBadge, plus the
 * "invited" state, split into "Eingeladen" vs "Einladung abgelaufen" by
 * comparing `invitationExpiresAt` (only meaningful while status is
 * "invited" - see AdminOwnerUser) against now. An invited-but-expired user
 * is still functionally the same as "Eingeladen" (blocked from /login
 * either way) - the distinction is purely informational, telling the admin
 * whether "Einladungslink kopieren" would still hand out a working link.
 */
export function ownerUserStatusBadge(
  status: OwnerUserAccountStatus,
  invitationExpiresAt?: string
): { label: string; tone: AdminStatusTone } {
  if (status === "active") return { label: "Aktiv", tone: "positive" };
  if (status === "inactive") return { label: "Deaktiviert", tone: "muted" };
  if (invitationExpiresAt && new Date(invitationExpiresAt) < new Date()) {
    return { label: "Einladung abgelaufen", tone: "strong" };
  }
  return { label: "Eingeladen", tone: "neutral" };
}

/**
 * AdminAccount's status badge - same "invited" vs "Einladung abgelaufen"
 * split as ownerUserStatusBadge, kept as its own function (rather than
 * reused) since AdminAccountStatus and OwnerUserAccountStatus are
 * deliberately distinct types.
 */
export function adminAccountStatusBadge(
  status: AdminAccountStatus,
  invitationExpiresAt?: string
): { label: string; tone: AdminStatusTone } {
  if (status === "active") return { label: "Aktiv", tone: "positive" };
  if (status === "inactive") return { label: "Deaktiviert", tone: "muted" };
  if (invitationExpiresAt && new Date(invitationExpiresAt) < new Date()) {
    return { label: "Einladung abgelaufen", tone: "strong" };
  }
  return { label: "Eingeladen", tone: "neutral" };
}

export function propertyStatusBadge(status: AdminPropertyStatus): { label: string; tone: AdminStatusTone } {
  return status === "active" ? { label: "Aktiv", tone: "positive" } : { label: "Inaktiv", tone: "muted" };
}

export function statementStatusBadge(status: AdminStatementStatus): { label: string; tone: AdminStatusTone } {
  switch (status) {
    case "draft":
      return { label: "Entwurf", tone: "muted" };
    case "ready":
      return { label: "Bereit", tone: "neutral" };
    case "detected":
      return { label: "Erkannt", tone: "neutral" };
    case "needs_classification":
      return { label: "Zu klassifizieren", tone: "strong" };
    case "published":
      return { label: "Veröffentlicht", tone: "positive" };
    case "updated":
      return { label: "Aktualisiert", tone: "strong" };
    case "archived":
      return { label: "Archiviert", tone: "muted" };
  }
}

export function generalDocumentStatusBadge(status: AdminGeneralDocumentStatus): { label: string; tone: AdminStatusTone } {
  return status === "published" ? { label: "Veröffentlicht", tone: "positive" } : { label: "Entwurf", tone: "muted" };
}

export function integrationStatusBadge(status: IntegrationStatus): { label: string; tone: AdminStatusTone } {
  if (status === "connected") return { label: "Verbunden", tone: "positive" };
  if (status === "error") return { label: "Fehler", tone: "strong" };
  return { label: "Noch nicht verbunden", tone: "muted" };
}

/** Per-property apaleo mapping status - shown on the properties list/detail and owner detail pages. */
export function apaleoMappingStatusBadge(status: ApaleoMappingStatus): { label: string; tone: AdminStatusTone } {
  switch (status) {
    case "connected":
      return { label: "apaleo: Verbunden", tone: "positive" };
    case "mapping_error":
      return { label: "apaleo: Mapping fehlerhaft", tone: "strong" };
    case "unavailable":
      return { label: "apaleo: Nicht verfügbar", tone: "muted" };
    case "not_connected":
      return { label: "apaleo: Nicht zugeordnet", tone: "muted" };
  }
}

/** Per-property Google Drive folder mapping status - shown on the property detail page's "Google Drive" card. */
export function googleDriveMappingStatusBadge(status: GoogleDriveMappingStatus): { label: string; tone: AdminStatusTone } {
  switch (status) {
    case "connected":
      return { label: "Drive: Verbunden", tone: "positive" };
    case "mapping_error":
      return { label: "Drive: Mapping fehlerhaft", tone: "strong" };
    case "unavailable":
      return { label: "Drive: Nicht verfügbar", tone: "muted" };
    case "not_connected":
      return { label: "Drive: Nicht zugeordnet", tone: "muted" };
  }
}
