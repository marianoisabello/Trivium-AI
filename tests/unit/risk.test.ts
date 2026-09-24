import { describe, expect, it } from "vitest";
import { localRiskCalculator } from "@/lib/risk";
import type { Asset, KeyVariable } from "@/lib/types";

const asset = (over: Partial<Asset> = {}): Asset => ({
  id: "a1",
  name: "Bono soberano",
  type: "acción",
  value: 1000,
  weight: 100,
  ...over,
});

const variable = (over: Partial<KeyVariable> = {}): KeyVariable => ({
  id: "v1",
  name: "Tipo de cambio",
  probability: 50,
  impact: "medio",
  ...over,
});

describe("localRiskCalculator", () => {
  it("etiqueta como bajo una cartera de productos/servicios con variables de baja probabilidad e impacto", () => {
    const result = localRiskCalculator.calculate({
      assets: [asset({ type: "servicio", weight: 100 })],
      variables: [variable({ probability: 10, impact: "bajo" })],
    });
    expect(result.label).toBe("bajo");
    expect(result.score).toBeLessThan(0.35);
  });

  it("etiqueta como alto una cartera concentrada en derivados con variables de alto impacto y probabilidad", () => {
    const result = localRiskCalculator.calculate({
      assets: [asset({ type: "derivado", weight: 100 })],
      variables: [variable({ probability: 90, impact: "alto" })],
    });
    expect(result.label).toBe("alto");
    expect(result.score).toBeGreaterThanOrEqual(0.65);
  });

  it("no rompe con carteras sin variables ni peso cargado", () => {
    const result = localRiskCalculator.calculate({
      assets: [asset({ weight: 0 })],
      variables: [],
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("mantiene el score dentro de [0,1] con múltiples activos y variables de alto impacto", () => {
    const result = localRiskCalculator.calculate({
      assets: [
        asset({ type: "derivado", weight: 60 }),
        asset({ id: "a2", type: "acción", weight: 40 }),
      ],
      variables: [
        variable({ probability: 100, impact: "alto" }),
        variable({ id: "v2", probability: 100, impact: "alto" }),
      ],
    });
    expect(result.score).toBeLessThanOrEqual(1);
  });
});
