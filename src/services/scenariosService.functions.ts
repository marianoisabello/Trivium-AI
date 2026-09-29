import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOrganization } from "@/lib/auth/verifyToken";
import { analysisInputSchema, scenariosResponseSchema } from "@/lib/schemas";
import type { AnalysisInput, Scenario } from "@/lib/types";
import { checkRateLimit, withAiCallLogging } from "@/lib/server/aiCallLog";
import { summarizeScenarioFeedback } from "@/lib/server/feedbackContext";
import { createAnalysis, listRecentAnalyses } from "@/repositories/analyses";
import { createScenariosForAnalysis } from "@/repositories/scenarios";
import {
  createScenarioFeedback,
  listRecentScenarioFeedback,
} from "@/repositories/scenarioFeedback";

/**
 * Server function de generación de escenarios. Antes usaba Supabase
 * (context.supabase con RLS); ahora organizationId sale directo de los
 * custom claims del token de Firebase (requireOrganization) -- sin
 * round-trip a la base solo para resolverlo -- y persiste vía Prisma.
 */
export const generateScenariosFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown): AnalysisInput => analysisInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<Scenario[]> => {
    const { organizationId, firebaseUid } = context;

    await checkRateLimit(organizationId);

    const feedbackRows = await listRecentScenarioFeedback(organizationId);
    const feedbackContext = summarizeScenarioFeedback(feedbackRows);

    // Import dinámico: lib/ai/provider.ts arrastra el adapter de Vertex AI
    // (google-auth-library, dependencias de Node) que no debe terminar en
    // el bundle de cliente.
    const { getAIProvider } = await import("@/lib/ai/provider");
    const provider = process.env["AI_PROVIDER"] ?? "vertex";
    const scenarios = await withAiCallLogging<Scenario[]>(
      {
        organizationId,
        firebaseUid,
        flow: "scenarios",
        provider,
        model: provider === "vertex" ? (process.env["VERTEX_AI_MODEL"] ?? null) : null,
      },
      async () =>
        scenariosResponseSchema.parse(
          await getAIProvider().generateScenarios(data, feedbackContext),
        ),
    );

    const analysis = await createAnalysis(organizationId, firebaseUid, {
      name: data.name,
      currentSituation: data.currentSituation,
      assets: data.assets,
      variables: data.variables,
    });

    await createScenariosForAnalysis(
      organizationId,
      analysis.id,
      scenarios.map((s) => ({
        type: s.type,
        expectedReturn: s.expectedReturn,
        risk: s.risk,
        probability: s.probability,
        narrative: s.narrative,
        drivers: s.drivers,
      })),
    );

    const { getQuoteWithFallback } = await import("@/lib/market");
    const quotes = await Promise.all(data.assets.map((asset) => getQuoteWithFallback(asset)));
    if (!quotes.some((quote) => quote.dataSource === "manual")) return scenarios;

    return scenarios.map((scenario) =>
      Object.assign({}, scenario, { dataSource: "manual" as const }),
    );
  });

export const listAnalysisHistoryFn = createServerFn({ method: "GET" })
  .middleware([requireOrganization])
  .handler(async ({ context }) => {
    const rows = await listRecentAnalyses(context.organizationId, 10);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      created_at: r.createdAt.toISOString(),
    }));
  });

const scenarioFeedbackInputSchema = z.object({
  scenarioType: z.enum(["Optimista", "Esperado", "Pesimista"]),
  decision: z.enum(["aprobado", "rechazado"]),
  reason: z.string().optional(),
});

/** No liga a un id real de escenario a propósito -- ver nota en el schema (scenario_feedback.analysisId es nullable). */
export const createScenarioFeedbackFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown) => scenarioFeedbackInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await createScenarioFeedback(context.organizationId, {
      scenarioType: data.scenarioType,
      firebaseUid: context.firebaseUid,
      decision: data.decision,
      reason: data.reason || null,
    });
  });
