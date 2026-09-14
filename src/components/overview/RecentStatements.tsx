import Link from "next/link";
import type { OwnerStatement, StatementStatus } from "@/types";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon, DownloadIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/format";
import { getDictionary, createTranslator, type Locale } from "@/i18n";

const STATUS_CLASS: Record<StatementStatus, string> = {
  ready: "bg-ink text-paper",
  processing: "border border-line text-ink-soft",
  paid: "bg-status-owner/15 text-status-owner",
};

export function RecentStatements({
  statements,
  propertyId,
  locale = "de",
}: {
  statements: OwnerStatement[];
  propertyId: string;
  locale?: Locale;
}) {
  const t = createTranslator(getDictionary(locale));
  const statusLabel: Record<StatementStatus, string> = {
    ready: t("overview.statementReady"),
    processing: t("overview.statementProcessing"),
    paid: t("overview.statementPaid"),
  };

  return (
    <Card className="p-5 shadow-none sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg italic text-ink">{t("overview.latestStatement")}</h2>
        <Link
          href={`/${propertyId}/abrechnungen`}
          className="flex items-center gap-1 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
        >
          {t("overview.allStatements")}
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-2 divide-y divide-line">
        {statements.map((statement) => (
          <div key={statement.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium text-ink">{statement.label}</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                {formatCurrency(statement.payoutAmount, statement.currency, 2, locale)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_CLASS[statement.status]}`}
              >
                {statusLabel[statement.status]}
              </span>
              <button
                type="button"
                disabled={statement.status !== "ready" && statement.status !== "paid"}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t("overview.downloadStatement", { label: statement.label })}
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
