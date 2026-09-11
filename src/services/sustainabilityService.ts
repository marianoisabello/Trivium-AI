import type { Initiative, ResourcesInput } from "@/lib/types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

/** Iniciativas de sustentabilidad simuladas. Futuro: POST /api/sustainability */
export async function generateInitiatives(input: ResourcesInput): Promise<Initiative[]> {
  await delay(1400);
  const id = Date.now();

  return [
    {
      id: `ini-${id}-1`,
      title: "Programa de reutilización de materiales",
      scopes: ["medio ambiente", "reutilización", "ecosistema"],
      goal: `Reutilizar el 40% de los residuos declarados (${input.waste.slice(0, 60) || "flujo actual"}) en 12 meses.`,
      status: "propuesta",
      plan: [
        { step: "Auditoría de flujos de residuos", date: futureDate(15) },
        { step: "Acuerdo con cooperativa de reciclado", date: futureDate(45) },
        { step: "Rediseño de empaques con material recuperado", date: futureDate(90) },
        { step: "Medición de impacto y reporte público", date: futureDate(180) },
      ],
      kpis: [
        { id: `k-${id}-1`, name: "Residuo reutilizado", unit: "%", target: 40, current: 8 },
        { id: `k-${id}-2`, name: "Costo de disposición evitado", unit: "kUSD", target: 120, current: 15 },
        { id: `k-${id}-3`, name: "Proveedores circulares", unit: "un.", target: 6, current: 1 },
      ],
    },
    {
      id: `ini-${id}-2`,
      title: "Escuela de oficios para sectores desfavorecidos",
      scopes: ["social", "cultural", "sectores desfavorecidos"],
      goal: `Formar 150 personas aprovechando las capacidades instaladas (${input.capacities.slice(0, 60) || "capacidad actual"}).`,
      status: "propuesta",
      plan: [
        { step: "Diseño curricular con ONG aliada", date: futureDate(20) },
        { step: "Convocatoria y selección", date: futureDate(50) },
        { step: "Primera cohorte de 50 personas", date: futureDate(110) },
        { step: "Programa de inserción laboral", date: futureDate(200) },
      ],
      kpis: [
        { id: `k-${id}-4`, name: "Personas formadas", unit: "un.", target: 150, current: 0 },
        { id: `k-${id}-5`, name: "Inserción laboral", unit: "%", target: 60, current: 0 },
        { id: `k-${id}-6`, name: "Horas de voluntariado del equipo", unit: "h", target: 800, current: 60 },
      ],
    },
    {
      id: `ini-${id}-3`,
      title: "Corredor biológico en planta y entorno",
      scopes: ["mundo animal", "mundo vegetal", "ecosistema", "medio ambiente"],
      goal: "Restaurar 5 hectáreas linderas con especies nativas y refugios de fauna.",
      status: "propuesta",
      plan: [
        { step: "Relevamiento de biodiversidad", date: futureDate(25) },
        { step: "Vivero de especies nativas", date: futureDate(70) },
        { step: "Plantación con la comunidad", date: futureDate(140) },
      ],
      kpis: [
        { id: `k-${id}-7`, name: "Hectáreas restauradas", unit: "ha", target: 5, current: 0.5 },
        { id: `k-${id}-8`, name: "Especies nativas plantadas", unit: "un.", target: 3000, current: 250 },
        { id: `k-${id}-9`, name: "Índice de biodiversidad", unit: "pts", target: 75, current: 41 },
        { id: `k-${id}-10`, name: "Consumo de agua por ha", unit: "m³", target: 120, current: 190 },
      ],
    },
  ];
}
