import type { AdminIntegration } from "@/types/admin";
import { adminIntegrations } from "@/data/admin";

export async function getIntegrations(): Promise<AdminIntegration[]> {
  return adminIntegrations;
}
