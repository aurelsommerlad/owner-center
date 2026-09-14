import type { ReservationStatus } from "@/types";
import { getDictionary, type Locale } from "@/i18n";

type Status = ReservationStatus | "free";

const STATUS_DOT: Record<Status, string> = {
  confirmed: "bg-status-occupied",
  free: "bg-transparent border border-ink/25",
  blocked: "bg-status-blocked",
  "owner-use": "bg-status-owner",
};

function statusLabels(locale: Locale): Record<Status, string> {
  const dict = getDictionary(locale).calendar;
  return {
    confirmed: dict.occupied,
    free: dict.free,
    blocked: dict.blocked,
    "owner-use": dict.ownerUse,
  };
}

export function StatusBadge({
  status,
  locale = "de",
  className = "",
}: {
  status: Status;
  locale?: Locale;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {statusLabels(locale)[status]}
    </span>
  );
}

export function statusLabel(status: Status, locale: Locale = "de"): string {
  return statusLabels(locale)[status];
}

export function statusDotClass(status: Status): string {
  return STATUS_DOT[status];
}
