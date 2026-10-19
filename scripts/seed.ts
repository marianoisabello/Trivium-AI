/**
 * Seed de datos demo — idempotente y repetible.
 *
 * Uso:   bun run seed            (local: Postgres de docker-compose + opcionalmente emulador de Firebase Auth)
 * Reset: bun run seed:reset      (borra SOLO datos [DEMO] / demo-seed-*)
 *
 * Seguridad:
 * - Aborta si detecta entorno de producción (CLOUD_SQL_CONNECTION_NAME o
 *   DATABASE_URL no-local), salvo `--allow-production` + SEED_ALLOW_PRODUCTION=yes.
 * - Usuarios de Firebase: solo contra el emulador (FIREBASE_AUTH_EMULATOR_HOST);
 *   si no está, se omiten y los profiles usan uids determinísticos demo-seed-*.
 * - Idempotencia: borra los datos demo existentes y los regenera con RNG de
 *   seed fijo => correrlo N veces deja exactamente el mismo resultado.
 */
import {
  DEMO_ORG_PREFIX,
  DEMO_UID_PREFIX,
  deleteDemoData,
  disconnectPrisma,
} from "@/repositories/demoSeed";
import { createOrganization, markOnboardingCompleted } from "@/repositories/organizations";
import { ensureProfile, assignOrganization } from "@/repositories/profiles";
import { saveOrgResources } from "@/repositories/orgResources";
import { createAnalysis } from "@/repositories/analyses";
import { createScenariosForAnalysis } from "@/repositories/scenarios";
import { createClient } from "@/repositories/clients";
import { createProposals, updateProposalTemplate } from "@/repositories/proposals";
import { createInitiative, updateInitiativeStatus } from "@/repositories/initiatives";
import { createKpisForInitiative, updateKpi } from "@/repositories/kpis";
import { createKpiMeasurement } from "@/repositories/kpiMeasurements";
import { createProposalFeedback } from "@/repositories/proposalFeedback";
import { createScenarioFeedback } from "@/repositories/scenarioFeedback";
import {
  ASSET_CLASS_PARAMS,
  CLIENT_NAME_FIRST,
  CLIENT_NAME_SUFFIX,
  DEMO_ORGS,
  FEEDBACK_REASONS_APPROVE,
  FEEDBACK_REASONS_REJECT,
  type DemoAnalysisSpec,
  type DemoOrgSpec,
} from "./seedData/data";
import { intBetween, mulberry32, pick, pickMany, round2, seedFromString } from "./seedData/rng";

// ---------------------------------------------------------------- seguridad

function assertNotProduction(allowProduction: boolean): void {
  const cloudSql = process.env["CLOUD_SQL_CONNECTION_NAME"];
  const dbUrl = process.env["DATABASE_URL"] ?? "";
  const looksLocal =
    !cloudSql &&
    (dbUrl === "" ||
      dbUrl.includes("localhost") ||
      dbUrl.includes("127.0.0.1") ||
      dbUrl.includes("@postgres"));
  if (looksLocal) return;
  const confirmed = allowProduction && process.env["SEED_ALLOW_PRODUCTION"] === "yes";
  if (!confirmed) {
    throw new Error(
      "Entorno NO local detectado (CLOUD_SQL_CONNECTION_NAME o DATABASE_URL remota). " +
        "El seed demo aborta. Para forzar contra producción: --allow-production y SEED_ALLOW_PRODUCTION=yes.",
    );
  }
  console.warn("⚠️  Corriendo seed demo contra un entorno NO local (confirmado explícitamente).");
}

// --------------------------------------------------- generación determinística

interface GeneratedScenario {
  type: "Optimista" | "Esperado" | "Pesimista";
  expectedReturn: number;
  risk: "bajo" | "medio" | "alto";
  probability: number;
  narrative: string;
  drivers: string[];
}

