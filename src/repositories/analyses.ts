import { prisma } from "@/repositories/prisma";
import type { Prisma } from "@prisma/client";

export interface AnalysisRecord {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
}

/**
 * assets/variables como `unknown`, no Prisma.InputJsonValue: así los
 * callers (server functions) no necesitan importar @prisma/client -- ese
 * import queda confinado acá adentro, como pide la regla de ESLint.
 */
export async function createAnalysis(
  organizationId: string,
  createdBy: string,
  input: { name: string; currentSituation: string; assets: unknown; variables: unknown },
): Promise<AnalysisRecord> {
  return prisma.analysis.create({
    data: {
      organizationId,
      createdBy,
      name: input.name,
      currentSituation: input.currentSituation,
      assets: input.assets as Prisma.InputJsonValue,
      variables: input.variables as Prisma.InputJsonValue,
      status: "completado",
    },
    select: { id: true, name: true, status: true, createdAt: true },
  });
}

export async function listRecentAnalyses(
  organizationId: string,
  limit = 10,
): Promise<AnalysisRecord[]> {
  return prisma.analysis.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, name: true, status: true, createdAt: true },
  });
}
