import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon } from "@/components/ui/icons";
import { statusDotClass, statusLabel } from "@/components/ui/StatusBadge";
import type { UnitStatusOverview } from "@/services/overviewService";

export function UnitStatusOverviewCard({
  overview,
  propertyId,
}: {
  overview: UnitStatusOverview;
  propertyId: string;
}) {
  const { counts } = overview;
  const summaryParts = [
    counts.occupied > 0 ? `${counts.occupied} belegt` : null,
    counts.free > 0 ? `${counts.free} frei` : null,
    counts.ownerUse > 0 ? `${counts.ownerUse} Eigennutzung` : null,
    counts.blocked > 0 ? `${counts.blocked} blockiert` : null,
  ].filter(Boolean);

  return (
    <Card className="p-5 shadow-none sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg italic text-ink">Einheiten</h2>
        <Link
          href={`/${propertyId}/einheiten`}
          className="flex items-center gap-1 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Alle Einheiten
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
        {overview.entries.map(({ unit, status }) => (
          <div key={unit.id} className="flex items-center gap-2 py-1 text-sm">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotClass(status)}`} />
            <span className="text-ink">{unit.name}</span>
            <span className="text-ink-soft/50">·</span>
            <span className="text-ink-soft">{statusLabel(status)}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">
        {summaryParts.join(" · ")}
      </p>
    </Card>
  );
}