/** Deriva 3 escenarios de la cartera y variables, sin IA: media/volatilidad ponderada por clase de activo. */
function buildScenarios(spec: DemoAnalysisSpec, rng: () => number): GeneratedScenario[] {
  let mean = 0;
  let vol = 0;
  for (const asset of spec.assets) {
    const params = ASSET_CLASS_PARAMS[asset.type];
    mean += (asset.weight / 100) * params.meanReturn;
    vol += (asset.weight / 100) * params.volatility;
  }
  // Las variables de alto impacto y alta probabilidad amplifican el rango.
  const stress = spec.variables.reduce((acc, v) => {
    const impactFactor = v.impact === "alto" ? 1 : v.impact === "medio" ? 0.5 : 0.2;
    return acc + (v.probability / 100) * impactFactor;
  }, 0);
  const spread = vol * (0.6 + 0.25 * stress);
  const risk: GeneratedScenario["risk"] = vol < 12 ? "bajo" : vol < 20 ? "medio" : "alto";
  const jitter = () => (rng() - 0.5) * 2; // -1..1

  const drivers = spec.variables.map((v) => v.name);
  const esperado = round2(mean + jitter());
  const optimista = round2(mean + spread * 0.8 + jitter());
  const pesimista = round2(mean - spread + jitter());
  const probEsperado = intBetween(rng, 45, 55);
  const probOptimista = intBetween(rng, 18, 28);
  const probPesimista = 100 - probEsperado - probOptimista;

  return [
    {
      type: "Optimista",
      expectedReturn: optimista,
      risk,
      probability: probOptimista,
      narrative:
        `Se materializan los drivers favorables (${drivers[0] ?? "demanda"}) y la cartera ` +
        `rinde ${optimista}% anual. El riesgo ${risk} se ve compensado por la diversificación entre ` +
        `${spec.assets.length} activos; conviene asegurar capacidad y precios antes del pico.`,
      drivers: pickMany(rng, drivers, Math.min(2, drivers.length)),
    },
    {
      type: "Esperado",
      expectedReturn: esperado,
      risk,
      probability: probEsperado,
      narrative:
        `Escenario base: las variables clave evolucionan según su probabilidad asignada y el retorno ` +
        `ponderado de la cartera se ubica en ${esperado}% anual con riesgo ${risk}. ` +
        `La situación actual (${spec.currentSituation.slice(0, 80)}…) se sostiene sin shocks.`,
      drivers,
    },
    {
      type: "Pesimista",
      expectedReturn: pesimista,
      risk: risk === "bajo" ? "medio" : "alto",
      probability: probPesimista,
      narrative:
        `Los riesgos dominan: ${drivers[drivers.length - 1] ?? "el contexto"} golpea márgenes y la ` +
        `cartera cae a ${pesimista}% anual. Mitigación sugerida: reforzar coberturas y escalonar ` +
        `las decisiones de CAPEX hasta tener señales de reversión.`,
      drivers: pickMany(rng, drivers, Math.min(2, drivers.length)),
    },
  ];
}

function buildClients(spec: DemoOrgSpec, rng: () => number) {
  const names = pickMany(rng, CLIENT_NAME_FIRST, spec.clientCount);
  return names.map((first, i) => {
    const name = `${first} ${pick(rng, CLIENT_NAME_SUFFIX)}`;
    const slugName = first
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-");
    // Canastas estilo Online Retail II: 3-8 ítems, concentradas en pocos SKUs.
    const basketSize = intBetween(rng, 3, Math.min(8, spec.catalog.length));
    return {
      name,
      email: `compras@${slugName}.example.com`,
      linkedin: `https://linkedin.example.com/company/${slugName}`,
      whatsapp: `+54 9 11 5555-0${String(100 + i).slice(-3)}`,
      segment: pick(rng, spec.segments),
      consumption: pickMany(rng, spec.catalog, basketSize),
    };
  });
}

function buildTemplate(proposal: { name: string; description: string; channel: string }): string {
  const saludo = proposal.channel === "WhatsApp" ? "Hola! 👋" : "Estimado/a,";
  return (
    `${saludo}\n\nTe compartimos nuestra propuesta "${proposal.name}": ${proposal.description}\n\n` +
    `Si te interesa coordinar una demo o pedir cotización, respondé este mensaje y un asesor ` +
    `te contacta en el día.\n\n[Mensaje demo generado por seed — no enviado a ningún destinatario real]`
  );
}

