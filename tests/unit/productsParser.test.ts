import { describe, expect, it } from "vitest";
import {
  ProductsParseError,
  parseProposalsResponse,
  parseRecommendationsResponse,
} from "@/lib/ai/productsParser";

const validProposals = [
  {
    name: "Plan de gestión patrimonial dinámico",
    description: "Cartera balanceada con rebalanceo trimestral asistido por IA.",
    targetClient: "Segmento Corporativo",
    channel: "Email",
    schedule: "mensual",
  },
  {
    name: "Servicio de cobertura en derivados",
    description: "Cobertura automática ante variaciones de tipo de cambio.",
    targetClient: "Segmento Corporativo",
    channel: "WhatsApp",
    schedule: "semanal",
  },
];

const validSuggestions = [
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
    features: ["Asesor asignado", "Panel en tiempo real"],
  },
];

describe("parseProposalsResponse", () => {
  it("parsea una respuesta válida", () => {
    const result = parseProposalsResponse(JSON.stringify(validProposals));
    expect(result).toHaveLength(2);
    expect(result[0]?.channel).toBe("Email");
  });

  it("rechaza JSON malformado", () => {
    expect(() => parseProposalsResponse("{ esto no es json")).toThrow(ProductsParseError);
  });

  it("rechaza una respuesta vacía", () => {
    expect(() => parseProposalsResponse(JSON.stringify([]))).toThrow(ProductsParseError);
  });

  it("rechaza un canal inválido", () => {
    const broken = [{ ...validProposals[0], channel: "SMS" }];
    expect(() => parseProposalsResponse(JSON.stringify(broken))).toThrow(ProductsParseError);
  });

  it("no requiere ni acepta id/status del modelo, pero tampoco los rechaza si vienen de más", () => {
    // El schema no define "id" como campo: zod ignora props extra por default.
    const withExtra = [{ ...validProposals[0], id: "algo", status: "enviada" }];
    const result = parseProposalsResponse(JSON.stringify(withExtra));
    expect(result[0]).not.toHaveProperty("status");
  });
});

describe("parseRecommendationsResponse", () => {
  it("parsea una respuesta válida", () => {
    const result = parseRecommendationsResponse(JSON.stringify(validSuggestions));
    expect(result).toHaveLength(2);
    expect(result[0]?.price).toBe(600);
  });

  it("rechaza JSON malformado", () => {
    expect(() => parseRecommendationsResponse("no json")).toThrow(ProductsParseError);
  });

  it("rechaza menos de 2 sugerencias", () => {
    expect(() => parseRecommendationsResponse(JSON.stringify([validSuggestions[0]]))).toThrow(
      ProductsParseError,
    );
  });

  it("rechaza precio negativo", () => {
    const broken = [{ ...validSuggestions[0], price: -5 }, validSuggestions[1]];
    expect(() => parseRecommendationsResponse(JSON.stringify(broken))).toThrow(ProductsParseError);
  });
});
