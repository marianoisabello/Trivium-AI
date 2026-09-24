import { describe, expect, it } from "vitest";
import { analysisInputSchema, scenariosResponseSchema } from "@/lib/schemas";

describe("analysisInputSchema", () => {
  const valid = {
    name: "Análisis Q1",
    currentSituation: "Situación estable con exposición moderada a derivados.",
    assets: [{ id: "a1", name: "Bono", type: "acción", value: 1000, weight: 100 }],
    variables: [{ id: "v1", name: "Tipo de cambio", probability: 50, impact: "medio" }],
  };

  it("acepta un input válido", () => {
    expect(() => analysisInputSchema.parse(valid)).not.toThrow();
  });

  it("rechaza sin activos", () => {
    expect(() => analysisInputSchema.parse({ ...valid, assets: [] })).toThrow();
  });

  it("rechaza un tipo de activo inválido", () => {
    const broken = { ...valid, assets: [{ ...valid.assets[0], type: "cripto" }] };
    expect(() => analysisInputSchema.parse(broken)).toThrow();
  });

  it("rechaza probabilidad fuera de rango", () => {
    const broken = { ...valid, variables: [{ ...valid.variables[0], probability: 150 }] };
    expect(() => analysisInputSchema.parse(broken)).toThrow();
  });
});

describe("scenariosResponseSchema", () => {
  const scenario = (type: string) => ({
    id: `${type}-1`,
    type,
    expectedReturn: 5,
    risk: "medio",
    probability: 40,
    narrative: "narrativa",
    drivers: ["driver"],
  });

  it("acepta exactamente 3 escenarios válidos", () => {
    const data = [scenario("Optimista"), scenario("Esperado"), scenario("Pesimista")];
    expect(() => scenariosResponseSchema.parse(data)).not.toThrow();
  });

  it("rechaza menos de 3 escenarios", () => {
    const data = [scenario("Optimista"), scenario("Esperado")];
    expect(() => scenariosResponseSchema.parse(data)).toThrow();
  });

  it("rechaza un risk fuera del enum", () => {
    const data = [
      { ...scenario("Optimista"), risk: "extremo" },
      scenario("Esperado"),
      scenario("Pesimista"),
    ];
    expect(() => scenariosResponseSchema.parse(data)).toThrow();
  });
});