/** Mediciones mensuales jun-oct 2026 interpolando baseline -> ~55% del camino al target. */
function buildMeasurements(
  baseline: number,
  target: number,
  rng: () => number,
): { date: Date; value: number }[] {
  const months = [5, 6, 7, 8, 9]; // jun..oct (0-based)
  const progressEnd = 0.45 + rng() * 0.2;
  return months.map((month, i) => {
    const t = ((i + 1) / months.length) * progressEnd;
    const noise = (rng() - 0.5) * 0.06 * Math.abs(target - baseline);
    return {
      date: new Date(Date.UTC(2026, month, intBetween(rng, 3, 27))),
      value: round2(baseline + (target - baseline) * t + noise),
    };
  });
}

// ------------------------------------------------------- Firebase (emulador)

async function ensureFirebaseEmulatorUsers(
  users: { uid: string; email: string; fullName: string; role: string; organizationId: string }[],
): Promise<boolean> {
  if (!process.env["FIREBASE_AUTH_EMULATOR_HOST"]) return false;
  const { getFirebaseAdminAuth } = await import("@/lib/firebase/admin");
  const auth = getFirebaseAdminAuth();
  for (const user of users) {
    try {
      await auth.getUser(user.uid);
      await auth.deleteUser(user.uid); // recrear = idempotente también en Auth
    } catch {
      /* no existía */
    }
    await auth.createUser({
      uid: user.uid,
      email: user.email,
      password: "Demo1234!",
      displayName: user.fullName,
      emailVerified: true,
    });
    await auth.setCustomUserClaims(user.uid, {
      organizationId: user.organizationId,
      role: user.role,
    });
  }
  return true;
}

// -------------------------------------------------------------------- runSeed

export interface SeedSummary {
  organizations: number;
  users: number;
  firebaseUsersCreated: boolean;
  analyses: number;
  scenarios: number;
  clients: number;
  proposals: number;
  initiatives: number;
  kpis: number;
  measurements: number;
  feedback: number;
}

