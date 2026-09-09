import { Card } from "@/components/ui/Card";
import { formatLongDayMonth } from "@/lib/dates";
import type { TodayStatus } from "@/services/overviewService";

export function TodayStatusCard({ status }: { status: TodayStatus }) {
  const arrivalsLabel = status.arrivals === 1 ? "Anreise" : "Anreisen";
  const departuresLabel = status.departures === 1 ? "Abreise" : "Abreisen";

  return (
    <Card className="p-5 shadow-none sm:p-6">
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">
        Heute, {formatLongDayMonth(status.date)}
      </p>
      <p className="mt-1.5 font-display text-lg italic text-ink">
        {status.occupiedUnits} von {status.totalUnits} Apartments belegt
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        {status.arrivals} {arrivalsLabel} · {status.departures} {departuresLabel}
      </p>
    </Card>
  );
}
