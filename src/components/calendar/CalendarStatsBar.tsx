import type { CalendarStats } from "@/services/calendarService";
import { formatPercent } from "@/lib/format";
import { getDictionary, createTranslator, type Locale } from "@/i18n";

export function CalendarStatsBar({ stats, locale = "de" }: { stats: CalendarStats; locale?: Locale }) {
  const t = createTranslator(getDictionary(locale));
  const tiles = [
    { label: t("calendar.occupancyTile"), value: formatPercent(stats.occupancyPct, 0, locale) },
    {
      label: t("calendar.unitsOccupiedTodayTile"),
      value: `${stats.unitsOccupiedToday} / ${stats.unitsTotal}`,
    },
    { label: t("calendar.arrivalsNext7Tile"), value: String(stats.arrivalsNext7Days) },
    { label: t("calendar.departuresNext7Tile"), value: String(stats.departuresNext7Days) },
    { label: t("calendar.freeNightsTile"), value: String(stats.freeNights) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-2xl border border-line bg-paper px-4 py-3.5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">{tile.label}</p>
          <p className="mt-1 font-display text-xl italic text-ink">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}
