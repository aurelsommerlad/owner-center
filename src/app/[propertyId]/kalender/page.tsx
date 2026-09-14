import { notFound } from "next/navigation";
import { getProperty } from "@/services/propertyService";
import { getUnitsForProperty } from "@/services/unitService";
import { getCalendarData } from "@/services/calendarService";
import type { CalendarViewType } from "@/lib/calendarView";
import { ownerPortalToday } from "@/server/services/ownerPortal/today";
import { hadOwnerPortalDataError } from "@/server/services/ownerPortal/errorState";
import { Card } from "@/components/ui/Card";
import { DataUnavailableNotice } from "@/components/ui/DataUnavailableNotice";
import { CalendarControls } from "@/components/calendar/CalendarControls";
import { CalendarStatsBar } from "@/components/calendar/CalendarStatsBar";
import { OccupancyTimeline, TimelineLegend } from "@/components/calendar/OccupancyTimeline";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

const VALID_VIEWS: CalendarViewType[] = ["month", "twoWeeks", "week"];

export default async function KalenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ view?: string; anchor?: string; unit?: string }>;
}) {
  const { propertyId } = await params;
  const query = await searchParams;

  const property = await getProperty(propertyId);
  if (!property) notFound();

  const view: CalendarViewType = VALID_VIEWS.includes(query.view as CalendarViewType)
    ? (query.view as CalendarViewType)
    : "month";
  const today = ownerPortalToday();
  const anchor = query.anchor ?? today;
  const selectedUnitId = query.unit;

  const locale = await getOwnerLocale();
  const dict = getDictionary(locale);
  const t = createTranslator(dict);

  const [units, calendar] = await Promise.all([
    getUnitsForProperty(propertyId),
    getCalendarData(propertyId, view, anchor, selectedUnitId, locale),
  ]);
  const dataError = hadOwnerPortalDataError();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink sm:text-3xl">{t("calendar.title")}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {t("calendar.occupancyOverviewFor", { name: property.name, city: property.location.city })}
        </p>
      </div>

      {dataError && <DataUnavailableNotice text={t("common.dataUnavailable")} />}

      <CalendarStatsBar stats={calendar.stats} locale={locale} />

      <Card className="p-6 sm:p-7">
        <CalendarControls
          propertyId={propertyId}
          view={calendar.view}
          anchor={calendar.anchor}
          label={calendar.label}
          units={units}
          selectedUnitId={selectedUnitId}
          today={today}
        />

        <div className="mt-5">
          <OccupancyTimeline days={calendar.days} rows={calendar.rows} today={today} locale={locale} />
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <TimelineLegend locale={locale} />
        </div>
      </Card>
    </div>
  );
}
