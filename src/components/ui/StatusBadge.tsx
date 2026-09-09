import type { ReservationStatus } from "@/types";

type Status = ReservationStatus | "free";

const STATUS_LABEL: Record<Status, string> = {
  confirmed: "Belegt",
  free: "Frei",
  blocked: "Blockiert",
  "owner-use": "Eigennutzung",
};

const STATUS_DOT: Record<Status, string> = {
  confirmed: "bg-status-occupied",
  free: "bg-transparent border border-ink/25",
  blocked: "bg-status-blocked",
  "owner-use": "bg-status-owner",
};

export function StatusBadge({ status, className = "" }: { status: Status; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function statusLabel(status: Status): string {
  return STATUS_LABEL[status];
}

export function statusDotClass(status: Status): string {
  return STATUS_DOT[status];
}
