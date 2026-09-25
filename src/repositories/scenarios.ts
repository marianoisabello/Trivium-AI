import { prisma } from "@/repositories/prisma";
import type { Prisma } from "@prisma/client";

export interface ScenarioDraftInput {
  type: string;
  expectedReturn: number;
  risk: string;
  probability: number;
  narrative: string;
  drivers: unknown;
}

export async function createScenariosForAnalysis(
  organizationId: string,
  analysisId: string,
  scenarios: ScenarioDraftInput[],
): Promise<void> {
  await prisma.scenario.createMany({
    data: scenarios.map((s) => ({
      organizationId,
      analysisId,
      type: s.type,
      expectedReturn: s.expectedReturn,
      risk: s.risk,
      probability: s.probability,
      narrative: s.narrative,
      drivers: s.drivers as Prisma.InputJsonValue,
    })),
  });
}
