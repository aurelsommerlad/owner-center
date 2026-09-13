import type {
  AccountStatus,
  AdminGeneralDocumentStatus,
  AdminPropertyStatus,
  AdminStatementStatus,
  IntegrationStatus,
} from "@/types/admin";

type AdminStatusTone = "positive" | "neutral" | "muted" | "attention";

const TONE_CLASS: Record<AdminStatusTone, string> = {
  positive: "bg-[#52664E]/10 text-[#52664E]",
  neutral: "bg-[#171817]/6 text-[#171817]",
  muted: "border border-[#E4E0D8] text-[#74736E]",
  attention: "bg-[#87977E]/12 text-[#52664E]",
};

export function AdminStatusBadge({ label, tone = "neutral" }: { label: string; tone?: AdminStatusTone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${TONE_CLASS[tone]}`}>
      {label}
    </span>
  );
}

// Small (label, tone) lookups per domain status, kept together with the
// badge itself so every /admin page renders the same status consistently.

export function accountStatusBadge(status: AccountStatus): { label: string; tone: AdminStatusTone } {
  return status === "active" ? { label: "Aktiv", tone: "positive" } : { label: "Inaktiv", tone: "muted" };
}

export function propertyStatusBadge(status: AdminPropertyStatus): { label: string; tone: AdminStatusTone } {
  if (status === "active") return { label: "Aktiv", tone: "positive" };
  if (status === "onboarding") return { label: "Onboarding", tone: "attention" };
  return { label: "Inaktiv", tone: "muted" };
}

export function statementStatusBadge(status: AdminStatementStatus): { label: string; tone: AdminStatusTone } {
  switch (status) {
    case "draft":
      return { label: "Entwurf", tone: "muted" };
    case "ready":
      return { label: "Bereit", tone: "neutral" };
    case "published":
      return { label: "Veröffentlicht", tone: "positive" };
    case "updated":
      return { label: "Aktualisiert", tone: "attention" };
  }
}

export function generalDocumentStatusBadge(status: AdminGeneralDocumentStatus): { label: string; tone: AdminStatusTone } {
  return status === "published" ? { label: "Veröffentlicht", tone: "positive" } : { label: "Entwurf", tone: "muted" };
}

export function integrationStatusBadge(status: IntegrationStatus): { label: string; tone: AdminStatusTone } {
  if (status === "connected") return { label: "Verbunden", tone: "positive" };
  if (status === "error") return { label: "Fehler", tone: "attention" };
  return { label: "Noch nicht verbunden", tone: "muted" };
}
