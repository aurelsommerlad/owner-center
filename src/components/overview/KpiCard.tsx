import { Card } from "@/components/ui/Card";
import { TrendDownIcon, TrendUpIcon } from "@/components/ui/icons";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatDelta } from "@/lib/format";
import type { Locale } from "@/i18n";

interface KpiCardProps {
  label: string;
  value: string;
  /** Optional, dezent ⓘ explanation next to the label - only for KPIs that genuinely need one (see InfoTooltip). */
  tooltip?: { label: string; title?: string; description: string };
  deltaPoints?: number;
  /** Decimal places for the delta number, e.g. 0 for counts, 1 for % or nights. */
  deltaFractionDigits?: number;
  /** Appended directly after the delta number, e.g. " %". */
  deltaSuffix?: string;
  deltaLabel?: string;
  /**
   * Set when the comparison period has no underlying data at all (as
   * opposed to `deltaPoints` simply being omitted for some other reason) -
   * renders a dezent "— Keine Vorjahresdaten" in place of a delta, rather
   * than silently showing nothing, so it never reads as "no change".
   */
  noComparisonData?: boolean;
  noComparisonDataLabel?: string;
  /** Slightly smaller type/padding for secondary KPI rows. */
  compact?: boolean;
  locale?: Locale;
}

export function KpiCard({
  label,
  value,
  tooltip,
  deltaPoints,
  deltaFractionDigits = 1,
  deltaSuffix = "",
  deltaLabel,
  noComparisonData = false,
  noComparisonDataLabel,
  compact = false,
  locale = "de",
}: KpiCardProps) {
  const showDelta = typeof deltaPoints === "number" && Number.isFinite(deltaPoints);
  const showNoComparisonData = !showDelta && noComparisonData;
  const positive = (deltaPoints ?? 0) >= 0;

  return (
    <Card className={compact ? "px-4 py-3 shadow-none" : "px-4 py-3.5 shadow-none sm:px-5 sm:py-4"}>
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-ink-soft">
        {label}
        {tooltip && <InfoTooltip label={tooltip.label} title={tooltip.title} description={tooltip.description} />}
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className={`font-display italic text-ink ${compact ? "text-lg" : "text-xl sm:text-2xl"}`}>{value}</p>
        {showDelta && (
          <span className="flex items-center gap-0.5 whitespace-nowrap text-xs text-ink-soft">
            {positive ? (
              <TrendUpIcon className="h-3 w-3 text-status-owner" />
            ) : (
              <TrendDownIcon className="h-3 w-3 text-status-blocked" />
            )}
            {formatDelta(deltaPoints ?? 0, deltaFractionDigits, locale)}
            {deltaSuffix}
          </span>
        )}
        {showNoComparisonData && <span className="whitespace-nowrap text-xs text-ink-soft/60">—</span>}
      </div>
      {showDelta && <p className="mt-0.5 text-[11px] text-ink-soft/70">{deltaLabel}</p>}
      {showNoComparisonData && <p className="mt-0.5 text-[11px] text-ink-soft/60">{noComparisonDataLabel}</p>}
    </Card>
  );
}
