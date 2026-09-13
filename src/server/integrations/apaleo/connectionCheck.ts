import "server-only";
import { prisma } from "@/server/db";
import { isApaleoConfigured } from "./config";
import { listApaleoProperties } from "./propertyService";
import { describeApaleoError } from "./errors";

const CHECK_ID = "apaleo";

export interface ApaleoConnectionStatus {
  configured: boolean;
  lastCheck: {
    checkedAt: string;
    success: boolean;
    propertyCount: number | null;
    errorMessage: string | null;
  } | null;
}

/** Current configured-state plus the persisted result of the last "Verbindung testen" run, if any. */
export async function getApaleoConnectionStatus(): Promise<ApaleoConnectionStatus> {
  const record = await prisma.apaleoConnectionCheck.findUnique({ where: { id: CHECK_ID } });
  return {
    configured: isApaleoConfigured(),
    lastCheck: record
      ? {
          checkedAt: record.checkedAt.toISOString(),
          success: record.success,
          propertyCount: record.propertyCount,
          errorMessage: record.errorMessage,
        }
      : null,
  };
}

/**
 * Performs a real live call to apaleo (listing properties) and persists the
 * outcome, so "letzte erfolgreiche Prüfung" survives across requests/
 * serverless instances. Never throws - failures are recorded, not thrown.
 */
export async function testApaleoConnection(): Promise<ApaleoConnectionStatus["lastCheck"]> {
  try {
    const properties = await listApaleoProperties();
    const record = await prisma.apaleoConnectionCheck.upsert({
      where: { id: CHECK_ID },
      create: { id: CHECK_ID, success: true, propertyCount: properties.length, errorMessage: null },
      update: { success: true, propertyCount: properties.length, errorMessage: null },
    });
    return {
      checkedAt: record.checkedAt.toISOString(),
      success: true,
      propertyCount: properties.length,
      errorMessage: null,
    };
  } catch (err) {
    const message = describeApaleoError(err);
    const record = await prisma.apaleoConnectionCheck.upsert({
      where: { id: CHECK_ID },
      create: { id: CHECK_ID, success: false, propertyCount: null, errorMessage: message },
      update: { success: false, propertyCount: null, errorMessage: message },
    });
    return {
      checkedAt: record.checkedAt.toISOString(),
      success: false,
      propertyCount: null,
      errorMessage: message,
    };
  }
}
