import { prisma } from "@/repositories/prisma";

export interface ScenarioFeedbackRow {
  scenario_type: string;
  decision: string;
  reason: string | null;
}

export async function createScenarioFeedback(
  organizationId: string,
  input: {
    analysisId?: string | null;
    scenarioType: string;
    firebaseUid: string | null;
    decision: "aprobado" | "rechazado";
    reason?: string | null;
  },
): Promise<void> {
  await prisma.scenarioFeedback.create({
    data: {
      organizationId,
      analysisId: input.analysisId ?? null,
      scenarioType: input.scenarioType,
      firebaseUid: input.firebaseUid,
      decision: input.decision,
      reason: input.reason ?? null,
    },
  });
}

/** Shape compatible con summarizeScenarioFeedback (src/lib/server/feedbackContext.ts). */
export async function listRecentScenarioFeedback(
  organizationId: string,
  limit = 10,
): Promise<ScenarioFeedbackRow[]> {
  const rows = await prisma.scenarioFeedback.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { scenarioType: true, decision: true, reason: true },
  });
  return rows.map((r) => ({
    scenario_type: r.scenarioType,
    decision: r.decision,
    reason: r.reason,
  }));
}
