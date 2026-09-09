import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon } from "@/components/ui/icons";
import { formatDayMonth } from "@/lib/dates";
import { MOCK_TODAY } from "@/lib/config";
import type { ArrivalDepartureDay, ArrivalsDeparturesSummary } from "@/services/overviewService";

function dayLabel(date: string): string {
  return date === MOCK_TODAY ? "Heute" : formatDayMonth(date);
}

function DayList({
  days,
  singular,
  plural,
  emptyLabel,
}: {
  days: ArrivalDepartureDay[];
  singular: string;
  plural: string;
  emptyLabel: string;
}) {
  if (days.length === 0) {
    return <p className="text-xs text-ink-soft/60">{emptyLabel}</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {days.map((day) => (
        <li key={day.date} className="flex items-center justify-between gap-3 text-xs">
          <span className="text-ink-soft">{dayLabel(day.date)}</span>
          <span className="text-ink">
            {day.units} {day.units === 1 ? singular : plural}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ArrivalsDeparturesCard({
  summary,
  propertyId,
}: {
  summary: ArrivalsDeparturesSummary;
  propertyId: string;
}) {
  return (
    <Card className="p-5 shadow-none sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg italic text-ink">An- &amp; Abreisen</h2>
        <span className="text-[11px] text-ink-soft/70">nächste 7 Tage</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Anreisen</p>
          <p className="mt-0.5 font-display text-xl italic text-ink">{summary.arrivalsCount}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Abreisen</p>
          <p className="mt-0.5 font-display text-xl italic text-ink">{summary.departuresCount}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-3.5">
        <DayList
          days={summary.arrivalDays}
          singular="Anreise"
          plural="Anreisen"
          emptyLabel="Keine Anreisen"
        />
        <DayList
          days={summary.departureDays}
          singular="Abreise"
          plural="Abreisen"
          emptyLabel="Keine Abreisen"
        />
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <Link
          href={`/${propertyId}/kalender`}
          className="flex items-center gap-1 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Alle anzeigen
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}
