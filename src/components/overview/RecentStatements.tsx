import Link from "next/link";
import type { StatementMonthGroup } from "@/lib/statementDocuments";
import { statementMonthGroupLabel, statementMonthIsComplete } from "@/lib/statementDocuments";
import { StatementDocumentRow } from "@/components/statements/StatementDocumentRow";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getDictionary, createTranslator, type Locale } from "@/i18n";

/**
 * The newest published statement month, as a compact preview - the same
 * per-document rows (Neu status, download button, downloaded-on date) as
 * the Abrechnungen page, so the two stay visually and behaviorally in
 * sync. `group` is `null` when nothing has been published yet.
 */
export function RecentStatements({
  group,
  propertyId,
  locale = "de",
}: {
  group: StatementMonthGroup | null;
  propertyId: string;
  locale?: Locale;
}) {
  const t = createTranslator(getDictionary(locale));
  const coreDocuments = group
    ? [...group.ownerReportDocuments, ...group.invoiceDocuments, ...group.creditNoteDocuments]
    : [];

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

      {group ? (
        <>
          <p className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
            <span className="font-medium text-ink">{statementMonthGroupLabel(group, locale)}</span>
            {statementMonthIsComplete(group) && (
              <span className="font-medium text-[#52664E]">{t("statements.complete")}</span>
            )}
          </p>
          <div className="mt-1 divide-y divide-line">
            {coreDocuments.map((document) => (
              <StatementDocumentRow
                key={document.id}
                document={document}
                locale={locale}
                primary={document.documentType === "owner_report"}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">{t("overview.noStatementsYet")}</p>
      )}
    </Card>
  );
}
