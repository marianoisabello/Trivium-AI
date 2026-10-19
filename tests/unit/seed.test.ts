import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/repositories/prisma";
import { createOrganization } from "@/repositories/organizations";
import { createClient, listClients } from "@/repositories/clients";
import {
  countRowsForOrg,
  deleteDemoData,
  listDemoOrganizations,
  type DemoRowCounts,
} from "@/repositories/demoSeed";
import { runSeed } from "../../scripts/seed";
import { DEMO_ORGS } from "../../scripts/seedData/data";

/**
 * Integración contra el Postgres local de docker-compose.yml, sin mockear
 * Prisma. Verifica las tres garantías del seed demo:
 * 1. Idempotencia: correrlo dos veces deja exactamente los mismos counts.
 * 2. Aislamiento: el seed y su reset no tocan datos que no sean [DEMO].
 * 3. Invariantes de dominio: ≥3 escenarios por análisis, nada "enviada".
 */
describe("seed demo (integración)", () => {
  let realOrgId: string;

  beforeAll(async () => {
    // Organización NO demo que debe sobrevivir intacta a seed + reset.
    const real = await createOrganization({ name: "Org real - seed test" });
    realOrgId = real.id;
    await createClient(realOrgId, {
      name: "Cliente real",
      email: null,
      linkedin: null,
      whatsapp: null,
      segment: null,
      consumption: [],
    });
  });

  afterAll(async () => {
    await deleteDemoData();
    await prisma.organization.deleteMany({ where: { id: realOrgId } });
    await prisma.$disconnect();
  });

  it("es idempotente: dos corridas => mismos counts por organización", async () => {
    const first = await runSeed();
    const orgsAfterFirst = await listDemoOrganizations();
    const countsFirst = new Map<string, DemoRowCounts>();
    for (const org of orgsAfterFirst) {
      countsFirst.set(org.name, await countRowsForOrg(org.id));
    }

    const second = await runSeed();
    const orgsAfterSecond = await listDemoOrganizations();

    expect(second).toEqual(first);
    expect(orgsAfterSecond.map((o) => o.name)).toEqual(orgsAfterFirst.map((o) => o.name));
    expect(orgsAfterSecond).toHaveLength(DEMO_ORGS.length);
    for (const org of orgsAfterSecond) {
      expect(await countRowsForOrg(org.id)).toEqual(countsFirst.get(org.name));
    }
  }, 120_000);

  it("cada análisis demo tiene exactamente 3 escenarios y ninguna propuesta queda 'enviada'", async () => {
    const orgs = await listDemoOrganizations();
    expect(orgs.length).toBeGreaterThan(0);
    for (const org of orgs) {
      const counts = await countRowsForOrg(org.id);
      expect(counts.scenarios).toBe(counts.analyses * 3);
      expect(counts.analyses).toBeGreaterThanOrEqual(2);
      expect(counts.clients).toBeGreaterThanOrEqual(8);
      expect(counts.clients).toBeLessThanOrEqual(15);
    }
    const sent = await prisma.proposal.count({
      where: { status: "enviada", organization: { name: { startsWith: "[DEMO] " } } },
    });
    expect(sent).toBe(0);
  }, 60_000);

  it("no toca datos reales: la org no-demo conserva sus filas tras seed + reset", async () => {
    await runSeed();
    await deleteDemoData();

    const demoOrgs = await listDemoOrganizations();
    expect(demoOrgs).toHaveLength(0);

    const realClients = await listClients(realOrgId);
    expect(realClients).toHaveLength(1);
    expect(realClients[0]!.name).toBe("Cliente real");
  }, 120_000);
});
