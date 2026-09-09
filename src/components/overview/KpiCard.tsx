import { Card } from "@/components/ui/Card";
import { TrendDownIcon, TrendUpIcon } from "@/components/ui/icons";
import { formatDelta } from "@/lib/format";

interface KpiCardProps {
  label: string;
  value: string;
  deltaPoints?: number;
  deltaLabel?: string;
}

export function KpiCard({ label, value, deltaPoints, deltaLabel }: KpiCardProps) {
  const showDelta = typeof deltaPoints === "number" && Number.isFinite(deltaPoints);
  const positive = (deltaPoints ?? 0) >= 0;

  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-[0.1em] text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-3xl italic text-ink">{value}</p>
      {showDelta && (
        <p
          className={`mt-2 flex items-center gap-1 text-xs font-medium ${
            positive ? "text-status-owner" : "text-status-blocked"
          }`}
        >
          {positive ? <TrendUpIcon className="h-3.5 w-3.5" /> : <TrendDownIcon className="h-3.5 w-3.5" />}
          {formatDelta(deltaPoints ?? 0, 1)} {deltaLabel ?? "zum Vorjahr"}
        </p>
      )}
    </Card>
  );
}
