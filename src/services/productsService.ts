import type { Cadence, Channel, CoCreationInput, Proposal, ProductSuggestion } from "@/lib/types";
import {
  generateProposalsFn,
  generateRecommendationsFn,
} from "@/services/productsService.functions";

/**
 * Genera y persiste propuestas automáticas llamando a la server function
 * real (productsService.functions.ts). El endpoint valida input y salida
 * con Zod y guarda las propuestas en Supabase con ids reales de DB.
 */
export async function generateProposals(
  segment: string,
  channel: Channel,
  cadence: Cadence,
  count = 4,
): Promise<Proposal[]> {
  return generateProposalsFn({ data: { segment, channel, cadence, count } });
}

/** Genera sugerencias de co-creación llamando a la server function real. */
export async function generateRecommendations(
  input: CoCreationInput,
): Promise<ProductSuggestion[]> {
  return generateRecommendationsFn({ data: input });
}

/** Vista previa de mensaje por canal. Lógica determinística, no pasa por IA. */
export function buildMessageTemplate(proposal: Proposal, channel: Channel): string {
  if (channel === "Email") {
    return `Asunto: ${proposal.name}\n\nHola {{nombre}},\n\nQueremos compartirte ${proposal.name.toLowerCase()}: ${proposal.description}\n\nEstá pensado para ${proposal.targetClient}. ¿Coordinamos una llamada de 15 minutos esta semana?\n\nSaludos,\n{{remitente}} — Trivium AI`;
  }
  if (channel === "LinkedIn") {
    return `Hola {{nombre}} 👋 Vi que trabajás en ${proposal.targetClient}. Estamos lanzando ${proposal.name}: ${proposal.description} ¿Te interesa que te comparta el detalle?`;
  }
  return `Hola {{nombre}}! Te escribo de Trivium AI 👋 Preparamos ${proposal.name} para ${proposal.targetClient}. ${proposal.description} ¿Te paso más info?`;
}
