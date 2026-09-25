import { prisma } from "@/repositories/prisma";

export interface KpiRow {
  id: string;
  name: string;
  unit: string | null;
  targetValue: number;
  currentValue: number;
}

export interface KpiDraftInput {
  name: string;
  unit: string;
  target: number;
  current: number;
}

export async function createKpisForInitiative(
  organizationId: string,
  initiativeId: string,
  kpis: KpiDraftInput[],
): Promise<KpiRow[]> {
  const created = await Promise.all(
    kpis.map((k) =>
      prisma.kpi.create({
        data: {
          organizationId,
          initiativeId,
          name: k.name,
          unit: k.unit,
          targetValue: k.target,
          currentValue: k.current,
        },
      }),
    ),
  );
  return created.map((k) => ({
    id: k.id,
    name: k.name,
    unit: k.unit,
    targetValue: Number(k.targetValue),
    currentValue: Number(k.currentValue),
  }));
}

export interface KpiWithInitiative extends KpiRow {
  initiativeId: string;
}

export async function listKpisForOrg(organizationId: string): Promise<KpiWithInitiative[]> {
  const rows = await prisma.kpi.findMany({ where: { organizationId } });
  return rows.map((k) => ({
    id: k.id,
    name: k.name,
    unit: k.unit,
    targetValue: Number(k.targetValue),
    currentValue: Number(k.currentValue),
    initiativeId: k.initiativeId,
  }));
}

export async function updateKpi(
  organizationId: string,
  kpiId: string,
  data: { name: string; unit: string; targetValue: number; currentValue: number },
): Promise<void> {
  await prisma.kpi.update({
    where: { id: kpiId, organizationId },
    data,
  });
}
