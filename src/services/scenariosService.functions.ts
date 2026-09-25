import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analysisInputSchema, scenariosResponseSchema } from "@/lib/schemas";
import type { AnalysisInput, Scenario } from "@/lib/types";
import { resolveOrganizationId } from "@/lib/server/organization";
import { checkRateLimit, withAiCallLogging } from "@/lib/server/aiCallLog";
import { summarizeScenarioFeedback } from "@/lib/server/feedbackContext";

/**
 * Server function que reemplaza conceptualmente a "/api/scenarios/generate":
 * esta versión de TanStack Start expone lógica de servidor como server
 * functions (RPC), no como rutas REST de archivo bajo /api/*. Reutiliza el
 * middleware requireSupabaseAuth ya existente en el proyecto (valida el JWT
 * de Supabase del request) en vez de reimplementar esa verificación acá.
 */
export const generateScenariosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown): AnalysisInput => analysisInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<Scenario[]> => {
    // Cliente con el JWT del usuario (de requireSupabaseAuth): las políticas
    // RLS ya exigen organization_id = current_org_id(), así que no hace
    // falta el service role para esta operación (queda para admin real).
    const organizationId = await resolveOrganizationId(context.supabase, context.userId);

    await checkRateLimit(context.supabase, organizationId);

    const { data: feedbackRows } = await context.supabase
      .from("scenario_feedback")
      .select("scenario_type, decision, reason")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10);
    const feedbackContext = summarizeScenarioFeedback(feedbackRows ?? []);

    // Import dinámico: lib/ai/provider.ts arrastra el adapter de Vertex AI
    // (google-auth-library, dependencias de Node) que no debe terminar en
    // el bundle de cliente — mismo patrón que client.server.ts.
    const { getAIProvider } = await import("@/lib/ai/provider");
    const provider = process.env["AI_PROVIDER"] ?? "vertex";
    const scenarios = await withAiCallLogging<Scenario[]>(
      context.supabase,
      {
        organizationId,
        userId: context.userId,
        flow: "scenarios",
        provider,
        model: provider === "vertex" ? (process.env["VERTEX_AI_MODEL"] ?? null) : null,
      },
      async () =>
        scenariosResponseSchema.parse(
          await getAIProvider().generateScenarios(data, feedbackContext),
        ),
    );

    const { data: analysis, error: analysisError } = await context.supabase
      .from("analyses")
      .insert({
        organization_id: organizationId,
        created_by: context.userId,
        name: data.name,
        current_situation: data.currentSituation,
        assets: data.assets as unknown as never,
        variables: data.variables as unknown as never,
        status: "completado",
      })
      .select("id")
      .single();

    if (analysisError || !analysis) {
      throw new Error(`No se pudo guardar el análisis: ${analysisError?.message ?? "sin id"}`);
    }

    const { error: scenariosError } = await context.supabase.from("scenarios").insert(
      scenarios.map((s) => ({
        organization_id: organizationId,
        analysis_id: analysis.id,
        type: s.type,
        expected_return: s.expectedReturn,
        risk: s.risk,
        probability: s.probability,
        narrative: s.narrative,
        drivers: s.drivers as unknown as never,
      })),
    );

    if (scenariosError) {
      throw new Error(`No se pudieron guardar los escenarios: ${scenariosError.message}`);
    }

    const { getQuoteWithFallback } = await import("@/lib/market");
    const quotes = await Promise.all(data.assets.map((asset) => getQuoteWithFallback(asset)));
    if (!quotes.some((quote) => quote.dataSource === "manual")) return scenarios;

    return scenarios.map((scenario) =>
      Object.assign({}, scenario, { dataSource: "manual" as const }),
    );
  });
