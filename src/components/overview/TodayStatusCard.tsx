import { Card } from "@/components/ui/Card";
import { formatLongDayMonth } from "@/lib/dates";
import { getDictionary, createTranslator, type Locale } from "@/i18n";
import type { TodayStatus } from "@/services/overviewService";

export function TodayStatusCard({ status, locale = "de" }: { status: TodayStatus; locale?: Locale }) {
  const t = createTranslator(getDictionary(locale));
  const arrivalsLabel = status.arrivals === 1 ? t("overview.arrival") : t("overview.arrivals");
  const departuresLabel = status.departures === 1 ? t("overview.departure") : t("overview.departures");

  return (
    <Card className="p-5 shadow-none sm:p-6">
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">
        {t("overview.todayLabel", { date: formatLongDayMonth(status.date, locale) })}
      </p>
      <p className="mt-1.5 font-display text-lg italic text-ink">
        {t("overview.apartmentsOccupied", { occupied: status.occupiedUnits, total: status.totalUnits })}
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        {status.arrivals} {arrivalsLabel} · {status.departures} {departuresLabel}
      </p>
    </Card>
  );
}
