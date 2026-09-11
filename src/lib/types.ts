export type AssetType = "acción" | "derivado" | "producto" | "servicio";
export type Impact = "alto" | "medio" | "bajo";
export type RiskLevel = "bajo" | "medio" | "alto";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  value: number;
  weight: number;
}

export interface KeyVariable {
  id: string;
  name: string;
  probability: number;
  impact: Impact;
}

export interface AnalysisInput {
  name: string;
  currentSituation: string;
  assets: Asset[];
  variables: KeyVariable[];
}

export type ScenarioType = "Optimista" | "Esperado" | "Pesimista";

export interface Scenario {
  id: string;
  type: ScenarioType;
  expectedReturn: number;
  risk: RiskLevel;
  probability: number;
  narrative: string;
  drivers: string[];
}

export type Channel = "Email" | "LinkedIn" | "WhatsApp";
export type Cadence = "semanal" | "mensual";
export type ProposalStatus = "borrador" | "programada" | "enviada" | "pausada";

export interface Proposal {
  id: string;
  name: string;
  description: string;
  targetClient: string;
  channel: Channel;
  schedule: Cadence;
  status: ProposalStatus;
  template?: string;
}

export interface CoCreationInput {
  category: string;
  needs: string;
  budget: number;
  history: string[];
}

export interface ProductSuggestion {
  id: string;
  name: string;
  description: string;
  rationale: string;
  price: number;
  features: string[];
}

export interface ClientRecord {
  id: string;
  name: string;
  email: string;
  linkedin: string;
  whatsapp: string;
  segment: string;
  consumption: string[];
}

export const SUSTAINABILITY_SCOPES = [
  "social",
  "cultural",
  "medio ambiente",
  "ecosistema",
  "reutilización",
  "sectores desfavorecidos",
  "mundo animal",
  "mundo vegetal",
] as const;

export type SustainabilityScope = (typeof SUSTAINABILITY_SCOPES)[number];

export type InitiativeStatus = "propuesta" | "en ejecución" | "completada";

export interface PlanStep {
  step: string;
  date: string;
}

export interface Kpi {
  id: string;
  name: string;
  unit: string;
  target: number;
  current: number;
  measurements?: { date: string; value: number; note?: string }[];
}

export interface Initiative {
  id: string;
  title: string;
  scopes: string[];
  goal: string;
  plan: PlanStep[];
  kpis: Kpi[];
  status: InitiativeStatus;
}

export interface ResourcesInput {
  materials: string;
  capacities: string;
  waste: string;
  workforce: string;
}
