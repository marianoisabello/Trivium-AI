import { proposalsDraftResponseSchema, recommendationsDraftResponseSchema } from "@/lib/schemas";
import type { ProposalDraft, ProductSuggestionDraft } from "@/lib/ai/types";

export class ProductsParseError extends Error {}

/**
 * Parsea y valida la respuesta cruda del LLM para propuestas automáticas.
 * Separado de vertex.ts para poder testearlo con respuestas simuladas
 * (válidas y malformadas) sin llamar a Vertex real.
 */
export function parseProposalsResponse(raw: string): ProposalDraft[] {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new ProductsParseError(
      `Respuesta del modelo no es JSON válido: ${(error as Error).message}`,
    );
  }

  const result = proposalsDraftResponseSchema.safeParse(json);
  if (!result.success) {
    throw new ProductsParseError(
      `Respuesta del modelo no cumple el schema de propuestas: ${result.error.message}`,
    );
  }

  return result.data;
}

/** Igual que parseProposalsResponse pero para sugerencias de co-creación. */
export function parseRecommendationsResponse(raw: string): ProductSuggestionDraft[] {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new ProductsParseError(
      `Respuesta del modelo no es JSON válido: ${(error as Error).message}`,
    );
  }

  const result = recommendationsDraftResponseSchema.safeParse(json);
  if (!result.success) {
    throw new ProductsParseError(
      `Respuesta del modelo no cumple el schema de recomendaciones: ${result.error.message}`,
    );
  }

  return result.data;
}