export async function runSeed(options: { allowProduction?: boolean } = {}): Promise<SeedSummary> {
  assertNotProduction(options.allowProduction ?? false);

  // Idempotencia por regeneración: borrar demo previo y recrear determinístico.
  await deleteDemoData();

  const summary: SeedSummary = {
    organizations: 0,
    users: 0,
    firebaseUsersCreated: false,
    analyses: 0,
    scenarios: 0,
    clients: 0,
    proposals: 0,
    initiatives: 0,
    kpis: 0,
    measurements: 0,
    feedback: 0,
  };
  const firebaseUsers: Parameters<typeof ensureFirebaseEmulatorUsers>[0] = [];

  for (const spec of DEMO_ORGS) {
    const rng = mulberry32(seedFromString(`trivium-demo-${spec.slug}`));
    const org = await createOrganization({
      name: `${DEMO_ORG_PREFIX}${spec.name}`,
      industry: spec.industry,
      size: spec.size,
    });
    await saveOrgResources(org.id, spec.resources);
    await markOnboardingCompleted(org.id);
    summary.organizations++;

    for (const user of spec.users) {
      const uid = `${DEMO_UID_PREFIX}${user.uidSuffix}`;
      await ensureProfile({
        firebaseUid: uid,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      });
      await assignOrganization(uid, org.id);
      firebaseUsers.push({
        uid,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: org.id,
      });
      summary.users++;
    }
    const adminUid = `${DEMO_UID_PREFIX}${spec.users[0]!.uidSuffix}`;

    // Pilar 1: análisis + escenarios + feedback de escenarios
    for (const analysisSpec of spec.analyses) {
      const analysis = await createAnalysis(org.id, adminUid, {
        name: analysisSpec.name,
        currentSituation: analysisSpec.currentSituation,
        assets: analysisSpec.assets.map((a, i) => ({ id: `${spec.slug}-asset-${i}`, ...a })),
        variables: analysisSpec.variables.map((v, i) => ({ id: `${spec.slug}-var-${i}`, ...v })),
      });
      const scenarios = buildScenarios(analysisSpec, rng);
      await createScenariosForAnalysis(org.id, analysis.id, scenarios);
      summary.analyses++;
      summary.scenarios += scenarios.length;

      const approvedScenario = pick(rng, scenarios);
      await createScenarioFeedback(org.id, {
        analysisId: analysis.id,
        scenarioType: approvedScenario.type,
        firebaseUid: adminUid,
        decision: "aprobado",
        reason: pick(rng, FEEDBACK_REASONS_APPROVE),
      });
      summary.feedback++;
      if (rng() < 0.5) {
        const rejected = scenarios.find((s) => s.type !== approvedScenario.type)!;
        await createScenarioFeedback(org.id, {
          analysisId: analysis.id,
          scenarioType: rejected.type,
          firebaseUid: adminUid,
          decision: "rechazado",
          reason: pick(rng, FEEDBACK_REASONS_REJECT),
        });
        summary.feedback++;
      }
    }

    // Clientes
    for (const client of buildClients(spec, rng)) {
      await createClient(org.id, client);
      summary.clients++;
    }

    // Pilar 2: propuestas (status "borrador"; la aprobación se registra como feedback) + templates
    const proposalRows = await createProposals(
      org.id,
      spec.proposals.map(({ approved: _approved, ...draft }) => draft),
    );
    summary.proposals += proposalRows.length;
    for (let i = 0; i < proposalRows.length; i++) {
      const propSpec = spec.proposals[i]!;
      const row = proposalRows[i]!;
      await updateProposalTemplate(org.id, row.id, buildTemplate(propSpec));
      await createProposalFeedback(org.id, {
        proposalId: row.id,
        firebaseUid: adminUid,
        decision: propSpec.approved ? "aprobado" : "rechazado",
        reason: propSpec.approved
          ? pick(rng, FEEDBACK_REASONS_APPROVE)
          : pick(rng, FEEDBACK_REASONS_REJECT),
      });
      summary.feedback++;
    }

    // Pilar 3: iniciativas + KPIs + mediciones históricas
    for (const initiativeSpec of spec.initiatives) {
      const initiative = await createInitiative(org.id, {
        title: initiativeSpec.title,
        scopes: initiativeSpec.scopes,
        goal: initiativeSpec.goal,
        plan: initiativeSpec.plan,
      });
      if (initiativeSpec.status !== "propuesta") {
        await updateInitiativeStatus(org.id, initiative.id, initiativeSpec.status);
      }
      summary.initiatives++;

      const kpiRows = await createKpisForInitiative(
        org.id,
        initiative.id,
        initiativeSpec.kpis.map((k) => ({
          name: k.name,
          unit: k.unit,
          target: k.target,
          current: k.baseline,
        })),
      );
      summary.kpis += kpiRows.length;

      const withHistory = initiativeSpec.status === "en ejecución";
      for (let i = 0; i < kpiRows.length; i++) {
        const kpiSpec = initiativeSpec.kpis[i]!;
        const kpiRow = kpiRows[i]!;
        if (!withHistory) continue;
        const measurements = buildMeasurements(kpiSpec.baseline, kpiSpec.target, rng);
        for (const m of measurements) {
          await createKpiMeasurement(org.id, {
            kpiId: kpiRow.id,
            value: m.value,
            measuredAt: m.date,
          });
          summary.measurements++;
        }
        const last = measurements[measurements.length - 1]!;
        await updateKpi(org.id, kpiRow.id, {
          name: kpiSpec.name,
          unit: kpiSpec.unit,
          targetValue: kpiSpec.target,
          currentValue: last.value,
        });
      }
    }
  }

  summary.firebaseUsersCreated = await ensureFirebaseEmulatorUsers(firebaseUsers);
  return summary;
}

// ------------------------------------------------------------------------ CLI

const isCli = process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/seed.ts") ?? false;
if (isCli) {
  const allowProduction = process.argv.includes("--allow-production");
  runSeed({ allowProduction })
    .then((summary) => {
      console.log("✅ Seed demo completado:");
      console.table(summary);
      if (!summary.firebaseUsersCreated) {
        console.log(
          "ℹ️  FIREBASE_AUTH_EMULATOR_HOST no está seteado: no se crearon usuarios en Firebase. " +
            "Levantá el emulador (bunx firebase emulators:start --only auth) y re-corré el seed " +
            "para poder loguearte con admin@demo-<org>.example.com / Demo1234!",
        );
      }
      return disconnectPrisma();
    })
    .catch((error: unknown) => {
      console.error("❌ Seed falló:", error);
      void disconnectPrisma().finally(() => process.exit(1));
    });
}
