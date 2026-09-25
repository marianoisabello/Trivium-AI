import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOrganization } from "@/lib/auth/verifyToken";
import { initiativesDraftResponseSchema, resourcesInputSchema } from "@/lib/schemas";
import { checkRateLimit, withAiCallLogging } from "@/lib/server/aiCallLog";
import {
  createInitiative,
  listInitiatives,
  updateInitiativeStatus,
} from "@/repositories/initiatives";
import { createKpisForInitiative, listKpisForOrg, updateKpi } from "@/repositories/kpis";
import { createKpiMeasurement } from "@/repositories/kpiMeasurements";
import type { Initiative, PlanStep, ResourcesInput } from "@/lib/types";
import type { InitiativeDraft } from "@/lib/ai/types";

/**
 * Genera iniciativas de sustentabilidad y las persiste en `initiatives` +
 * `kpis` vía Prisma. Los ids finales son los que asigna Postgres (no los
 * que "inventa" el LLM): moveInitiative y saveKpi hacen updates
 * posteriores por id.
 */
export const generateInitiativesFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown): ResourcesInput => resourcesInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<Initiative[]> => {
    const { organizationId, firebaseUid } = context;

    await checkRateLimit(organizationId);

    const { getAIProvider } = await import("@/lib/ai/provider");
    const provider = process.env["AI_PROVIDER"] ?? "vertex";
    const drafts = await withAiCallLogging<InitiativeDraft[]>(
      {
        organizationId,
        firebaseUid,
        flow: "initiatives",
        provider,
        model: provider === "vertex" ? (process.env["VERTEX_AI_MODEL"] ?? null) : null,
      },
      async () =>
        initiativesDraftResponseSchema.parse(await getAIProvider().generateInitiatives(data)),
    );

    const initiatives: Initiative[] = [];
    for (const draft of drafts) {
      const initiativeRow = await createInitiative(organizationId, {
        title: draft.title,
        scopes: draft.scopes,
        goal: draft.goal,
        plan: draft.plan,
      });
      const kpiRows = await createKpisForInitiative(organizationId, initiativeRow.id, draft.kpis);

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
          target: k.targetValue,
          current: k.currentValue,
        })),
      });
    }

    return initiatives;
  });

export const listInitiativesFn = createServerFn({ method: "GET" })
  .middleware([requireOrganization])
  .handler(async ({ context }): Promise<Initiative[]> => {
    const rows = await listInitiatives(context.organizationId);
    const kpis = await listKpisForOrg(context.organizationId);
    return rows.map((i) => ({
      id: i.id,
      title: i.title,
      scopes: i.scopes,
      goal: i.goal ?? "",
      plan: (Array.isArray(i.plan) ? i.plan : []) as PlanStep[],
      status: i.status as Initiative["status"],
      kpis: kpis
        .filter((k) => k.initiativeId === i.id)
        .map((k) => ({
          id: k.id,
          name: k.name,
          unit: k.unit ?? "",
          target: Number(k.targetValue),
          current: Number(k.currentValue),
        })),
    }));
  });

const moveInitiativeInputSchema = z.object({
  initiativeId: z.string().uuid(),
  status: z.enum(["propuesta", "en ejecución", "completada"]),
});

export const moveInitiativeFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown) => moveInitiativeInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await updateInitiativeStatus(context.organizationId, data.initiativeId, data.status);
  });

const saveKpiInputSchema = z.object({
  kpiId: z.string().uuid(),
  name: z.string().min(2),
  unit: z.string(),
  target: z.number().positive(),
  measurementValue: z.number(),
  measurementDate: z.string(),
});

/** Reemplaza saveKpi en sustentabilidad.tsx: actualiza el KPI y registra la medición en un solo llamado. */
export const saveKpiFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown) => saveKpiInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await updateKpi(context.organizationId, data.kpiId, {
      name: data.name,
      unit: data.unit,
      targetValue: data.target,
      currentValue: data.measurementValue,
    });
    await createKpiMeasurement(context.organizationId, {
      kpiId: data.kpiId,
      value: data.measurementValue,
      measuredAt: new Date(data.measurementDate),
    });
  });
