import Link from "next/link";
import type { OwnerStatement, StatementStatus } from "@/types";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon, DownloadIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/format";

const STATUS_LABEL: Record<StatementStatus, string> = {
  ready: "Bereit",
  processing: "In Erstellung",
  paid: "Ausgezahlt",
};

const STATUS_CLASS: Record<StatementStatus, string> = {
  ready: "bg-ink text-paper",
  processing: "border border-line text-ink-soft",
  paid: "bg-status-owner/15 text-status-owner",
};

export function RecentStatements({
  statements,
  propertyId,
}: {
  statements: OwnerStatement[];
  propertyId: string;
}) {
  return (
    <Card className="p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl italic text-ink">Letzte Abrechnungen</h2>
        <Link
          href={`/${propertyId}/abrechnungen`}
          className="flex items-center gap-1 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Alle Abrechnungen
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 divide-y divide-line">
        {statements.map((statement) => (
          <div key={statement.id} className="flex items-center justify-between gap-3 py-3.5">
            <div>
              <p className="text-sm font-medium text-ink">{statement.label}</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                {formatCurrency(statement.payoutAmount, statement.currency)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_CLASS[statement.status]}`}
              >
                {STATUS_LABEL[statement.status]}
              </span>
              <button
                type="button"
                disabled={statement.status !== "ready" && statement.status !== "paid"}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`${statement.label} herunterladen`}
              >
                <DownloadIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
