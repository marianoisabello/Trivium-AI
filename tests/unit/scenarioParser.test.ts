import { describe, expect, it } from "vitest";
import { parseScenariosResponse, ScenarioParseError } from "@/lib/ai/scenarioParser";

const validScenarios = [
  {
    id: "optimista-1",
    type: "Optimista",
    expectedReturn: 12.5,
    risk: "medio",
    probability: 30,
    narrative: "Todo sale bien.",
    drivers: ["Tipo de cambio"],
  },
  {
    id: "esperado-1",
    type: "Esperado",
    expectedReturn: 6,
    risk: "medio",
    probability: 50,
    narrative: "Continuidad del contexto actual.",
    drivers: ["Demanda del sector"],
  },
  {
    id: "pesimista-1",
    type: "Pesimista",
    expectedReturn: -4,
    risk: "alto",
    probability: 20,
    narrative: "Las variables clave se materializan en contra.",
    drivers: ["Tipo de cambio"],
  },
];

describe("parseScenariosResponse", () => {
  it("parsea una respuesta válida con 3 escenarios", () => {
    const result = parseScenariosResponse(JSON.stringify(validScenarios));
    expect(result).toHaveLength(3);
    expect(result[0]?.type).toBe("Optimista");
  });

  it("rechaza JSON malformado", () => {
    expect(() => parseScenariosResponse("{ esto no es json")).toThrow(ScenarioParseError);
  });

  it("rechaza una respuesta con menos de 3 escenarios", () => {
    expect(() => parseScenariosResponse(JSON.stringify(validScenarios.slice(0, 2)))).toThrow(
      ScenarioParseError,
    );
  });

  it("rechaza una respuesta a la que le falta un campo requerido", () => {
    const broken = validScenarios.map((s) => {
      const { narrative: _narrative, ...rest } = s;
      return rest;
    });
    expect(() => parseScenariosResponse(JSON.stringify(broken))).toThrow(ScenarioParseError);
  });

  it("rechaza un tipo de escenario inválido", () => {
    const broken = validScenarios.map((s, i) => (i === 0 ? { ...s, type: "Neutro" } : s));
    expect(() => parseScenariosResponse(JSON.stringify(broken))).toThrow(ScenarioParseError);
  });
});
