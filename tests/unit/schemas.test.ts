import { describe, expect, it } from "vitest";
import {
  analysisInputSchema,
  coCreationInputSchema,
  initiativeDraftSchema,
  proposalsGenerateInputSchema,
  recommendationsDraftResponseSchema,
  resourcesInputSchema,
  scenariosResponseSchema,
} from "@/lib/schemas";

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

describe("proposalsGenerateInputSchema", () => {
  const valid = { segment: "Corporativo", channel: "Email", cadence: "semanal" };

  it("acepta un input válido sin count (opcional)", () => {
    expect(() => proposalsGenerateInputSchema.parse(valid)).not.toThrow();
  });

  it("rechaza un canal fuera del enum", () => {
    expect(() => proposalsGenerateInputSchema.parse({ ...valid, channel: "SMS" })).toThrow();
  });

  it("rechaza count fuera de rango", () => {
    expect(() => proposalsGenerateInputSchema.parse({ ...valid, count: 0 })).toThrow();
    expect(() => proposalsGenerateInputSchema.parse({ ...valid, count: 20 })).toThrow();
  });
});

describe("coCreationInputSchema", () => {
  const valid = {
    category: "Servicio financiero",
    needs: "Necesitamos cobertura de tipo de cambio",
    budget: 1000,
    history: ["Plan básico 2023"],
  };

  it("acepta un input válido", () => {
    expect(() => coCreationInputSchema.parse(valid)).not.toThrow();
  });

  it("rechaza needs demasiado corto", () => {
    expect(() => coCreationInputSchema.parse({ ...valid, needs: "corto" })).toThrow();
  });

  it("rechaza presupuesto no positivo", () => {
    expect(() => coCreationInputSchema.parse({ ...valid, budget: 0 })).toThrow();
  });
});

describe("recommendationsDraftResponseSchema", () => {
  const suggestion = (name: string) => ({
    name,
    description: "descripción",
    rationale: "porque sí",
    price: 100,
    features: ["feature 1"],
  });

  it("acepta 2 o más sugerencias válidas", () => {
    const data = [suggestion("A"), suggestion("B")];
    expect(() => recommendationsDraftResponseSchema.parse(data)).not.toThrow();
  });

  it("rechaza menos de 2 sugerencias", () => {
    expect(() => recommendationsDraftResponseSchema.parse([suggestion("A")])).toThrow();
  });

  it("rechaza precio no positivo", () => {
    const data = [{ ...suggestion("A"), price: 0 }, suggestion("B")];
    expect(() => recommendationsDraftResponseSchema.parse(data)).toThrow();
  });
});

describe("resourcesInputSchema", () => {
  it("acepta materials/capacities con longitud mínima y waste/workforce vacíos", () => {
    const valid = { materials: "papel", capacities: "taller", waste: "", workforce: "" };
    expect(() => resourcesInputSchema.parse(valid)).not.toThrow();
  });

  it("rechaza materials demasiado corto", () => {
    const broken = { materials: "pa", capacities: "taller", waste: "", workforce: "" };
    expect(() => resourcesInputSchema.parse(broken)).toThrow();
  });
});

describe("initiativeDraftSchema", () => {
  const valid = {
    title: "Programa de reutilización",
    scopes: ["medio ambiente", "reutilización"],
    goal: "Reutilizar el 40% de los residuos en 12 meses.",
    plan: [
      { step: "Auditoría", date: "2026-10-01" },
      { step: "Implementación", date: "2026-12-01" },
    ],
    kpis: [
      { name: "Residuo reutilizado", unit: "%", target: 40, current: 8 },
      { name: "Costo evitado", unit: "kUSD", target: 120, current: 15 },
      { name: "Proveedores circulares", unit: "un.", target: 6, current: 1 },
    ],
  };

  it("acepta una iniciativa válida con 3 KPIs", () => {
    expect(() => initiativeDraftSchema.parse(valid)).not.toThrow();
  });

  it("rechaza un scope fuera de SUSTAINABILITY_SCOPES", () => {
    expect(() => initiativeDraftSchema.parse({ ...valid, scopes: ["inventado"] })).toThrow();
  });

  it("rechaza menos de 3 KPIs", () => {
    expect(() => initiativeDraftSchema.parse({ ...valid, kpis: valid.kpis.slice(0, 2) })).toThrow();
  });

  it("rechaza más de 5 KPIs", () => {
    const sixKpis = Array.from({ length: 6 }, (_, i) => ({
      name: `KPI ${i}`,
      unit: "un.",
      target: 10,
      current: 0,
    }));
    expect(() => initiativeDraftSchema.parse({ ...valid, kpis: sixKpis })).toThrow();
  });

  it("rechaza una fecha con formato inválido", () => {
    const broken = {
      ...valid,
      plan: [
        { step: "Auditoría", date: "01/10/2026" },
        { step: "Implementación", date: "2026-12-01" },
      ],
    };
    expect(() => initiativeDraftSchema.parse(broken)).toThrow();
  });
});
