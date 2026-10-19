import { prisma } from "@/repositories/prisma";

/**
 * Helpers de seed demo. Viven en src/repositories/ porque son el único
 * lugar permitido para importar @prisma/client (regla de ESLint). Todo lo
 * que borran está acotado por prefijo [DEMO] / demo-seed- a propósito:
 * `deleteDemoData` no puede tocar datos reales.
 */

export const DEMO_ORG_PREFIX = "[DEMO] ";
export const DEMO_UID_PREFIX = "demo-seed-";

export interface DemoOrgSummary {
  id: string;
  name: string;
}

/** Sin scope por organizationId a propósito: resuelve la organización demo por nombre (clave natural del seed idempotente). */
export async function findOrganizationByName(name: string): Promise<DemoOrgSummary | null> {
  return prisma.organization.findFirst({ where: { name }, select: { id: true, name: true } });
}

export async function listDemoOrganizations(): Promise<DemoOrgSummary[]> {
  return prisma.organization.findMany({
    where: { name: { startsWith: DEMO_ORG_PREFIX } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Borra SOLO datos demo: organizaciones cuyo nombre empieza con [DEMO]
 * (la cascada de FKs borra análisis, escenarios, clientes, propuestas,
 * iniciativas, KPIs, mediciones y feedback) y profiles demo-seed-* (la
 * cascada borra sus user_roles).
 */
export async function deleteDemoData(): Promise<{ organizations: number; profiles: number }> {
  const orgs = await prisma.organization.deleteMany({
    where: { name: { startsWith: DEMO_ORG_PREFIX } },
  });
  const profiles = await prisma.profile.deleteMany({
    where: { firebaseUid: { startsWith: DEMO_UID_PREFIX } },
  });
  return { organizations: orgs.count, profiles: profiles.count };
}

export interface DemoRowCounts {
  analyses: number;
  scenarios: number;
  clients: number;
  proposals: number;
  initiatives: number;
  kpis: number;
  kpiMeasurements: number;
  proposalFeedback: number;
  scenarioFeedback: number;
}

/** Counts por entidad para una organización (test de idempotencia del seed). */
export async function countRowsForOrg(organizationId: string): Promise<DemoRowCounts> {
  const where = { organizationId };
  const [
    analyses,
    scenarios,
    clients,
    proposals,
    initiatives,
    kpis,
    kpiMeasurements,
    proposalFeedback,
    scenarioFeedback,
  ] = await Promise.all([
    prisma.analysis.count({ where }),
    prisma.scenario.count({ where }),
    prisma.client.count({ where }),
    prisma.proposal.count({ where }),
    prisma.initiative.count({ where }),
    prisma.kpi.count({ where }),
    prisma.kpiMeasurement.count({ where }),
    prisma.proposalFeedback.count({ where }),
    prisma.scenarioFeedback.count({ where }),
  ]);
  return {
    analyses,
    scenarios,
    clients,
    proposals,
    initiatives,
    kpis,
    kpiMeasurements,
    proposalFeedback,
    scenarioFeedback,
  };
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
