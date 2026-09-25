import { countRecentCalls, logAiCall, type AiFlow } from "@/repositories/aiCallLogs";

export interface AiCallMeta {
  organizationId: string;
  firebaseUid: string;
  flow: AiFlow;
  provider: string;
  model?: string | null;
}

/**
 * Envuelve una llamada a getAIProvider().generateX() con timing + logAiCall
 * (éxito o error). Usado en los 4 server functions de generación para no
 * repetir el mismo try/catch+cronómetro en cada uno.
 */
export async function withAiCallLogging<T>(meta: AiCallMeta, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    await logAiCall({
      ...meta,
      status: "success",
      attemptCount: 1,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    await logAiCall({
      ...meta,
      status: "error",
      attemptCount: 1,
      durationMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

const DEFAULT_RATE_LIMIT_PER_HOUR = 30;

/**
 * Rate limit simple por organización: cuenta llamadas en ai_call_logs en la
 * última hora. Configurable con AI_RATE_LIMIT_PER_HOUR.
 */
export async function checkRateLimit(organizationId: string): Promise<void> {
  const limit = Number(process.env["AI_RATE_LIMIT_PER_HOUR"] ?? DEFAULT_RATE_LIMIT_PER_HOUR);
  const count = await countRecentCalls(organizationId, 60 * 60 * 1000);

  if (count >= limit) {
    throw new Error(
      `Se alcanzó el límite de ${limit} generaciones con IA por hora para esta organización. Probá de nuevo más tarde.`,
    );
  }
}
