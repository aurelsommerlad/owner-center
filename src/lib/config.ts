/**
 * V1 ships only mock data anchored around September 2026. Rather than using
 * the real system clock (which would drift away from the mock booking
 * window), the portal treats this date as "today" everywhere it needs a
 * reference point. Swap this for a real clock once live data lands.
 */
export const MOCK_TODAY = "2026-09-09";
