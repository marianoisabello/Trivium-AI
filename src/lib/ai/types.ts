import type {
  AnalysisInput,
  Cadence,
  Channel,
  CoCreationInput,
  PlanStep,
  ResourcesInput,
  Scenario,
} from "@/lib/types";

export interface ProposalsGenerateInput {
  segment: string;
  channel: Channel;
  cadence: Cadence;
  count?: number | undefined;
}

/**
 * Tipos "draft": lo que genera el LLM, sin id ni status. El id real lo
 * asigna Postgres al insertar (proposals/initiatives/kpis) y el status
 * siempre lo fuerza el server function ("borrador"/"propuesta"), nunca el
 * modelo — así queda garantizado a nivel de tipos que nada se auto-envía.
 */
export interface ProposalDraft {
  name: string;
  description: string;
  targetClient: string;
  channel: Channel;
  schedule: Cadence;
}

export interface ProductSuggestionDraft {
  name: string;
  description: string;
  rationale: string;
  price: number;
  features: string[];
}

export interface KpiDraft {
  name: string;
  unit: string;
  target: number;
  current: number;
}

export interface InitiativeDraft {
  title: string;
  scopes: string[];
  goal: string;
  plan: PlanStep[];
  kpis: KpiDraft[];
}

/**
 * Contrato único para generación con IA. Los servicios nunca importan un
 * adapter concreto (mock.ts, vertex.ts) — siempre pasan por getAIProvider()
 * en provider.ts, así el proveedor real se enchufa sin tocar servicios ni
 * componentes.
 */
export interface AIProvider {
  /**
   * feedbackContext (Fase 4): resumen del historial de aprobaciones/rechazos
   * reciente de la organización (ver src/lib/server/feedbackContext.ts),
   * armado por el server function y pasado al prompt como contexto extra.
   * "Re-ranking simple" en la práctica: condiciona el prompt, no reentrena
   * nada. Solo scenarios y proposals lo reciben (único alcance acordado).
   */
  generateScenarios(input: AnalysisInput, feedbackContext?: string): Promise<Scenario[]>;
  generateProposals(
    input: ProposalsGenerateInput,
    feedbackContext?: string,
  ): Promise<ProposalDraft[]>;
  generateRecommendations(input: CoCreationInput): Promise<ProductSuggestionDraft[]>;
  generateInitiatives(input: ResourcesInput): Promise<InitiativeDraft[]>;
}
