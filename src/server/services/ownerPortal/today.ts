import "server-only";
import { today } from "@/lib/dates";
import { MOCK_TODAY } from "@/lib/config";
import { isMockFallbackAllowed } from "@/server/integrations/apaleo/config";

/**
 * "Today" reference date for the Owner Portal: the fixed mock date only in
 * local development without apaleo credentials (matching the anchor the V1
 * mock reservation fixtures were authored around - see
 * lib/config.ts#MOCK_TODAY), the real system clock in every other case -
 * including production with apaleo unconfigured, where showing a frozen
 * fake date would itself be exactly the "mock data in production" this
 * portal must never show (see isMockFallbackAllowed). Never itself a
 * failure mode worth flagging via errorState.ts - the real clock is always
 * available regardless of apaleo's configuration.
 */
export function ownerPortalToday(): string {
  return isMockFallbackAllowed() ? MOCK_TODAY : today();
}
