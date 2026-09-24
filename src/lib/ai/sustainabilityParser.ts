import { initiativesDraftResponseSchema } from "@/lib/schemas";
import type { InitiativeDraft } from "@/lib/ai/types";

export class SustainabilityParseError extends Error {}

/**
 * Parsea y valida la respuesta cruda del LLM para iniciativas de
 * sustentabilidad. Separado de vertex.ts para poder testearlo con
 * respuestas simuladas (válidas y malformadas) sin llamar a Vertex real.
 */
export function parseInitiativesResponse(raw: string): InitiativeDraft[] {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new SustainabilityParseError(
      `Respuesta del modelo no es JSON válido: ${(error as Error).message}`,
    );
  }

  const result = initiativesDraftResponseSchema.safeParse(json);
  if (!result.success) {
    throw new SustainabilityParseError(
      `Respuesta del modelo no cumple el schema de iniciativas: ${result.error.message}`,
    );
  }

  return result.data;
}
