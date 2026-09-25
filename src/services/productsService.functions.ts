import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOrganization } from "@/lib/auth/verifyToken";
import {
  coCreationInputSchema,
  proposalsDraftResponseSchema,
  proposalsGenerateInputSchema,
  recommendationsDraftResponseSchema,
} from "@/lib/schemas";
import { checkRateLimit, withAiCallLogging } from "@/lib/server/aiCallLog";
import { summarizeProposalFeedback } from "@/lib/server/feedbackContext";
import {
  createProposals,
  listProposals,
  updateProposalFields,
  updateProposalStatus,
  updateProposalTemplate,
} from "@/repositories/proposals";
import {
  createProposalFeedback,
  listRecentProposalFeedback,
} from "@/repositories/proposalFeedback";
import type { CoCreationInput, ProductSuggestion, Proposal } from "@/lib/types";
import type { ProposalDraft, ProposalsGenerateInput } from "@/lib/ai/types";

function toProposal(row: {
  id: string;
  name: string;
  description: string | null;
  targetClient: string | null;
  channel: string;
  schedule: string;
  status: string;
  template: string | null;
}): Proposal {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    targetClient: row.targetClient ?? "",
    channel: row.channel as Proposal["channel"],
    schedule: row.schedule as Proposal["schedule"],
    status: row.status as Proposal["status"],
    ...(row.template ? { template: row.template } : {}),
  };
}

/**
 * Genera propuestas automáticas y las persiste en `proposals` vía Prisma.
 * Los ids que devolvemos son los que asigna Postgres, no los que "inventa"
 * el LLM: la UI de productos.tsx hace updates posteriores por id
 * (aprobar/pausar/editar/guardar plantilla) y esos updates fallarían en
 * silencio contra un id que no existe en la tabla.
 */
export const generateProposalsFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown): ProposalsGenerateInput => proposalsGenerateInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<Proposal[]> => {
    const { organizationId, firebaseUid } = context;

    await checkRateLimit(organizationId);

    const feedbackRows = await listRecentProposalFeedback(organizationId);
    const feedbackContext = summarizeProposalFeedback(feedbackRows);

    const { getAIProvider } = await import("@/lib/ai/provider");
    const provider = process.env["AI_PROVIDER"] ?? "vertex";
    const drafts = await withAiCallLogging<ProposalDraft[]>(
      {
        organizationId,
        firebaseUid,
        flow: "proposals",
        provider,
        model: provider === "vertex" ? (process.env["VERTEX_AI_MODEL"] ?? null) : null,
      },
      async () =>
        proposalsDraftResponseSchema.parse(
          await getAIProvider().generateProposals(data, feedbackContext),
        ),
    );

    const inserted = await createProposals(organizationId, drafts);
    return inserted.map(toProposal);
  });

/**
 * Genera sugerencias de co-creación. No hay tabla para ProductSuggestion
 * (son efímeras), así que no persiste nada; el id lo generamos acá solo
 * para que la UI tenga una key estable.
 */
export const generateRecommendationsFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown): CoCreationInput => coCreationInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<ProductSuggestion[]> => {
    const { organizationId, firebaseUid } = context;

    await checkRateLimit(organizationId);

    const { getAIProvider } = await import("@/lib/ai/provider");
    const provider = process.env["AI_PROVIDER"] ?? "vertex";
    const drafts = await withAiCallLogging(
      {
        organizationId,
        firebaseUid,
        flow: "recommendations",
        provider,
        model: provider === "vertex" ? (process.env["VERTEX_AI_MODEL"] ?? null) : null,
      },
      async () =>
        recommendationsDraftResponseSchema.parse(
          await getAIProvider().generateRecommendations(data),
        ),
    );

    return drafts.map((s) => ({ id: crypto.randomUUID(), ...s }));
  });

export const listProposalsFn = createServerFn({ method: "GET" })
  .middleware([requireOrganization])
  .handler(async ({ context }): Promise<Proposal[]> => {
    const rows = await listProposals(context.organizationId);
    return rows.map(toProposal);
  });

const proposalIdSchema = z.object({ proposalId: z.string().uuid() });

/** Aprobar además queda registrado en proposal_feedback (alimenta el prompt de próximas generaciones). */
export const approveProposalFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown) => proposalIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await updateProposalStatus(context.organizationId, data.proposalId, "programada");
    await createProposalFeedback(context.organizationId, {
      proposalId: data.proposalId,
      firebaseUid: context.firebaseUid,
      decision: "aprobado",
    });
  });

const rejectProposalInputSchema = z.object({
  proposalId: z.string().uuid(),
  reason: z.string().optional(),
});

export const rejectProposalFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown) => rejectProposalInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await updateProposalStatus(context.organizationId, data.proposalId, "pausada");
    await createProposalFeedback(context.organizationId, {
      proposalId: data.proposalId,
      firebaseUid: context.firebaseUid,
      decision: "rechazado",
      reason: data.reason || null,
    });
  });

const updateStatusInputSchema = z.object({
  proposalId: z.string().uuid(),
  status: z.enum(["borrador", "programada", "enviada", "pausada"]),
});

export const updateProposalStatusFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown) => updateStatusInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await updateProposalStatus(context.organizationId, data.proposalId, data.status);
  });

const updateTemplateInputSchema = z.object({
  proposalId: z.string().uuid(),
  template: z.string(),
});

export const updateProposalTemplateFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown) => updateTemplateInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await updateProposalTemplate(context.organizationId, data.proposalId, data.template);
  });

const updateProposalInputSchema = z.object({
  proposalId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  channel: z.enum(["Email", "LinkedIn", "WhatsApp"]),
  schedule: z.enum(["semanal", "mensual"]),
});

export const updateProposalFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown) => updateProposalInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { proposalId, ...fields } = data;
    await updateProposalFields(context.organizationId, proposalId, fields);
  });
