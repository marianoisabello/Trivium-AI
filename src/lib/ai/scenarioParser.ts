import { scenariosResponseSchema } from "@/lib/schemas";
import type { Scenario } from "@/lib/types";

export class ScenarioParseError extends Error {}

/**
 * Parsea y valida la respuesta cruda del LLM (debe ser un JSON string con
 * un array de ≥3 escenarios). Separado de vertex.ts para poder testearlo
 * con respuestas simuladas (válidas y malformadas) sin llamar a Vertex real.
 */
export function parseScenariosResponse(raw: string): Scenario[] {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new ScenarioParseError(
      `Respuesta del modelo no es JSON válido: ${(error as Error).message}`,
    );
  }

  const result = scenariosResponseSchema.safeParse(json);
  if (!result.success) {
    throw new ScenarioParseError(
      `Respuesta del modelo no cumple el schema de escenarios: ${result.error.message}`,
    );
  }

  return result.data;
}
