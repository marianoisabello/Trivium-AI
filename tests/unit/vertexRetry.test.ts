import { describe, expect, it, vi } from "vitest";
import { generateScenariosViaModel } from "@/lib/ai/vertex";
import type { AnalysisInput } from "@/lib/types";

// Activo tipo "producto": getQuoteWithFallback devuelve el valor manual sin
// pegarle a ninguna red, así este test ejercita solo el flujo de
// prompt -> modelo -> parseo -> reintento, sin llamar a Vertex ni a Alpha Vantage.
const input: AnalysisInput = {
  name: "Plan de expansión",
  currentSituation: "La empresa evalúa entrar a un nuevo mercado.",
  assets: [{ id: "a1", name: "Suscripción Plus", type: "producto", value: 500, weight: 100 }],
  variables: [{ id: "v1", name: "Adopción del mercado", probability: 60, impact: "alto" }],
};

const validResponse = JSON.stringify([
  {
    id: "optimista-1",
    type: "Optimista",
    expectedReturn: 10,
    risk: "medio",
    probability: 30,
    narrative: "Escenario favorable.",
    drivers: ["Adopción del mercado"],
  },
  {
    id: "esperado-1",
    type: "Esperado",
    expectedReturn: 5,
    risk: "medio",
    probability: 50,
    narrative: "Escenario de continuidad.",
    drivers: ["Adopción del mercado"],
  },
  {
    id: "pesimista-1",
    type: "Pesimista",
    expectedReturn: -2,
    risk: "alto",
    probability: 20,
    narrative: "Escenario adverso.",
    drivers: ["Adopción del mercado"],
  },
]);

describe("generateScenariosViaModel", () => {
  it("devuelve los escenarios si el modelo responde bien al primer intento", async () => {
    const callModel = vi.fn().mockResolvedValueOnce(validResponse);
    const result = await generateScenariosViaModel(input, callModel);
    expect(result).toHaveLength(3);
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it("reintenta una vez si la primera respuesta está malformada, y usa la segunda si es válida", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce("esto no es JSON")
      .mockResolvedValueOnce(validResponse);
    const result = await generateScenariosViaModel(input, callModel);
    expect(result).toHaveLength(3);
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it("lanza el error del primer intento si ambos intentos fallan", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce("esto no es JSON")
      .mockResolvedValueOnce("{ tampoco esto }");
    await expect(generateScenariosViaModel(input, callModel)).rejects.toThrow();
    expect(callModel).toHaveBeenCalledTimes(2);
  });
});
