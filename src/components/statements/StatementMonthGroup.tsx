import type { StatementMonthGroup as StatementMonthGroupData } from "@/lib/statementDocuments";
import { statementMonthGroupLabel } from "@/lib/statementDocuments";
import { StatementDocumentRow } from "./StatementDocumentRow";
import { getDictionary, createTranslator, type Locale } from "@/i18n";

export function StatementMonthGroup({
  group,
  locale = "de",
}: {
  group: StatementMonthGroupData;
  locale?: Locale;
}) {
  const { ownerReportDocuments, invoiceDocuments, creditNoteDocuments, receiptDocuments, documentCount, newCount } = group;
  const t = createTranslator(getDictionary(locale));

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{statementMonthGroupLabel(group, locale)}</h3>
        {documentCount > 1 && (
          <span className="text-[11px] text-ink-soft">
            {documentCount}{" "}
            {documentCount === 1 ? t("statements.documentSingular") : t("statements.documentsPlural")}
            {newCount > 0 ? ` · ${t("statements.newSuffix", { count: newCount })}` : ""}
          </span>
        )}
      </div>

      {ownerReportDocuments.length > 0 && (
        <div className="mt-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-soft/70">{t("statements.ownerReport")}</p>
          <div className="flex flex-col divide-y divide-line/60">
            {ownerReportDocuments.map((document) => (
              <StatementDocumentRow key={document.id} document={document} emphasis="primary" locale={locale} />
            ))}
          </div>
        </div>
      )}

      {invoiceDocuments.length > 0 && (
        <div className="mt-1.5 border-t border-line/60 pt-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-soft/70">{t("statements.invoice")}</p>
          <div className="flex flex-col divide-y divide-line/60">
            {invoiceDocuments.map((document) => (
              <StatementDocumentRow key={document.id} document={document} emphasis="standard" locale={locale} />
            ))}
          </div>
        </div>
      )}

      {creditNoteDocuments.length > 0 && (
        <div className="mt-1.5 border-t border-line/60 pt-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-soft/70">{t("statements.creditNote")}</p>
          <div className="flex flex-col divide-y divide-line/60">
            {creditNoteDocuments.map((document) => (
              <StatementDocumentRow key={document.id} document={document} emphasis="standard" locale={locale} />
            ))}
          </div>
        </div>
      )}

      {receiptDocuments.length > 0 && (
        <div className="mt-1.5 border-t border-line/60 pt-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-soft/70">
            {t("statements.otherDocuments")}
          </p>
          <div className="flex flex-col">
            {receiptDocuments.map((document) => (
              <StatementDocumentRow key={document.id} document={document} emphasis="muted" locale={locale} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
