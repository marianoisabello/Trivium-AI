import type {
  AnalysisInput,
  CoCreationInput,
  ResourcesInput,
  Scenario,
  ScenarioType,
} from "@/lib/types";
import type {
  AIProvider,
  InitiativeDraft,
  ProductSuggestionDraft,
  ProposalDraft,
  ProposalsGenerateInput,
} from "@/lib/ai/types";
import { localRiskCalculator, riskLabel } from "@/lib/risk";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

/**
 * Adapter mock: genera escenarios con reglas locales, sin llamar a ningún
 * LLM. Útil para desarrollo local (AI_PROVIDER=mock) y como base del
 * comportamiento anterior a Vertex AI.
 */
export const mockProvider: AIProvider = {
  async generateScenarios(input: AnalysisInput, _feedbackContext?: string): Promise<Scenario[]> {
    await delay(1400);

    const { score: volatility } = localRiskCalculator.calculate(input);
    const derivados = input.assets.filter((a) => a.type === "derivado").length;
    const base = 6 + derivados * 1.5;
    const drivers = input.variables.slice(0, 3).map((v) => `${v.name} (impacto ${v.impact})`);
    const fallbackDrivers = drivers.length
      ? drivers
      : ["Contexto macroeconómico", "Demanda del sector"];

    const build = (
      type: ScenarioType,
      ret: number,
      riskScore: number,
      probability: number,
      narrative: string,
    ): Scenario => ({
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      expectedReturn: Number(ret.toFixed(1)),
      risk: riskLabel(riskScore),
      probability,
      narrative,
      drivers: fallbackDrivers,
    });

    return [
      build(
        "Optimista",
        base + 8 + volatility * 10,
        volatility * 0.7,
        Math.round(20 + volatility * 10),
        `Las variables clave se resuelven a favor de la organización. La composición actual del portafolio (${input.assets.length} activos) captura el ciclo expansivo y la situación descripta ("${input.currentSituation.slice(0, 90)}...") mejora de forma sostenida.`,
      ),
      build(
        "Esperado",
        base + volatility * 3,
        volatility,
        Math.round(55 - volatility * 5),
        `Escenario de continuidad: las variables se comportan dentro de los rangos históricos. El retorno acompaña la media del sector y la exposición se mantiene equilibrada entre los activos cargados.`,
      ),
      build(
        "Pesimista",
        base - 12 - volatility * 8,
        Math.min(1, volatility + 0.35),
        Math.round(25 + volatility * 5),
        `Las variables de mayor impacto se materializan en contra. Se recomienda reducir la exposición a los activos de mayor peso y cubrir la posición en derivados antes del próximo trimestre.`,
      ),
    ];
  },

  async generateProposals(
    input: ProposalsGenerateInput,
    _feedbackContext?: string,
  ): Promise<ProposalDraft[]> {
    await delay(1200);
    const count = input.count ?? 4;
    const base: ProposalDraft[] = [
      {
        name: "Plan de gestión patrimonial dinámico",
        description: "Cartera balanceada con rebalanceo trimestral asistido por IA.",
        targetClient: `Segmento ${input.segment}`,
        channel: input.channel,
        schedule: input.cadence,
      },
      {
        name: "Servicio de cobertura en derivados",
        description: "Cobertura automática ante variaciones de tipo de cambio.",
        targetClient: `Segmento ${input.segment}`,
        channel: input.channel,
        schedule: input.cadence,
      },
      {
        name: "Suscripción de reportes sectoriales",
        description: "Informes quincenales personalizados por industria del cliente.",
        targetClient: `Segmento ${input.segment}`,
        channel: input.channel,
        schedule: input.cadence,
      },
      {
        name: "Programa de onboarding financiero",
        description: "Acompañamiento de 90 días para nuevos clientes corporativos.",
        targetClient: `Segmento ${input.segment}`,
        channel: input.channel,
        schedule: input.cadence,
      },
    ];
    return base.slice(0, count);
  },

  async generateRecommendations(input: CoCreationInput): Promise<ProductSuggestionDraft[]> {
    await delay(1300);
    const historia = input.history.length ? input.history.join(", ") : "sin consumo previo";
    const budget = Math.max(input.budget, 100);
    return [
      {
        name: `${input.category} Esencial`,
        description: "Configuración base pensada para empezar con bajo compromiso.",
        rationale: `Tu consumo previo (${historia}) muestra preferencia por servicios de entrada. Se ajusta al presupuesto declarado.`,
        price: Math.round(budget * 0.6),
        features: ["Alta inmediata", "Soporte por email", "Reporte mensual"],
      },
      {
        name: `${input.category} Plus`,
        description: "Balance entre cobertura y costo, la opción más elegida.",
        rationale: `Combina lo que ya usás con las necesidades declaradas: "${input.needs.slice(0, 70)}".`,
        price: Math.round(budget),
        features: ["Asesor asignado", "Panel en tiempo real", "Reporte quincenal", "Integraciones"],
      },
      {
        name: `${input.category} Total`,
        description: "Cobertura completa con acompañamiento dedicado.",
        rationale: `Recomendado si el objetivo es escalar rápido; supera el presupuesto pero maximiza el retorno esperado.`,
        price: Math.round(budget * 1.6),
        features: ["Equipo dedicado", "SLA 4h", "Reporte semanal", "Customización total"],
      },
    ];
  },

  async generateInitiatives(input: ResourcesInput): Promise<InitiativeDraft[]> {
    await delay(1400);
    return [
      {
        title: "Programa de reutilización de materiales",
        scopes: ["medio ambiente", "reutilización", "ecosistema"],
        goal: `Reutilizar el 40% de los residuos declarados (${input.waste.slice(0, 60) || "flujo actual"}) en 12 meses.`,
        plan: [
          { step: "Auditoría de flujos de residuos", date: futureDate(15) },
          { step: "Acuerdo con cooperativa de reciclado", date: futureDate(45) },
          { step: "Rediseño de empaques con material recuperado", date: futureDate(90) },
          { step: "Medición de impacto y reporte público", date: futureDate(180) },
        ],
        kpis: [
          { name: "Residuo reutilizado", unit: "%", target: 40, current: 8 },
          { name: "Costo de disposición evitado", unit: "kUSD", target: 120, current: 15 },
          { name: "Proveedores circulares", unit: "un.", target: 6, current: 1 },
        ],
      },
      {
        title: "Escuela de oficios para sectores desfavorecidos",
        scopes: ["social", "cultural", "sectores desfavorecidos"],
        goal: `Formar 150 personas aprovechando las capacidades instaladas (${input.capacities.slice(0, 60) || "capacidad actual"}).`,
        plan: [
          { step: "Diseño curricular con ONG aliada", date: futureDate(20) },
          { step: "Convocatoria y selección", date: futureDate(50) },
          { step: "Primera cohorte de 50 personas", date: futureDate(110) },
          { step: "Programa de inserción laboral", date: futureDate(200) },
        ],
        kpis: [
          { name: "Personas formadas", unit: "un.", target: 150, current: 0 },
          { name: "Inserción laboral", unit: "%", target: 60, current: 0 },
          { name: "Horas de voluntariado del equipo", unit: "h", target: 800, current: 60 },
        ],
      },
      {
        title: "Corredor biológico en planta y entorno",
        scopes: ["mundo animal", "mundo vegetal", "ecosistema", "medio ambiente"],
        goal: "Restaurar 5 hectáreas linderas con especies nativas y refugios de fauna.",
        plan: [
          { step: "Relevamiento de biodiversidad", date: futureDate(25) },
          { step: "Vivero de especies nativas", date: futureDate(70) },
          { step: "Plantación con la comunidad", date: futureDate(140) },
        ],
        kpis: [
          { name: "Hectáreas restauradas", unit: "ha", target: 5, current: 0.5 },
          { name: "Especies nativas plantadas", unit: "un.", target: 3000, current: 250 },
          { name: "Índice de biodiversidad", unit: "pts", target: 75, current: 41 },
          { name: "Consumo de agua por ha", unit: "m³", target: 120, current: 190 },
        ],
      },
    ];
  },
};
