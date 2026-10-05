import { notFound } from "next/navigation";
import { getProperty, getPropertiesForOwner } from "@/services/propertyService";
import {
  getStatementDocuments,
  getStatementDocumentYears,
  markStatementDocumentsViewed,
} from "@/services/statementDocumentService";
import { listAccountingAccessGrants } from "@/services/statementAccountingAccessService";
import { getAccountingDownloadEvents } from "@/services/statementDownloadTrackingService";
import { hadStatementDataError } from "@/services/statementDataError";
import { today } from "@/lib/dates";
import {
  computeDocumentAccountingDownloadStatus,
  computeMonthAccountingDownloadStatus,
  groupStatementDocumentsByMonth,
} from "@/lib/statementDocuments";
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
  // "Zugang für Buchhaltung" is owner-only - a restricted accounting login
  // (ownerUserRole === "accounting") never sees or manages it, even during
  // its own visit to this very page (see components/statements/
  // AccountingAccessSection.tsx and this file's own doc comment on
  // enforcement living in the Server Actions, not here). The "Buchhaltung:
  // heruntergeladen"-style badges below are the same owner-only feature -
  // they'd be meaningless noise on the accounting login's own view of its
  // own downloads - and are additionally gated on the owner having set up
  // at least one accounting-access grant at all, so a page with no
  // accounting access configured never shows "noch nicht heruntergeladen"
  // clutter for a feature nobody uses.
  const accountingAccessGrants =
    context.ownerUserRole === "owner" ? await listAccountingAccessGrants(context.ownerId) : null;
  const ownerProperties =
    context.ownerUserRole === "owner" ? await getPropertiesForOwner(context.ownerId) : [];
  const hasAccountingGrants = !!accountingAccessGrants && accountingAccessGrants.length > 0;

  // Fetched once for the whole page and handed to the two pure helpers
  // below (lib/statementDocuments.ts) - the single place this "did
  // accounting download X" logic is computed, never duplicated into either
  // component that renders its result (StatementMonthAccordion,
  // StatementDocumentRow).
  const accountingDownloadEvents = hasAccountingGrants
    ? await getAccountingDownloadEvents(documents.map((document) => document.id))
    : [];
  const documentsForDisplay = hasAccountingGrants
    ? documents.map((document) => ({
        ...document,
        accountingDownload: computeDocumentAccountingDownloadStatus(document.id, accountingDownloadEvents),
      }))
    : documents;

  const monthGroups = groupStatementDocumentsByMonth(documentsForDisplay);
  const monthAccountingDownloadStatus = hasAccountingGrants
    ? new Map(
        monthGroups.map((group) => [
          `${group.year}-${group.month}`,
          computeMonthAccountingDownloadStatus(group, accountingDownloadEvents),
        ])
      )
    : new Map();
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
              accountingDownloadStatus={monthAccountingDownloadStatus.get(`${group.year}-${group.month}`)}
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
