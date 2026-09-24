import { z } from "zod";

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
