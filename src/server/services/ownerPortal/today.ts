import "server-only";
import { today } from "@/lib/dates";
import { MOCK_TODAY } from "@/lib/config";
import { isApaleoConfigured } from "@/server/integrations/apaleo/config";

/**
 * "Today" reference date for the Owner Portal: the real system clock once
 * apaleo is live (so "Heute"/An- und Abreisen track the actual date), the
 * fixed mock date otherwise - matching the anchor the V1 mock reservation
 * fixtures were authored around (see lib/config.ts#MOCK_TODAY).
 */
export function ownerPortalToday(): string {
  return isApaleoConfigured() ? today() : MOCK_TODAY;
}
