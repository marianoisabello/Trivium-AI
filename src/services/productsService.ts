import type { Channel, CoCreationInput, ProductSuggestion, Proposal } from "@/lib/types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Propuestas automáticas simuladas. Futuro: GET /api/proposals */
export async function generateProposals(segment: string, count = 4): Promise<Proposal[]> {
  await delay(1200);
  const base: Omit<Proposal, "id">[] = [
    {
      name: "Plan de gestión patrimonial dinámico",
      description: "Cartera balanceada con rebalanceo trimestral asistido por IA.",
      targetClient: `Segmento ${segment}`,
      channel: "Email",
      schedule: "mensual",
      status: "borrador",
    },
    {
      name: "Servicio de cobertura en derivados",
      description: "Cobertura automática ante variaciones de tipo de cambio.",
      targetClient: `Segmento ${segment}`,
      channel: "LinkedIn",
      schedule: "semanal",
      status: "borrador",
    },
    {
      name: "Suscripción de reportes sectoriales",
      description: "Informes quincenales personalizados por industria del cliente.",
      targetClient: `Segmento ${segment}`,
      channel: "WhatsApp",
      schedule: "semanal",
      status: "borrador",
    },
    {
      name: "Programa de onboarding financiero",
      description: "Acompañamiento de 90 días para nuevos clientes corporativos.",
      targetClient: `Segmento ${segment}`,
      channel: "Email",
      schedule: "mensual",
      status: "borrador",
    },
  ];
  return base.slice(0, count).map((p, i) => ({ ...p, id: `prop-${Date.now()}-${i}` }));
}

/** Recomendaciones de co-creación. Futuro: POST /api/cocreation */
export async function generateRecommendations(
  input: CoCreationInput,
): Promise<ProductSuggestion[]> {
  await delay(1300);
  const historia = input.history.length ? input.history.join(", ") : "sin consumo previo";
  const budget = Math.max(input.budget, 100);
  return [
    {
      id: `sug-${Date.now()}-1`,
      name: `${input.category} Esencial`,
      description: "Configuración base pensada para empezar con bajo compromiso.",
      rationale: `Tu consumo previo (${historia}) muestra preferencia por servicios de entrada. Se ajusta al presupuesto declarado.`,
      price: Math.round(budget * 0.6),
      features: ["Alta inmediata", "Soporte por email", "Reporte mensual"],
    },
    {
      id: `sug-${Date.now()}-2`,
      name: `${input.category} Plus`,
      description: "Balance entre cobertura y costo, la opción más elegida.",
      rationale: `Combina lo que ya usás con las necesidades declaradas: "${input.needs.slice(0, 70)}".`,
      price: Math.round(budget),
      features: ["Asesor asignado", "Panel en tiempo real", "Reporte quincenal", "Integraciones"],
    },
    {
      id: `sug-${Date.now()}-3`,
      name: `${input.category} Total`,
      description: "Cobertura completa con acompañamiento dedicado.",
      rationale: `Recomendado si el objetivo es escalar rápido; supera el presupuesto pero maximiza el retorno esperado.`,
      price: Math.round(budget * 1.6),
      features: ["Equipo dedicado", "SLA 4h", "Reporte semanal", "Customización total"],
    },
  ];
}

/** Vista previa de mensaje por canal. Futuro: POST /api/message-preview */
export function buildMessageTemplate(proposal: Proposal, channel: Channel): string {
  if (channel === "Email") {
    return `Asunto: ${proposal.name}\n\nHola {{nombre}},\n\nQueremos compartirte ${proposal.name.toLowerCase()}: ${proposal.description}\n\nEstá pensado para ${proposal.targetClient}. ¿Coordinamos una llamada de 15 minutos esta semana?\n\nSaludos,\n{{remitente}} — Trivium AI`;
  }
  if (channel === "LinkedIn") {
    return `Hola {{nombre}} 👋 Vi que trabajás en ${proposal.targetClient}. Estamos lanzando ${proposal.name}: ${proposal.description} ¿Te interesa que te comparta el detalle?`;
  }
  return `Hola {{nombre}}! Te escribo de Trivium AI 👋 Preparamos ${proposal.name} para ${proposal.targetClient}. ${proposal.description} ¿Te paso más info?`;
}
