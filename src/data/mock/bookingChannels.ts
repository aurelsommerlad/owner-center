import type { BookingSourceBreakdown, BookingSourceId } from "@/types";

/**
 * Mock sales-channel mix. `targetShare` is the illustrative revenue split
 * used to derive a breakdown for any period total (see
 * computeBookingSourceBreakdown below) - swap this list for the real
 * apaleo channel mix later; nothing downstream needs to change since
 * consumers only ever see `BookingSourceBreakdown[]`.
 */
interface ChannelDefinition {
  source: BookingSourceId;
  label: string;
  targetShare: number;
}

export const BOOKING_CHANNELS: ChannelDefinition[] = [
  { source: "direct", label: "Direktbuchungen", targetShare: 0.45 },
  { source: "booking_com", label: "Booking.com", targetShare: 0.437 },
  { source: "airbnb", label: "Airbnb", targetShare: 0.084 },
  { source: "other", label: "Sonstige", targetShare: 0.029 },
];

/**
 * Muted, brand-safe categorical set (validated for adjacent-pair CVD
 * separation and contrast against the paper surface) - fixed per channel
 * identity, not by current rank, so a channel keeps its colour even as
 * shares shift period to period. Extend this map, not the chart/table
 * components, when a new channel id appears.
 */
export const CHANNEL_COLORS: Record<BookingSourceId, string> = {
  direct: "#1f5c94",
  booking_com: "#b8623f",
  airbnb: "#6b4a8f",
  other: "#8c7420",
};

/**
 * Splits a period's total revenue/bookings across the known channels using
 * the target shares above. The last channel absorbs whatever rounding
 * remainder is left over, so the rows always sum EXACTLY to the totals
 * passed in - never just approximately.
 */
export function computeBookingSourceBreakdown(
  totalRevenue: number,
  totalBookings: number
): BookingSourceBreakdown[] {
  let revenueRemaining = totalRevenue;
  let bookingsRemaining = totalBookings;

  const rows = BOOKING_CHANNELS.map((channel, index) => {
    const isLast = index === BOOKING_CHANNELS.length - 1;
    const revenue = isLast
      ? Math.round(revenueRemaining * 100) / 100
      : Math.round(totalRevenue * channel.targetShare * 100) / 100;
    const bookingCount = isLast ? bookingsRemaining : Math.round(totalBookings * channel.targetShare);

    revenueRemaining = Math.round((revenueRemaining - revenue) * 100) / 100;
    bookingsRemaining -= bookingCount;

    return {
      source: channel.source,
      label: channel.label,
      revenue,
      bookingCount,
      revenueShare: 0,
    };
  });

  return rows.map((row) => ({
    ...row,
    revenueShare: totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0,
  }));
}
