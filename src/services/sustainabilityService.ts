import type { Initiative, ResourcesInput } from "@/lib/types";
import { generateInitiativesFn } from "@/services/sustainabilityService.functions";

/**
 * Genera y persiste iniciativas de sustentabilidad llamando a la server
 * function real (sustainabilityService.functions.ts). El endpoint valida
 * input y salida con Zod y guarda iniciativas + KPIs en Supabase con ids
 * reales de DB.
 */
export async function generateInitiatives(input: ResourcesInput): Promise<Initiative[]> {
  return generateInitiativesFn({ data: input });
}
