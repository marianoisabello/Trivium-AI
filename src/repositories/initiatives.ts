import { prisma } from "@/repositories/prisma";
import type { Prisma } from "@prisma/client";

export interface InitiativeRow {
  id: string;
  title: string;
  scopes: string[];
  goal: string | null;
  plan: unknown;
  status: string;
  createdAt: Date;
}

export interface InitiativeDraftInput {
  title: string;
  scopes: string[];
  goal: string;
  plan: unknown;
}

export async function createInitiative(
  organizationId: string,
  input: InitiativeDraftInput,
): Promise<InitiativeRow> {
  return prisma.initiative.create({
    data: {
      ...input,
      organizationId,
      plan: input.plan as Prisma.InputJsonValue,
      status: "propuesta",
    },
  });
}

export async function listInitiatives(organizationId: string): Promise<InitiativeRow[]> {
  return prisma.initiative.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateInitiativeStatus(
  organizationId: string,
  initiativeId: string,
  status: string,
): Promise<void> {
  await prisma.initiative.update({
    where: { id: initiativeId, organizationId },
    data: { status },
  });
}
