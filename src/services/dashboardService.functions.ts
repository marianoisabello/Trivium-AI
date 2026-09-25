import { createServerFn } from "@tanstack/react-start";
import { requireOrganization } from "@/lib/auth/verifyToken";
import { listRecentAnalyses } from "@/repositories/analyses";
import { listProposals } from "@/repositories/proposals";
import { listInitiatives } from "@/repositories/initiatives";

interface ActivityItem {
  label: string;
  detail: string;
  date: string;
}

/**
 * Reemplaza las 3 queries en paralelo que dashboard.tsx hacía contra
 * Supabase (analyses/proposals/initiatives) por un solo server function.
 */
export const getDashboardSummaryFn = createServerFn({ method: "GET" })
  .middleware([requireOrganization])
  .handler(async ({ context }) => {
    const [analyses, proposals, initiatives] = await Promise.all([
      listRecentAnalyses(context.organizationId, 5),
      listProposals(context.organizationId),
      listInitiatives(context.organizationId),
    ]);

    const activity: ActivityItem[] = [
      ...analyses.map((a) => ({
        label: "Nuevo análisis de escenarios",
        detail: a.name,
        date: a.createdAt.toISOString(),
      })),
      ...proposals.slice(0, 5).map((p) => ({
        label: `Propuesta ${p.status}`,
        detail: p.name,
        date: p.createdAt.toISOString(),
      })),
      ...initiatives.slice(0, 5).map((i) => ({
        label: `Iniciativa ${i.status}`,
        detail: i.title,
        date: i.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);

    return {
      lastAnalysisName: analyses[0]?.name ?? null,
      proposalsSent: proposals.filter((p) => p.status === "enviada").length,
      activeInitiatives: initiatives.filter((i) => i.status === "en ejecución").length,
      activity,
    };
  });
