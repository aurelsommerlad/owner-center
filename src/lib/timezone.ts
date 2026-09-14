/**
 * Central, single place the Owner Center resolves "what time of day is it
 * right now" for wall-clock-dependent UI (currently just the dashboard
 * greeting). Deliberately never uses the server process's own local
 * time/UTC directly - a Vercel function can run in any region, so "new
 * Date().getHours()" would be meaningless.
 *
 * V1 has no per-user or per-property timezone yet, so every caller gets the
 * same fixed default - but `timeOfDayInTimeZone` takes the IANA zone as a
 * parameter specifically so a later per-user/property timezone can be
 * threaded through here without changing this function's shape.
 */
export const OWNER_CENTER_DEFAULT_TIME_ZONE = "Europe/Berlin";

export type TimeOfDay = "morning" | "afternoon" | "evening";

/**
 * 05:00-11:59 -> morning, 12:00-17:59 -> afternoon, 18:00-04:59 -> evening,
 * evaluated in `timeZone` (IANA name, e.g. "Europe/Berlin").
 */
export function timeOfDayInTimeZone(date: Date, timeZone: string = OWNER_CENTER_DEFAULT_TIME_ZONE): TimeOfDay {
  const formatted = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).format(date);
  // Some ICU implementations render midnight as "24" rather than "0" with hour12:false.
  const hour = Number(formatted) % 24;

  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}
