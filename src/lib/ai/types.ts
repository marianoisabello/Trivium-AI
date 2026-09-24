import type { AnalysisInput, Scenario } from "@/lib/types";

/**
 * Contrato único para generación de escenarios con IA. Los servicios nunca
 * importan un adapter concreto (mock.ts, vertex.ts) — siempre pasan por
 * getAIProvider() en provider.ts, así el proveedor real se enchufa sin tocar
 * servicios ni componentes.
 */
export interface AIProvider {
  generateScenarios(input: AnalysisInput): Promise<Scenario[]>;
}
