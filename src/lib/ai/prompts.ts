import type { AnalysisInput, CoCreationInput, ResourcesInput } from "@/lib/types";
import type { PortfolioRiskResult } from "@/lib/risk";
import type { MarketQuote } from "@/lib/market";
import type { ProposalsGenerateInput } from "@/lib/ai/types";

export interface ScenariosPromptContext {
  risk: PortfolioRiskResult;
  quotes: MarketQuote[];
}

/** Pide JSON estricto y le da al modelo el riesgo calculado y las cotizaciones como contexto duro. */
export function buildScenariosPrompt(
  input: AnalysisInput,
  context: ScenariosPromptContext,
): string {
  const quotesText = context.quotes
    .map(
      (q) =>
        `- ${q.symbol}: precio ${q.price} (variación ${q.changePercent}%, fuente: ${q.dataSource})`,
    )
    .join("\n");

  return `Sos un analista financiero senior. Devolvé ÚNICAMENTE un JSON (sin texto adicional, sin markdown, sin explicaciones) que sea un array de EXACTAMENTE 3 escenarios: "Optimista", "Esperado" y "Pesimista", en ese orden.

Cada elemento del array debe tener EXACTAMENTE estos campos:
- id (string, único)
- type ("Optimista" | "Esperado" | "Pesimista")
- expectedReturn (number, % de retorno esperado, puede ser negativo)
- risk ("bajo" | "medio" | "alto")
- probability (number, 0-100)
- narrative (string, explicación breve del escenario)
- drivers (array de strings, variables clave que lo explican)

Contexto del análisis "${input.name}":
Situación actual: ${input.currentSituation}

Cartera (activo, tipo, valor, peso %):
${input.assets.map((a) => `- ${a.name} (${a.type}): valor ${a.value}, peso ${a.weight}%`).join("\n")}

Cotizaciones de mercado actuales:
${quotesText || "- sin datos de mercado disponibles"}

Variables independientes clave (nombre, probabilidad, impacto) — considerá cada una de forma independiente al construir los tres escenarios:
${input.variables.map((v) => `- ${v.name}: probabilidad ${v.probability}%, impacto ${v.impact}`).join("\n")}

Riesgo de cartera calculado (referencia, podés matizarlo por escenario): ${context.risk.label} (score ${context.risk.score.toFixed(2)}).

Respondé solo con el JSON del array, nada más.`;
}

/** Pide JSON estricto: un array de propuestas de producto/servicio para el segmento indicado. */
export function buildProposalsPrompt(input: ProposalsGenerateInput): string {
  const count = input.count ?? 4;
  return `Sos un estratega comercial B2B senior. Devolvé ÚNICAMENTE un JSON (sin texto adicional, sin markdown, sin explicaciones) que sea un array de EXACTAMENTE ${count} propuestas de producto o servicio, en español.

Cada elemento del array debe tener EXACTAMENTE estos campos (no incluyas "id" ni "status"):
- name (string, nombre corto del producto/servicio)
- description (string, descripción breve y concreta)
- targetClient (string, a quién apunta dentro del segmento)
- channel ("Email" | "LinkedIn" | "WhatsApp")
- schedule ("semanal" | "mensual")

Contexto:
Segmento de cliente: ${input.segment}
Canal preferido (usalo como guía, podés variar si tiene sentido comercial): ${input.channel}
Cadencia preferida: ${input.cadence}

Respondé solo con el JSON del array, nada más.`;
}

/** Pide JSON estricto: un array de sugerencias de producto co-creadas con el cliente. */
export function buildRecommendationsPrompt(input: CoCreationInput): string {
  const historia = input.history.length ? input.history.join(", ") : "sin consumo previo";
  return `Sos un consultor de producto senior especializado en co-creación con clientes. Devolvé ÚNICAMENTE un JSON (sin texto adicional, sin markdown, sin explicaciones) que sea un array de 2 a 4 sugerencias de producto, en español, ordenadas de menor a mayor precio.

Cada elemento del array debe tener EXACTAMENTE estos campos (no incluyas "id"):
- name (string)
- description (string)
- rationale (string, por qué se lo recomendás dado su consumo previo y necesidad)
- price (number, en USD, > 0)
- features (array de strings, 2 a 5 items)

Contexto:
Categoría: ${input.category}
Necesidad declarada: ${input.needs}
Presupuesto de referencia (USD): ${input.budget}
Consumo previo: ${historia}

Respondé solo con el JSON del array, nada más.`;
}

/** Pide JSON estricto: un array de iniciativas de sustentabilidad con meta, plan y KPIs. */
export function buildInitiativesPrompt(input: ResourcesInput): string {
  return `Sos un consultor de sustentabilidad corporativa senior. Devolvé ÚNICAMENTE un JSON (sin texto adicional, sin markdown, sin explicaciones) que sea un array de 2 a 4 iniciativas de sustentabilidad, en español.

Cada elemento del array debe tener EXACTAMENTE estos campos (no incluyas "id" ni "status"):
- title (string)
- scopes (array de strings, cada uno EXACTAMENTE uno de estos valores: "social", "cultural", "medio ambiente", "ecosistema", "reutilización", "sectores desfavorecidos", "mundo animal", "mundo vegetal")
- goal (string, meta medible y con plazo)
- plan (array de 2 a 5 objetos { step: string, date: string en formato YYYY-MM-DD, una fecha futura realista según el plazo del step })
- kpis (array de 3 a 5 objetos { name: string, unit: string, target: number > 0, current: number >= 0, el avance actual antes de empezar la iniciativa, normalmente 0 o bajo })

Contexto de recursos de la organización:
Materiales disponibles: ${input.materials}
Capacidades instaladas: ${input.capacities}
Flujos de residuos: ${input.waste || "no especificado"}
Equipo de trabajo: ${input.workforce || "no especificado"}

Respondé solo con el JSON del array, nada más.`;
}
