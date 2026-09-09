import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon } from "@/components/ui/icons";
import { OccupancyTimeline, TimelineLegend, getPresentStatuses } from "@/components/calendar/OccupancyTimeline";
import type { OccupancyPreview } from "@/services/overviewService";
import { MOCK_TODAY } from "@/lib/config";

export function OccupancyPreviewCard({
  preview,
  propertyId,
}: {
  preview: OccupancyPreview;
  propertyId: string;
}) {
  const presentStatuses = getPresentStatuses(preview.days, preview.rows);

  return (
    <Card className="p-5 shadow-none sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg italic text-ink">Belegung nächste 14 Tage</h2>
        <Link
          href={`/${propertyId}/kalender`}
          className="flex items-center gap-1 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Zum Kalender
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4">
        <OccupancyTimeline
          days={preview.days}
          rows={preview.rows}
          today={MOCK_TODAY}
          cellWidth={40}
          rowHeight={42}
          unitColumnWidth={112}
          tone="subtle"
        />
      </div>

      {presentStatuses.length > 1 && (
        <div className="mt-4 border-t border-line pt-3.5">
          <TimelineLegend statuses={presentStatuses} tone="subtle" />
        </div>
      )}
    </Card>
  );
}
