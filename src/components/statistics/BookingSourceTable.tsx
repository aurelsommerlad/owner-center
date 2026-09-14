import type { BookingSourceBreakdown } from "@/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { CHANNEL_COLORS } from "@/data/mock/bookingChannels";
import { getDictionary, createTranslator, type Locale } from "@/i18n";

function channelLabel(row: BookingSourceBreakdown, dict: ReturnType<typeof getDictionary>): string {
  if (row.source === "direct") return dict.statistics.channelDirect;
  if (row.source === "other") return dict.statistics.channelOther;
  return row.label;
}

export function BookingSourceTable({
  sources,
  locale = "de",
}: {
  sources: BookingSourceBreakdown[];
  locale?: Locale;
}) {
  const dict = getDictionary(locale);
  const t = createTranslator(dict);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.06em] text-ink-soft">
            <th className="py-2.5 font-medium">{t("statistics.tableSource")}</th>
            <th className="py-2.5 text-right font-medium">{t("statistics.tableBookings")}</th>
            <th className="py-2.5 text-right font-medium">{t("statistics.tableRevenue")}</th>
            <th className="py-2.5 text-right font-medium">{t("statistics.tableShare")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sources.map((row) => (
            <tr key={row.source}>
              <td className="whitespace-nowrap py-3 font-medium text-ink">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: CHANNEL_COLORS[row.source] }}
                    aria-hidden="true"
                  />
                  {channelLabel(row, dict)}
                </span>
              </td>
              <td className="whitespace-nowrap py-3 text-right text-ink-soft">{row.bookingCount}</td>
              <td className="whitespace-nowrap py-3 text-right text-ink-soft">
                {formatCurrency(row.revenue, "EUR", 2, locale)}
              </td>
              <td className="whitespace-nowrap py-3 text-right text-ink-soft">
                {formatPercent(row.revenueShare, 1, locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
