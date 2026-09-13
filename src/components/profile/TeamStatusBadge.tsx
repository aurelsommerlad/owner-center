import { TEAM_STATUS_DOT_CLASS, type TeamStatusTone } from "./teamStatus";

export function TeamStatusBadge({ label, tone }: { label: string; tone: TeamStatusTone }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft">
      <span className={`h-1.5 w-1.5 rounded-full ${TEAM_STATUS_DOT_CLASS[tone]}`} />
      {label}
    </span>
  );
}
