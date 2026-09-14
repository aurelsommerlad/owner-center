import { notFound } from "next/navigation";
import { getProperty } from "@/services/propertyService";
import {
  getStatementDocuments,
  getStatementDocumentYears,
  markStatementDocumentsViewed,
} from "@/services/statementDocumentService";
import { MOCK_TODAY } from "@/lib/config";
import { groupStatementDocumentsByMonth } from "@/lib/statementDocuments";
import { StatementYearFilter } from "@/components/statements/StatementYearFilter";
import { StatementMonthAccordion } from "@/components/statements/StatementMonthAccordion";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

export default async function AbrechnungenPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ jahr?: string }>;
}) {
  const { propertyId } = await params;
  const query = await searchParams;

  const property = await getProperty(propertyId);
  if (!property) notFound();

  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));

  const currentYear = Number(MOCK_TODAY.slice(0, 4));
  const years = await getStatementDocumentYears(propertyId);
  const requestedYear = Number(query.jahr);
  const selectedYear = years.includes(requestedYear) ? requestedYear : currentYear;

  const documents = await getStatementDocuments(propertyId, selectedYear);
  await markStatementDocumentsViewed(documents.map((document) => document.id));
  const monthGroups = groupStatementDocumentsByMonth(documents);
  // At most one month starts expanded: the newest one that still has
  // unseen documents. Everything else stays collapsed.
  const defaultOpenGroup = monthGroups.find((group) => group.newCount > 0);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink sm:text-3xl">{t("statements.title")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("statements.subtitle")}</p>
      </div>

      <StatementYearFilter propertyId={propertyId} years={years} selectedYear={selectedYear} />

      {monthGroups.length === 0 ? (
        <p className="text-sm text-ink-soft">{t("statements.empty", { year: selectedYear })}</p>
      ) : (
        <div className="flex flex-col divide-y divide-line">
          {monthGroups.map((group) => (
            <StatementMonthAccordion
              key={`${group.year}-${group.month}`}
              group={group}
              locale={locale}
              defaultOpen={group === defaultOpenGroup}
            />
          ))}
        </div>
      )}
    </div>
  );
}
