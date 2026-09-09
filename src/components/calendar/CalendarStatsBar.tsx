import type { CalendarStats } from "@/services/calendarService";
import { formatPercent } from "@/lib/format";

export function CalendarStatsBar({ stats }: { stats: CalendarStats }) {
  const tiles = [
    { label: "Auslastung", value: formatPercent(stats.occupancyPct) },
    {
      label: "Einheiten heute belegt",
      value: `${stats.unitsOccupiedToday} / ${stats.unitsTotal}`,
    },
    { label: "Anreisen (7 Tage)", value: String(stats.arrivalsNext7Days) },
    { label: "Abreisen (7 Tage)", value: String(stats.departuresNext7Days) },
    { label: "Freie Nächte", value: String(stats.freeNights) },
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
