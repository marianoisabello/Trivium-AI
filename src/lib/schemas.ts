import { z } from "zod";
import { SUSTAINABILITY_SCOPES } from "@/lib/types";

export const assetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["acción", "derivado", "producto", "servicio"]),
  value: z.number().nonnegative(),
  weight: z.number().min(0).max(100),
});

export const keyVariableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  probability: z.number().min(0).max(100),
  impact: z.enum(["alto", "medio", "bajo"]),
});

/** Input del análisis de escenarios: nombre, situación actual, cartera y variables clave. */
export const analysisInputSchema = z.object({
  name: z.string().min(3),
  currentSituation: z.string().min(1),
  assets: z.array(assetSchema).min(1),
  variables: z.array(keyVariableSchema),
});

/**
 * CLAUDE.md: "Escenarios: siempre devolver ≥3 (optimista, esperado,
 * pesimista), cada uno con expectedReturn, risk, probability, drivers[],
 * narrative. Validar con Zod." Se usa tanto para validar la salida del LLM
 * (con reintento si falla) como, a modo de defensa en profundidad, la
 * respuesta final del endpoint antes de persistirla/devolverla.
 */
export const scenarioSchema = z.object({
  id: z.string(),
  type: z.enum(["Optimista", "Esperado", "Pesimista"]),
  expectedReturn: z.number(),
  risk: z.enum(["bajo", "medio", "alto"]),
  probability: z.number().min(0).max(100),
  narrative: z.string().min(1),
  drivers: z.array(z.string()).min(1),
});

export const scenariosResponseSchema = z.array(scenarioSchema).min(3);

const channelSchema = z.enum(["Email", "LinkedIn", "WhatsApp"]);
const cadenceSchema = z.enum(["semanal", "mensual"]);

/** Input para generar propuestas automáticas: segmento + canal/cadencia elegidos en la UI. */
export const proposalsGenerateInputSchema = z.object({
  segment: z.string().min(1),
  channel: channelSchema,
  cadence: cadenceSchema,
  count: z.number().int().min(1).max(10).optional(),
});

/**
 * Lo que devuelve el LLM para cada propuesta: sin id (lo asigna Postgres al
 * insertar) ni status (siempre "borrador", forzado en el server function).
 */
export const proposalDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  targetClient: z.string().min(1),
  channel: channelSchema,
  schedule: cadenceSchema,
});

export const proposalsDraftResponseSchema = z.array(proposalDraftSchema).min(1);

export const coCreationInputSchema = z.object({
  category: z.string().min(1),
  needs: z.string().min(10),
  budget: z.number().positive(),
  history: z.array(z.string()),
});

export const productSuggestionDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  rationale: z.string().min(1),
  price: z.number().positive(),
  features: z.array(z.string()).min(1),
});

export const recommendationsDraftResponseSchema = z.array(productSuggestionDraftSchema).min(2);

/** Input de recursos de la organización para generar iniciativas de sustentabilidad. */
export const resourcesInputSchema = z.object({
  materials: z.string().min(3),
  capacities: z.string().min(3),
  waste: z.string(),
  workforce: z.string(),
});

export const planStepSchema = z.object({
  step: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha esperado: YYYY-MM-DD"),
});

export const kpiDraftSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  target: z.number().positive(),
  current: z.number().nonnegative().default(0),
});

/**
 * CLAUDE.md: "Iniciativas de sustentabilidad: siempre con goal medible,
 * actionPlan[] con fechas y 3–5 kpis[] con target y unidad." Sin id ni
 * status (el LLM no decide identidad de DB ni el estado del Kanban).
 */
export const initiativeDraftSchema = z.object({
  title: z.string().min(1),
  scopes: z.array(z.enum(SUSTAINABILITY_SCOPES)).min(1),
  goal: z.string().min(1),
  plan: z.array(planStepSchema).min(2),
  kpis: z.array(kpiDraftSchema).min(3).max(5),
});

export const initiativesDraftResponseSchema = z.array(initiativeDraftSchema).min(1);
