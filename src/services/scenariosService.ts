import type { AnalysisInput, Scenario } from "@/lib/types";
import { generateScenariosFn } from "@/services/scenariosService.functions";

/**
 * Genera y persiste escenarios llamando a la server function real
 * (scenariosService.functions.ts). El endpoint valida input y salida con
 * Zod y guarda análisis + escenarios en Supabase.
 */
export async function generateScenarios(input: AnalysisInput): Promise<Scenario[]> {
  return generateScenariosFn({ data: input });
}
