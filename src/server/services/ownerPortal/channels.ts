import "server-only";
import type { BookingSourceId } from "@/types";

/**
 * Maps a live apaleo reservation's `channelCode` (+ `source`, for the
 * generic "ChannelManager" pass-through code) onto the app's four owner-
 * facing categories. Grounded against real apaleo data, not guessed:
 *
 * - `Direct` and `Ibe` (apaleo's own Internet Booking Engine - the
 *   property's own booking widget, not a third-party OTA) both count as
 *   "Direktbuchung".
 * - `BookingCom` is always Booking.com.
 * - `ChannelManager` is a generic code for any channel-manager-connected
 *   OTA - the actual channel name only shows up in the free-text `source`
 *   field (observed: "Booking.com"), so that string is inspected for the
 *   two channels the UI breaks out by name.
 * - Every other apaleo channel code (Expedia, Homelike, Hrs, AltoVita,
 *   DesVu, Gimsi) and a missing/unrecognized `source` fall into "Sonstige"
 *   rather than being guessed at.
 */
export function classifyBookingChannel(channelCode: string | null, source: string | null): BookingSourceId {
  const normalizedSource = source?.toLowerCase() ?? "";

  if (channelCode === "Direct" || channelCode === "Ibe") return "direct";
  if (channelCode === "BookingCom") return "booking_com";

  if (channelCode === "ChannelManager") {
    if (normalizedSource.includes("airbnb")) return "airbnb";
    if (normalizedSource.includes("booking")) return "booking_com";
    return "other";
  }

  return "other";
}
