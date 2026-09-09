import { notFound } from "next/navigation";
import { getProperty } from "@/services/propertyService";
import { getUnitsForProperty } from "@/services/unitService";
import { getCalendarMonth } from "@/services/calendarService";
import { parseIsoDate } from "@/lib/dates";
import { MOCK_TODAY } from "@/lib/config";
import { Card } from "@/components/ui/Card";
import { CalendarControls } from "@/components/calendar/CalendarControls";
import { CalendarStatsBar } from "@/components/calendar/CalendarStatsBar";
import { OccupancyTimeline, TimelineLegend } from "@/components/calendar/OccupancyTimeline";

export default async function KalenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ year?: string; month?: string; unit?: string }>;
}) {
  const { propertyId } = await params;
  const query = await searchParams;

  const property = await getProperty(propertyId);
  if (!property) notFound();

  const todayDate = parseIsoDate(MOCK_TODAY);
  const year = query.year ? Number(query.year) : todayDate.getUTCFullYear();
  const month = query.month ? Number(query.month) : todayDate.getUTCMonth() + 1;
  const selectedUnitId = query.unit;

  const [units, calendar] = await Promise.all([
    getUnitsForProperty(propertyId),
    getCalendarMonth(propertyId, year, month, selectedUnitId),
  ]);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink sm:text-3xl">Kalender</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Belegungsübersicht für {property.name} · {property.location.city}
        </p>
      </div>

      <CalendarStatsBar stats={calendar.stats} />

      <Card className="p-6 sm:p-7">
        <CalendarControls
          propertyId={propertyId}
          year={year}
          month={month}
          units={units}
          selectedUnitId={selectedUnitId}
        />

        <div className="mt-5">
          <OccupancyTimeline days={calendar.days} rows={calendar.rows} today={MOCK_TODAY} />
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <TimelineLegend />
        </div>
      </Card>
    </div>
  );
}
