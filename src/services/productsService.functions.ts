import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  coCreationInputSchema,
  proposalsDraftResponseSchema,
  proposalsGenerateInputSchema,
  recommendationsDraftResponseSchema,
} from "@/lib/schemas";
import { resolveOrganizationId } from "@/lib/server/organization";
import { checkRateLimit, withAiCallLogging } from "@/lib/server/aiCallLog";
import { summarizeProposalFeedback } from "@/lib/server/feedbackContext";
import type { CoCreationInput, ProductSuggestion, Proposal } from "@/lib/types";
import type { ProposalDraft, ProposalsGenerateInput } from "@/lib/ai/types";

/**
 * Genera propuestas automáticas y las persiste en `proposals`. A diferencia
 * de generateScenariosFn, acá los ids que devolvemos son los que asigna
 * Postgres (vía .select() tras el insert), no los que "inventa" el LLM: la
 * UI de productos.tsx hace updates posteriores por id (aprobar/pausar/
 * editar/guardar plantilla) y esos updates fallarían en silencio contra un
 * id que no existe en la tabla.
 */
export const generateProposalsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown): ProposalsGenerateInput => proposalsGenerateInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<Proposal[]> => {
    const organizationId = await resolveOrganizationId(context.supabase, context.userId);

    await checkRateLimit(context.supabase, organizationId);

    const { data: feedbackRows } = await context.supabase
      .from("proposal_feedback")
      .select("decision, reason")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10);
    const feedbackContext = summarizeProposalFeedback(feedbackRows ?? []);

    const { getAIProvider } = await import("@/lib/ai/provider");
    const provider = process.env["AI_PROVIDER"] ?? "vertex";
    const drafts = await withAiCallLogging<ProposalDraft[]>(
      context.supabase,
      {
        organizationId,
        userId: context.userId,
        flow: "proposals",
        provider,
        model: provider === "vertex" ? (process.env["VERTEX_AI_MODEL"] ?? null) : null,
      },
      async () =>
        proposalsDraftResponseSchema.parse(
          await getAIProvider().generateProposals(data, feedbackContext),
        ),
    );

    const { data: inserted, error } = await context.supabase
      .from("proposals")
      .insert(
        drafts.map((p) => ({
          organization_id: organizationId,
          name: p.name,
          description: p.description,
          target_client: p.targetClient,
          channel: p.channel,
          schedule: p.schedule,
          status: "borrador",
        })),
      )
      .select();

    if (error || !inserted) {
      throw new Error(`No se pudieron guardar las propuestas: ${error?.message ?? "sin filas"}`);
    }

    return inserted.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      targetClient: row.target_client ?? "",
      channel: row.channel as Proposal["channel"],
      schedule: row.schedule as Proposal["schedule"],
      status: row.status as Proposal["status"],
      ...(row.template ? { template: row.template } : {}),
    }));
  });

/**
 * Genera sugerencias de co-creación. No hay tabla para ProductSuggestion
 * (son efímeras, igual que en el mock anterior), así que no persiste nada;
 * el id lo generamos acá solo para que la UI tenga una key estable.
 */
export const generateRecommendationsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown): CoCreationInput => coCreationInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<ProductSuggestion[]> => {
    const organizationId = await resolveOrganizationId(context.supabase, context.userId);

    await checkRateLimit(context.supabase, organizationId);

    const { getAIProvider } = await import("@/lib/ai/provider");
    const provider = process.env["AI_PROVIDER"] ?? "vertex";
    const drafts = await withAiCallLogging(
      context.supabase,
      {
        organizationId,
        userId: context.userId,
        flow: "recommendations",
        provider,
        model: provider === "vertex" ? (process.env["VERTEX_AI_MODEL"] ?? null) : null,
      },
      async () =>
        recommendationsDraftResponseSchema.parse(
          await getAIProvider().generateRecommendations(data),
        ),
    );

    return drafts.map((s) => ({ id: crypto.randomUUID(), ...s }));
  });
