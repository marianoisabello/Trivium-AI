import { prisma } from "@/repositories/prisma";

export interface ProposalFeedbackRow {
  decision: string;
  reason: string | null;
}

export async function createProposalFeedback(
  organizationId: string,
  input: {
    proposalId: string;
    firebaseUid: string | null;
    decision: "aprobado" | "rechazado";
    reason?: string | null;
  },
): Promise<void> {
  await prisma.proposalFeedback.create({
    data: {
      organizationId,
      proposalId: input.proposalId,
      firebaseUid: input.firebaseUid,
      decision: input.decision,
      reason: input.reason ?? null,
    },
  });
}

/** Shape compatible con summarizeProposalFeedback (src/lib/server/feedbackContext.ts). */
export async function listRecentProposalFeedback(
  organizationId: string,
  limit = 10,
): Promise<ProposalFeedbackRow[]> {
  return prisma.proposalFeedback.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { decision: true, reason: true },
  });
}
