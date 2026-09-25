import { prisma } from "@/repositories/prisma";

export interface ProposalRow {
  id: string;
  name: string;
  description: string | null;
  targetClient: string | null;
  channel: string;
  schedule: string;
  status: string;
  template: string | null;
  createdAt: Date;
}

export interface ProposalDraftInput {
  name: string;
  description: string;
  targetClient: string;
  channel: string;
  schedule: string;
}

/** Devuelve las filas con los ids reales que asigna Postgres -- ver nota en productsService.functions.ts. */
export async function createProposals(
  organizationId: string,
  drafts: ProposalDraftInput[],
): Promise<ProposalRow[]> {
  const created = await Promise.all(
    drafts.map((p) =>
      prisma.proposal.create({
        data: {
          organizationId,
          name: p.name,
          description: p.description,
          targetClient: p.targetClient,
          channel: p.channel,
          schedule: p.schedule,
          status: "borrador",
        },
      }),
    ),
  );
  return created;
}

export async function listProposals(organizationId: string): Promise<ProposalRow[]> {
  return prisma.proposal.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateProposalStatus(
  organizationId: string,
  proposalId: string,
  status: string,
): Promise<void> {
  await prisma.proposal.update({
    where: { id: proposalId, organizationId },
    data: { status },
  });
}

export async function updateProposalTemplate(
  organizationId: string,
  proposalId: string,
  template: string,
): Promise<void> {
  await prisma.proposal.update({
    where: { id: proposalId, organizationId },
    data: { template },
  });
}

export async function updateProposalFields(
  organizationId: string,
  proposalId: string,
  data: { name: string; description: string; channel: string; schedule: string },
): Promise<void> {
  await prisma.proposal.update({
    where: { id: proposalId, organizationId },
    data,
  });
}
