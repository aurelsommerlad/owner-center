import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon } from "@/components/ui/icons";
import { OccupancyTimeline, TimelineLegend } from "@/components/calendar/OccupancyTimeline";
import type { OccupancyPreview } from "@/services/overviewService";
import { MOCK_TODAY } from "@/lib/config";

export function OccupancyPreviewCard({
  preview,
  propertyId,
}: {
  preview: OccupancyPreview;
  propertyId: string;
}) {
  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl italic text-ink">Belegung nächste 14 Tage</h2>
        </div>
        <Link
          href={`/${propertyId}/kalender`}
          className="flex items-center gap-1 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Zum Kalender
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-5">
        <OccupancyTimeline
          days={preview.days}
          rows={preview.rows}
          today={MOCK_TODAY}
          cellWidth={40}
          unitColumnWidth={116}
        />
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <TimelineLegend />
      </div>
    </Card>
  );
}
