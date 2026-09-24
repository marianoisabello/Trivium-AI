import type { AnalysisInput, Scenario, ScenarioType } from "@/lib/types";
import type { AIProvider } from "@/lib/ai/types";
import { localRiskCalculator, riskLabel } from "@/lib/risk";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Adapter mock: genera escenarios con reglas locales, sin llamar a ningún
 * LLM. Útil para desarrollo local (AI_PROVIDER=mock) y como base del
 * comportamiento anterior a Vertex AI.
 */
export const mockProvider: AIProvider = {
  async generateScenarios(input: AnalysisInput): Promise<Scenario[]> {
    await delay(1400);

    const { score: volatility } = localRiskCalculator.calculate(input);
    const derivados = input.assets.filter((a) => a.type === "derivado").length;
    const base = 6 + derivados * 1.5;
    const drivers = input.variables.slice(0, 3).map((v) => `${v.name} (impacto ${v.impact})`);
    const fallbackDrivers = drivers.length
      ? drivers
      : ["Contexto macroeconómico", "Demanda del sector"];

    const build = (
      type: ScenarioType,
      ret: number,
      riskScore: number,
      probability: number,
      narrative: string,
    ): Scenario => ({
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      expectedReturn: Number(ret.toFixed(1)),
      risk: riskLabel(riskScore),
      probability,
      narrative,
      drivers: fallbackDrivers,
    });

    return [
      build(
        "Optimista",
        base + 8 + volatility * 10,
        volatility * 0.7,
        Math.round(20 + volatility * 10),
        `Las variables clave se resuelven a favor de la organización. La composición actual del portafolio (${input.assets.length} activos) captura el ciclo expansivo y la situación descripta ("${input.currentSituation.slice(0, 90)}...") mejora de forma sostenida.`,
      ),
      build(
        "Esperado",
        base + volatility * 3,
        volatility,
        Math.round(55 - volatility * 5),
        `Escenario de continuidad: las variables se comportan dentro de los rangos históricos. El retorno acompaña la media del sector y la exposición se mantiene equilibrada entre los activos cargados.`,
      ),
      build(
        "Pesimista",
        base - 12 - volatility * 8,
        Math.min(1, volatility + 0.35),
        Math.round(25 + volatility * 5),
        `Las variables de mayor impacto se materializan en contra. Se recomienda reducir la exposición a los activos de mayor peso y cubrir la posición en derivados antes del próximo trimestre.`,
      ),
    ];
  },
};
