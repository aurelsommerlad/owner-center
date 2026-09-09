import type { BookingSourceBreakdown } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import { CHANNEL_COLORS } from "@/data/mock/bookingChannels";

export function BookingSourceTable({ sources }: { sources: BookingSourceBreakdown[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.06em] text-ink-soft">
            <th className="py-2.5 font-medium">Buchungsquelle</th>
            <th className="py-2.5 text-right font-medium">Buchungen</th>
            <th className="py-2.5 text-right font-medium">Buchungsumsatz</th>
            <th className="py-2.5 text-right font-medium">Anteil</th>
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
                  {row.label}
                </span>
              </td>
              <td className="whitespace-nowrap py-3 text-right text-ink-soft">{row.bookingCount}</td>
              <td className="whitespace-nowrap py-3 text-right text-ink-soft">{formatCurrency(row.revenue)}</td>
              <td className="whitespace-nowrap py-3 text-right text-ink-soft">
                {formatNumber(row.revenueShare, 1)} %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
