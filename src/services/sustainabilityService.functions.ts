import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { initiativesDraftResponseSchema, resourcesInputSchema } from "@/lib/schemas";
import { resolveOrganizationId } from "@/lib/server/organization";
import { checkRateLimit, withAiCallLogging } from "@/lib/server/aiCallLog";
import type { Initiative, PlanStep, ResourcesInput } from "@/lib/types";
import type { InitiativeDraft } from "@/lib/ai/types";

/**
 * Genera iniciativas de sustentabilidad y las persiste en `initiatives` +
 * `kpis`. Igual que en generateProposalsFn, los ids finales son los que
 * asigna Postgres (no los que "inventa" el LLM): moveInitiative y saveKpi
 * en sustentabilidad.tsx hacen updates posteriores por id.
 */
export const generateInitiativesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown): ResourcesInput => resourcesInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<Initiative[]> => {
    const organizationId = await resolveOrganizationId(context.supabase, context.userId);

    await checkRateLimit(context.supabase, organizationId);

    const { getAIProvider } = await import("@/lib/ai/provider");
    const provider = process.env["AI_PROVIDER"] ?? "vertex";
    const drafts = await withAiCallLogging<InitiativeDraft[]>(
      context.supabase,
      {
        organizationId,
        userId: context.userId,
        flow: "initiatives",
        provider,
        model: provider === "vertex" ? (process.env["VERTEX_AI_MODEL"] ?? null) : null,
      },
      async () =>
        initiativesDraftResponseSchema.parse(await getAIProvider().generateInitiatives(data)),
    );

    const initiatives: Initiative[] = [];
    for (const draft of drafts) {
      const { data: initiativeRow, error: initiativeError } = await context.supabase
        .from("initiatives")
        .insert({
          organization_id: organizationId,
          title: draft.title,
          scopes: draft.scopes,
          goal: draft.goal,
          plan: draft.plan as unknown as never,
          status: "propuesta",
        })
        .select("id")
        .single();

      if (initiativeError || !initiativeRow) {
        throw new Error(
          `No se pudo guardar la iniciativa "${draft.title}": ${initiativeError?.message ?? "sin id"}`,
        );
      }

      const { data: kpiRows, error: kpisError } = await context.supabase
        .from("kpis")
        .insert(
          draft.kpis.map((k) => ({
            organization_id: organizationId,
            initiative_id: initiativeRow.id,
            name: k.name,
            unit: k.unit,
            target_value: k.target,
            current_value: k.current,
          })),
        )
        .select();

      if (kpisError || !kpiRows) {
        throw new Error(
          `No se pudieron guardar los KPIs de "${draft.title}": ${kpisError?.message ?? "sin filas"}`,
        );
      }

      initiatives.push({
        id: initiativeRow.id,
        title: draft.title,
        scopes: draft.scopes,
        goal: draft.goal,
        plan: draft.plan as PlanStep[],
        status: "propuesta",
        kpis: kpiRows.map((k) => ({
          id: k.id,
          name: k.name,
          unit: k.unit ?? "",
          target: Number(k.target_value),
          current: Number(k.current_value),
        })),
      });
    }

    return initiatives;
  });
