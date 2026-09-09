import type { OwnerStatement } from "@/types";
import { monthLabel } from "@/lib/dates";

interface StatementSeed {
  month: number;
  year: number;
  payoutAmount: number;
  status: OwnerStatement["status"];
}

const seeds: StatementSeed[] = [
  { month: 8, year: 2026, payoutAmount: 9842.15, status: "ready" },
  { month: 7, year: 2026, payoutAmount: 11230.4, status: "ready" },
  { month: 6, year: 2026, payoutAmount: 10380.9, status: "paid" },
  { month: 5, year: 2026, payoutAmount: 7940.6, status: "paid" },
  { month: 4, year: 2026, payoutAmount: 6215.3, status: "paid" },
  { month: 3, year: 2026, payoutAmount: 5480.75, status: "paid" },
  { month: 9, year: 2026, payoutAmount: 0, status: "processing" },
];

export const mockStatements: OwnerStatement[] = seeds.map((seed) => ({
  id: `statement-laeke-${seed.year}-${String(seed.month).padStart(2, "0")}`,
  propertyId: "property-laeke",
  month: seed.month,
  year: seed.year,
  label: `${monthLabel(seed.month)} ${seed.year}`,
  payoutAmount: seed.payoutAmount,
  currency: "EUR",
  status: seed.status,
  fileName: `LAEKE_Abrechnung_${seed.year}-${String(seed.month).padStart(2, "0")}.pdf`,
}));
