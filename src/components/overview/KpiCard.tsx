import { Card } from "@/components/ui/Card";
import { TrendDownIcon, TrendUpIcon } from "@/components/ui/icons";
import { formatDelta } from "@/lib/format";

interface KpiCardProps {
  label: string;
  value: string;
  deltaPoints?: number;
  /** Decimal places for the delta number, e.g. 0 for counts, 1 for % or nights. */
  deltaFractionDigits?: number;
  /** Appended directly after the delta number, e.g. " %". */
  deltaSuffix?: string;
  deltaLabel?: string;
}

export function KpiCard({
  label,
  value,
  deltaPoints,
  deltaFractionDigits = 1,
  deltaSuffix = "",
  deltaLabel,
}: KpiCardProps) {
  const showDelta = typeof deltaPoints === "number" && Number.isFinite(deltaPoints);
  const positive = (deltaPoints ?? 0) >= 0;

  return (
    <Card className="px-4 py-3.5 shadow-none sm:px-5 sm:py-4">
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="font-display text-xl italic text-ink sm:text-2xl">{value}</p>
        {showDelta && (
          <span className="flex items-center gap-0.5 whitespace-nowrap text-xs text-ink-soft">
            {positive ? (
              <TrendUpIcon className="h-3 w-3 text-status-owner" />
            ) : (
              <TrendDownIcon className="h-3 w-3 text-status-blocked" />
            )}
            {formatDelta(deltaPoints ?? 0, deltaFractionDigits)}
            {deltaSuffix}
          </span>
        )}
      </div>
      {showDelta && <p className="mt-0.5 text-[11px] text-ink-soft/70">{deltaLabel ?? "zum Vorjahr"}</p>}
    </Card>
  );
}
