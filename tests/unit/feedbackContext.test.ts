import { describe, expect, it } from "vitest";
import { summarizeProposalFeedback, summarizeScenarioFeedback } from "@/lib/server/feedbackContext";

describe("summarizeProposalFeedback", () => {
  it("devuelve undefined si no hay feedback", () => {
    expect(summarizeProposalFeedback([])).toBeUndefined();
  });

  it("cuenta aprobadas y rechazadas", () => {
    const summary = summarizeProposalFeedback([
      { decision: "aprobado", reason: null },
      { decision: "aprobado", reason: null },
      { decision: "rechazado", reason: "canal poco usado por este segmento" },
    ]);
    expect(summary).toContain("2 se aprobaron");
    expect(summary).toContain("1 se rechazaron");
    expect(summary).toContain("canal poco usado por este segmento");
  });

  it("no incluye motivos si no hay rechazos con reason", () => {
    const summary = summarizeProposalFeedback([
      { decision: "aprobado", reason: null },
      { decision: "rechazado", reason: null },
    ]);
    expect(summary).not.toContain("Motivos de rechazo");
  });
});

describe("summarizeScenarioFeedback", () => {
  it("devuelve undefined si no hay feedback", () => {
    expect(summarizeScenarioFeedback([])).toBeUndefined();
  });

  it("agrupa por tipo de escenario", () => {
    const summary = summarizeScenarioFeedback([
      { scenario_type: "Optimista", decision: "aprobado", reason: null },
      {
        scenario_type: "Pesimista",
        decision: "rechazado",
        reason: "muy pesimista para el contexto",
      },
      { scenario_type: "Pesimista", decision: "aprobado", reason: null },
    ]);
    expect(summary).toContain("Optimista: 1 aprobado(s), 0 rechazado(s)");
    expect(summary).toContain("Pesimista: 1 aprobado(s), 1 rechazado(s)");
    expect(summary).toContain("muy pesimista para el contexto");
  });

  it("limita a 3 motivos por tipo", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      scenario_type: "Pesimista",
      decision: "rechazado",
      reason: `motivo ${i}`,
    }));
    const summary = summarizeScenarioFeedback(rows);
    expect(summary).toContain("motivo 0");
    expect(summary).toContain("motivo 2");
    expect(summary).not.toContain("motivo 3");
  });
});
