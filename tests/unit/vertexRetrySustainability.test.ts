import { describe, expect, it, vi } from "vitest";
import { generateInitiativesViaModel } from "@/lib/ai/vertex";
import type { ResourcesInput } from "@/lib/types";

const input: ResourcesInput = {
  materials: "Papel y cartón de packaging",
  capacities: "Taller de armado en planta",
  waste: "20% de residuo de cartón mensual",
  workforce: "12 personas en logística",
};

const validResponse = JSON.stringify([
  {
    title: "Programa de reutilización de materiales",
    scopes: ["medio ambiente", "reutilización"],
    goal: "Reutilizar el 40% de los residuos declarados en 12 meses.",
    plan: [
      { step: "Auditoría de flujos de residuos", date: "2026-10-15" },
      { step: "Acuerdo con cooperativa de reciclado", date: "2026-11-15" },
    ],
    kpis: [
      { name: "Residuo reutilizado", unit: "%", target: 40, current: 8 },
      { name: "Costo de disposición evitado", unit: "kUSD", target: 120, current: 15 },
      { name: "Proveedores circulares", unit: "un.", target: 6, current: 1 },
    ],
  },
]);

describe("generateInitiativesViaModel", () => {
  it("devuelve las iniciativas si el modelo responde bien al primer intento", async () => {
    const callModel = vi.fn().mockResolvedValueOnce(validResponse);
    const result = await generateInitiativesViaModel(input, callModel);
    expect(result).toHaveLength(1);
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it("reintenta una vez si la primera respuesta está malformada, y usa la segunda si es válida", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce("esto no es JSON")
      .mockResolvedValueOnce(validResponse);
    const result = await generateInitiativesViaModel(input, callModel);
    expect(result).toHaveLength(1);
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it("lanza el error del primer intento si ambos intentos fallan", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce("esto no es JSON")
      .mockResolvedValueOnce("{ tampoco esto }");
    await expect(generateInitiativesViaModel(input, callModel)).rejects.toThrow();
    expect(callModel).toHaveBeenCalledTimes(2);
  });
});
