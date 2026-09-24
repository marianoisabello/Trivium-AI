import type { AnalysisInput } from "@/lib/types";
import type { PortfolioRiskResult } from "@/lib/risk";
import type { MarketQuote } from "@/lib/market";

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
