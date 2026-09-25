export interface ProposalFeedbackRow {
  decision: string;
  reason: string | null;
}

export interface ScenarioFeedbackRow {
  scenario_type: string;
  decision: string;
  reason: string | null;
}

/**
 * "Re-ranking simple" de PLAN.md, en la práctica: un resumen corto del
 * feedback reciente de la organización para meter como contexto extra en el
 * prompt (no reentrena nada, solo condiciona la próxima generación). Devuelve
 * undefined si no hay feedback todavía, así el caller no agrega una sección
 * vacía al prompt.
 */
export function summarizeProposalFeedback(rows: ProposalFeedbackRow[]): string | undefined {
  if (rows.length === 0) return undefined;

  const aprobadas = rows.filter((r) => r.decision === "aprobado").length;
  const rechazadas = rows.filter((r) => r.decision === "rechazado");
  const motivos = rechazadas
    .map((r) => r.reason?.trim())
    .filter((r): r is string => !!r)
    .slice(0, 5);

  const partes = [
    `De las últimas ${rows.length} propuestas con feedback, ${aprobadas} se aprobaron y ${rechazadas.length} se rechazaron.`,
  ];
  if (motivos.length) {
    partes.push(`Motivos de rechazo mencionados: ${motivos.join("; ")}.`);
  }
  partes.push(
    "Tené esto en cuenta para generar propuestas más alineadas a lo que se aprueba, sin repetir literalmente lo rechazado.",
  );
  return partes.join(" ");
}

/** Igual que summarizeProposalFeedback pero agrupando por tipo de escenario. */
export function summarizeScenarioFeedback(rows: ScenarioFeedbackRow[]): string | undefined {
  if (rows.length === 0) return undefined;

  const porTipo = new Map<string, { aprobados: number; rechazados: number; motivos: string[] }>();
  for (const row of rows) {
    const entry = porTipo.get(row.scenario_type) ?? { aprobados: 0, rechazados: 0, motivos: [] };
    if (row.decision === "aprobado") entry.aprobados += 1;
    else {
      entry.rechazados += 1;
      const motivo = row.reason?.trim();
      if (motivo && entry.motivos.length < 3) entry.motivos.push(motivo);
    }
    porTipo.set(row.scenario_type, entry);
  }

  const resumenPorTipo = [...porTipo.entries()].map(
    ([tipo, { aprobados, rechazados, motivos }]) => {
      const base = `${tipo}: ${aprobados} aprobado(s), ${rechazados} rechazado(s)`;
      return motivos.length ? `${base} (motivos: ${motivos.join("; ")})` : base;
    },
  );

  return [
    `Feedback reciente por tipo de escenario — ${resumenPorTipo.join(" | ")}.`,
    "Tené esto en cuenta para ajustar tono y contenido de cada tipo de escenario, sin repetir literalmente lo rechazado.",
  ].join(" ");
}
