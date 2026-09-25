import { prisma } from "@/repositories/prisma";

export type AiFlow = "scenarios" | "proposals" | "recommendations" | "initiatives";
export type AiCallStatus = "success" | "error";

export interface AiCallLogEntry {
  organizationId: string;
  firebaseUid: string;
  flow: AiFlow;
  provider: string;
  model?: string | null;
  status: AiCallStatus;
  attemptCount: number;
  durationMs: number;
  errorMessage?: string | null;
}

/** Nunca tira: un fallo de logging no debe romper la generación real. */
export async function logAiCall(entry: AiCallLogEntry): Promise<void> {
  try {
    await prisma.aiCallLog.create({
      data: {
        organizationId: entry.organizationId,
        firebaseUid: entry.firebaseUid,
        flow: entry.flow,
        provider: entry.provider,
        model: entry.model ?? null,
        status: entry.status,
        attemptCount: entry.attemptCount,
        durationMs: entry.durationMs,
        errorMessage: entry.errorMessage ?? null,
      },
    });
  } catch (error) {
    console.error("[ai_call_logs] no se pudo loguear la llamada:", error);
  }
}

export async function countRecentCalls(organizationId: string, sinceMs: number): Promise<number> {
  return prisma.aiCallLog.count({
    where: { organizationId, createdAt: { gte: new Date(Date.now() - sinceMs) } },
  });
}
