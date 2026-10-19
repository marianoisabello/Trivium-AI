import { prisma } from "@/repositories/prisma";

/**
 * ÚNICO repository que lee datos de TODAS las organizaciones (rol superadmin).
 *
 * Excepción deliberada a la regla "todo repository filtra por organizationId":
 * - Solo de lectura.
 * - Solo debe importarse desde src/services/platformService.functions.ts, detrás
 *   de requireSuperadmin (tests/unit/platformIsolation.test.ts lo verifica).
 * - Las listas están acotadas (MAX_ROWS) para no devolver tablas enteras.
 */
const MAX_ROWS = 200;

export interface OrganizationOverview {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
  counts: {
    members: number;
    clients: number;
    analyses: number;
    proposals: number;
    initiatives: number;
  };
}

export async function listOrganizationsOverview(): Promise<OrganizationOverview[]> {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    include: {
      _count: {
        select: {
          profiles: true,
          clients: true,
          analyses: true,
          proposals: true,
          initiatives: true,
        },
      },
    },
  });
  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    industry: o.industry,
    size: o.size,
    onboardingCompleted: o.onboardingCompleted,
    createdAt: o.createdAt.toISOString(),
    counts: {
      members: o._count.profiles,
      clients: o._count.clients,
      analyses: o._count.analyses,
      proposals: o._count.proposals,
      initiatives: o._count.initiatives,
    },
  }));
}

export interface OrganizationDetail {
  organization: Omit<OrganizationOverview, "counts">;
  members: { fullName: string | null; email: string | null; roles: string[] }[];
  clients: {
    id: string;
    name: string;
    email: string | null;
    segment: string | null;
    createdAt: string;
  }[];
  analyses: {
    id: string;
    name: string;
    createdAt: string;
    scenarios: { type: string; expectedReturn: number; risk: string; probability: number }[];
  }[];
  proposals: {
    id: string;
    name: string;
    channel: string;
    status: string;
    targetClient: string | null;
    createdAt: string;
  }[];
  initiatives: {
    id: string;
    title: string;
    status: string;
    goal: string | null;
    kpis: { name: string; unit: string | null; targetValue: number; currentValue: number }[];
  }[];
}

/** null si la organización no existe. */
export async function getOrganizationDetail(
  organizationId: string,
): Promise<OrganizationDetail | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      profiles: { include: { roles: true }, take: MAX_ROWS },
      clients: { orderBy: { createdAt: "desc" }, take: MAX_ROWS },
      analyses: {
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
        include: { scenarios: true },
      },
      proposals: { orderBy: { createdAt: "desc" }, take: MAX_ROWS },
      initiatives: {
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
        include: { kpis: true },
      },
    },
  });
  if (!org) return null;

  return {
    organization: {
      id: org.id,
      name: org.name,
      industry: org.industry,
      size: org.size,
      onboardingCompleted: org.onboardingCompleted,
      createdAt: org.createdAt.toISOString(),
    },
    members: org.profiles.map((p) => ({
      fullName: p.fullName,
      email: p.email,
      roles: p.roles.map((r) => r.role),
    })),
    clients: org.clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      segment: c.segment,
      createdAt: c.createdAt.toISOString(),
    })),
    analyses: org.analyses.map((a) => ({
      id: a.id,
      name: a.name,
      createdAt: a.createdAt.toISOString(),
      scenarios: a.scenarios.map((s) => ({
        type: s.type,
        expectedReturn: Number(s.expectedReturn),
        risk: s.risk,
        probability: Number(s.probability),
      })),
    })),
    proposals: org.proposals.map((p) => ({
      id: p.id,
      name: p.name,
      channel: p.channel,
      status: p.status,
      targetClient: p.targetClient,
      createdAt: p.createdAt.toISOString(),
    })),
    initiatives: org.initiatives.map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      goal: i.goal,
      kpis: i.kpis.map((k) => ({
        name: k.name,
        unit: k.unit,
        targetValue: Number(k.targetValue),
        currentValue: Number(k.currentValue),
      })),
    })),
  };
}
