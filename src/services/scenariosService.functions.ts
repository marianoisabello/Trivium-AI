import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analysisInputSchema, scenariosResponseSchema } from "@/lib/schemas";
import type { AnalysisInput, Scenario } from "@/lib/types";

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
    // Import dinámico: lib/ai/provider.ts arrastra el adapter de Vertex AI
    // (google-auth-library, dependencias de Node) que no debe terminar en
    // el bundle de cliente — mismo patrón que client.server.ts.
    const { getAIProvider } = await import("@/lib/ai/provider");
    const scenarios = scenariosResponseSchema.parse(await getAIProvider().generateScenarios(data));

    // Cliente con el JWT del usuario (de requireSupabaseAuth): las políticas
    // RLS ya exigen organization_id = current_org_id(), así que no hace
    // falta el service role para esta operación (queda para admin real).
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", context.userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(`No se pudo resolver el perfil del usuario: ${profileError.message}`);
    }
    if (!profile?.organization_id) {
      throw new Error("El usuario no tiene una organización asignada");
    }
    const organizationId = profile.organization_id;

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
