import type { Asset, AssetType, Impact, KeyVariable, RiskLevel } from "@/lib/types";

export interface PortfolioRiskInput {
  assets: Asset[];
  variables: KeyVariable[];
}

export interface PortfolioRiskResult {
  /** 0..1, mayor = más riesgo */
  score: number;
  label: RiskLevel;
}

/**
 * v1 en TypeScript. Reemplazable por el servicio Python (Cloud Run,
 * ver PLAN.md Fase 1) sin tocar a quien la consume: solo implementar
 * esta interfaz con la llamada al servicio real.
 */
export interface RiskCalculator {
  calculate(input: PortfolioRiskInput): PortfolioRiskResult;
}

const ASSET_TYPE_VOLATILITY: Record<AssetType, number> = {
  acción: 0.5,
  derivado: 0.9,
  producto: 0.2,
  servicio: 0.15,
};

const VARIABLE_IMPACT_WEIGHT: Record<Impact, number> = {
  alto: 1,
  medio: 0.6,
  bajo: 0.3,
};

function portfolioVolatility(assets: Asset[]): number {
  const totalWeight = assets.reduce((acc, a) => acc + a.weight, 0);
  if (totalWeight <= 0) return 0.4;
  return assets.reduce(
    (acc, a) => acc + (a.weight / totalWeight) * ASSET_TYPE_VOLATILITY[a.type],
    0,
  );
}

function variablesRisk(variables: KeyVariable[]): number {
  if (variables.length === 0) return 0.4;
  const total = variables.reduce(
    (acc, v) => acc + (v.probability / 100) * VARIABLE_IMPACT_WEIGHT[v.impact],
    0,
  );
  return Math.min(1, total / variables.length);
}

export function riskLabel(score: number): RiskLevel {
  if (score < 0.35) return "bajo";
  if (score < 0.65) return "medio";
  return "alto";
}

export const localRiskCalculator: RiskCalculator = {
  calculate({ assets, variables }) {
    const score = Math.min(1, portfolioVolatility(assets) * 0.6 + variablesRisk(variables) * 0.4);
    return { score, label: riskLabel(score) };
  },
};
