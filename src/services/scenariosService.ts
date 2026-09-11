import type { AnalysisInput, RiskLevel, Scenario, ScenarioType } from "@/lib/types";

/**
 * Servicio de escenarios. Hoy devuelve datos simulados; en el futuro
 * reemplazar el cuerpo por `fetch("/api/scenarios", { ... })`.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function weightedRisk(input: AnalysisInput): number {
  const impactWeight = { alto: 1, medio: 0.6, bajo: 0.3 } as const;
  if (input.variables.length === 0) return 0.5;
  const total = input.variables.reduce(
    (acc, v) => acc + (v.probability / 100) * impactWeight[v.impact],
    0,
  );
  return Math.min(1, total / input.variables.length);
}

function riskLabel(score: number): RiskLevel {
  if (score < 0.35) return "bajo";
  if (score < 0.65) return "medio";
  return "alto";
}

export async function generateScenarios(input: AnalysisInput): Promise<Scenario[]> {
  await delay(1400);

  const volatility = weightedRisk(input);
  const derivados = input.assets.filter((a) => a.type === "derivado").length;
  const base = 6 + derivados * 1.5;
  const drivers = input.variables.slice(0, 3).map((v) => `${v.name} (impacto ${v.impact})`);
  const fallbackDrivers = drivers.length ? drivers : ["Contexto macroeconómico", "Demanda del sector"];

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
}
