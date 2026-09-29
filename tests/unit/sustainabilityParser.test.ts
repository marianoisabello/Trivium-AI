import { describe, expect, it } from "vitest";
import { SustainabilityParseError, parseInitiativesResponse } from "@/lib/ai/sustainabilityParser";

const validInitiatives = [
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
];

describe("parseInitiativesResponse", () => {
  it("parsea una respuesta válida", () => {
    const result = parseInitiativesResponse(JSON.stringify(validInitiatives));
    expect(result).toHaveLength(1);
    expect(result[0]?.kpis).toHaveLength(3);
  });

  it("rechaza JSON malformado", () => {
    expect(() => parseInitiativesResponse("{ esto no es json")).toThrow(SustainabilityParseError);
  });

  it("rechaza una respuesta vacía", () => {
    expect(() => parseInitiativesResponse(JSON.stringify([]))).toThrow(SustainabilityParseError);
  });

  it("rechaza un scope fuera de SUSTAINABILITY_SCOPES", () => {
    const broken = [{ ...validInitiatives[0], scopes: ["inventado"] }];
    expect(() => parseInitiativesResponse(JSON.stringify(broken))).toThrow(
      SustainabilityParseError,
    );
  });

  it("rechaza menos de 3 KPIs", () => {
    const broken = [{ ...validInitiatives[0], kpis: validInitiatives[0]!.kpis.slice(0, 2) }];
    expect(() => parseInitiativesResponse(JSON.stringify(broken))).toThrow(
      SustainabilityParseError,
    );
  });

  it("rechaza una fecha con formato inválido", () => {
    const broken = [
      {
        ...validInitiatives[0],
        plan: [
          { step: "Auditoría", date: "15/10/2026" },
          { step: "Acuerdo", date: "2026-11-15" },
        ],
      },
    ];
    expect(() => parseInitiativesResponse(JSON.stringify(broken))).toThrow(
      SustainabilityParseError,
    );
  });
});
