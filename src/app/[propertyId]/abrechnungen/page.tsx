import { notFound } from "next/navigation";
import { getProperty, getPropertiesForOwner } from "@/services/propertyService";
import {
  getStatementDocuments,
  getStatementDocumentYears,
  markStatementDocumentsViewed,
} from "@/services/statementDocumentService";
import { listAccountingAccessGrants } from "@/services/statementAccountingAccessService";
import { hadStatementDataError } from "@/services/statementDataError";
import { today } from "@/lib/dates";
import { groupStatementDocumentsByMonth } from "@/lib/statementDocuments";
import { StatementYearFilter } from "@/components/statements/StatementYearFilter";
import { StatementMonthAccordion } from "@/components/statements/StatementMonthAccordion";
import { AccountingAccessSection } from "@/components/statements/AccountingAccessSection";
import { DataUnavailableNotice } from "@/components/ui/DataUnavailableNotice";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";
import { requireEffectiveOwnerContext } from "@/server/ownerContext";

export default async function AbrechnungenPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ jahr?: string }>;
}) {
  const { propertyId } = await params;
  const query = await searchParams;

  const property = await getProperty(propertyId, { allowAccountingRole: true });
  if (!property) notFound();

  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));

  const currentYear = Number(today().slice(0, 4));
  const years = await getStatementDocumentYears(propertyId);
  const requestedYear = Number(query.jahr);
  const selectedYear = years.includes(requestedYear) ? requestedYear : currentYear;

  const documents = await getStatementDocuments(propertyId, selectedYear);
  // An admin "Als Owner ansehen" preview must see exactly what the owner
  // would see (including "Neu" badges) without itself leaving a mark - only
  // a real owner visit clears "Neu" (see server/ownerContext.ts and the
  // matching guard in the download route, api/documents/[id]/download).
  const context = await requireEffectiveOwnerContext();
  if (!context.isImpersonation) {
    await markStatementDocumentsViewed(documents.map((document) => document.id));
  }
  const monthGroups = groupStatementDocumentsByMonth(documents);
  // "Zugang für Buchhaltung" is owner-only - a restricted accounting login
  // (ownerUserRole === "accounting") never sees or manages it, even during
  // its own visit to this very page (see components/statements/
  // AccountingAccessSection.tsx and this file's own doc comment on
  // enforcement living in the Server Actions, not here).
  const accountingAccessGrants =
    context.ownerUserRole === "owner" ? await listAccountingAccessGrants(context.ownerId) : null;
  const ownerProperties =
    context.ownerUserRole === "owner" ? await getPropertiesForOwner(context.ownerId) : [];
  // At most one month starts expanded: the newest one that still has
  // unseen documents. Everything else stays collapsed.
  const defaultOpenGroup = monthGroups.find((group) => group.newCount > 0);
  const dataError = hadStatementDataError();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink sm:text-3xl">{t("statements.title")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("statements.subtitle")}</p>
      </div>

      {dataError && <DataUnavailableNotice text={t("common.dataUnavailable")} />}

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

      {accountingAccessGrants && (
        <AccountingAccessSection propertyId={propertyId} grants={accountingAccessGrants} properties={ownerProperties} />
      )}
    </div>
  );
}
