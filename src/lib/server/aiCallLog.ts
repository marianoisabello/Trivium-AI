import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AiFlow = "scenarios" | "proposals" | "recommendations" | "initiatives";
export type AiCallStatus = "success" | "error";

export interface AiCallLogEntry {
  organizationId: string;
  userId: string;
  flow: AiFlow;
  provider: string;
  model?: string | null;
  status: AiCallStatus;
  attemptCount: number;
  durationMs: number;
  errorMessage?: string | null;
}

/** Loguea una llamada a IA en ai_call_logs. Nunca tira: un fallo de logging no debe romper la generación real. */
export async function logAiCall(
  supabase: SupabaseClient<Database>,
  entry: AiCallLogEntry,
): Promise<void> {
  try {
    await supabase.from("ai_call_logs").insert({
      organization_id: entry.organizationId,
      user_id: entry.userId,
      flow: entry.flow,
      provider: entry.provider,
      model: entry.model ?? null,
      status: entry.status,
      attempt_count: entry.attemptCount,
      duration_ms: entry.durationMs,
      error_message: entry.errorMessage ?? null,
    });
  } catch (error) {
    console.error("[ai_call_logs] no se pudo loguear la llamada:", error);
  }
}

export interface AiCallMeta {
  organizationId: string;
  userId: string;
  flow: AiFlow;
  provider: string;
  model?: string | null;
}

/**
 * Envuelve una llamada a getAIProvider().generateX() con timing + logAiCall
 * (éxito o error). Usado en los 4 server functions de generación para no
 * repetir el mismo try/catch+cronómetro en cada uno.
 */
export async function withAiCallLogging<T>(
  supabase: SupabaseClient<Database>,
  meta: AiCallMeta,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    await logAiCall(supabase, {
      ...meta,
      status: "success",
      attemptCount: 1,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    await logAiCall(supabase, {
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
 * última hora. Configurable con AI_RATE_LIMIT_PER_HOUR; si la tabla todavía
 * no existe (migración no aplicada) o falla la query, no bloquea — el rate
 * limit es una protección adicional, no debe tirar abajo la generación.
 */
export async function checkRateLimit(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<void> {
  const limit = Number(process.env["AI_RATE_LIMIT_PER_HOUR"] ?? DEFAULT_RATE_LIMIT_PER_HOUR);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("ai_call_logs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("created_at", since);

  if (error) {
    console.error("[ai_call_logs] no se pudo chequear el rate limit:", error);
    return;
  }

  if ((count ?? 0) >= limit) {
    throw new Error(
      `Se alcanzó el límite de ${limit} generaciones con IA por hora para esta organización. Probá de nuevo más tarde.`,
    );
  }
}
