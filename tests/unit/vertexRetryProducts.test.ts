import { describe, expect, it, vi } from "vitest";
import { generateProposalsViaModel, generateRecommendationsViaModel } from "@/lib/ai/vertex";
import type { CoCreationInput } from "@/lib/types";
import type { ProposalsGenerateInput } from "@/lib/ai/types";

const proposalsInput: ProposalsGenerateInput = {
  segment: "Corporativo",
  channel: "Email",
  cadence: "mensual",
};

const validProposalsResponse = JSON.stringify([
  {
    name: "Plan de gestión patrimonial dinámico",
    description: "Cartera balanceada con rebalanceo trimestral asistido por IA.",
    targetClient: "Segmento Corporativo",
    channel: "Email",
    schedule: "mensual",
  },
]);

describe("generateProposalsViaModel", () => {
  it("devuelve las propuestas si el modelo responde bien al primer intento", async () => {
    const callModel = vi.fn().mockResolvedValueOnce(validProposalsResponse);
    const result = await generateProposalsViaModel(proposalsInput, callModel);
    expect(result).toHaveLength(1);
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it("reintenta una vez si la primera respuesta está malformada, y usa la segunda si es válida", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce("esto no es JSON")
      .mockResolvedValueOnce(validProposalsResponse);
    const result = await generateProposalsViaModel(proposalsInput, callModel);
    expect(result).toHaveLength(1);
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it("lanza el error del primer intento si ambos intentos fallan", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce("esto no es JSON")
      .mockResolvedValueOnce("{ tampoco esto }");
    await expect(generateProposalsViaModel(proposalsInput, callModel)).rejects.toThrow();
    expect(callModel).toHaveBeenCalledTimes(2);
  });
});

const coCreationInput: CoCreationInput = {
  category: "Servicio financiero",
  needs: "Necesitamos cobertura de tipo de cambio para importaciones",
  budget: 1000,
  history: ["Plan básico 2023"],
};

const validRecommendationsResponse = JSON.stringify([
  {
    name: "Servicio financiero Esencial",
    description: "Configuración base.",
    rationale: "Se ajusta al presupuesto declarado.",
    price: 600,
    features: ["Alta inmediata"],
  },
  {
    name: "Servicio financiero Plus",
    description: "Balance entre cobertura y costo.",
    rationale: "Combina lo que ya usás.",
    price: 1000,
    features: ["Asesor asignado"],
  },
]);

describe("generateRecommendationsViaModel", () => {
  it("devuelve las recomendaciones si el modelo responde bien al primer intento", async () => {
    const callModel = vi.fn().mockResolvedValueOnce(validRecommendationsResponse);
    const result = await generateRecommendationsViaModel(coCreationInput, callModel);
    expect(result).toHaveLength(2);
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it("reintenta una vez si la primera respuesta está malformada, y usa la segunda si es válida", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce("esto no es JSON")
      .mockResolvedValueOnce(validRecommendationsResponse);
    const result = await generateRecommendationsViaModel(coCreationInput, callModel);
    expect(result).toHaveLength(2);
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it("lanza el error del primer intento si ambos intentos fallan", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce("esto no es JSON")
      .mockResolvedValueOnce("{ tampoco esto }");
    await expect(generateRecommendationsViaModel(coCreationInput, callModel)).rejects.toThrow();
    expect(callModel).toHaveBeenCalledTimes(2);
  });
});
