import type { OwnerStatement } from "@/types";
import { mockStatements } from "@/data/mock";

export async function getStatementsForProperty(propertyId: string): Promise<OwnerStatement[]> {
  return mockStatements
    .filter((statement) => statement.propertyId === propertyId)
    .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));
}

export async function getLatestStatements(
  propertyId: string,
  count: number
): Promise<OwnerStatement[]> {
  const statements = await getStatementsForProperty(propertyId);
  return statements.filter((statement) => statement.status !== "processing").slice(0, count);
}
