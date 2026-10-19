import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/repositories/prisma";
import { createOrganization } from "@/repositories/organizations";
import { createClient, listClients } from "@/repositories/clients";
import { ensureProfile, getRole, grantRole, hasRole, revokeRole } from "@/repositories/profiles";
import { getOrganizationDetail, listOrganizationsOverview } from "@/repositories/platform";

/**
 * Integración contra Postgres local (no mockea Prisma). Verifica que el
 * repository de plataforma ve TODAS las organizaciones y que los repositories
 * normales siguen aislados (la excepción del superadmin no los contamina).
 */
const UID = "test-superadmin-uid";
const UID_USER = "test-regular-user-uid";
const emptyClient = { email: null, linkedin: null, whatsapp: null, segment: null, consumption: [] };

describe("repository de plataforma (superadmin)", () => {
  let orgA: string;
  let orgB: string;

  beforeAll(async () => {
    const [a, b] = await Promise.all([
      createOrganization({ name: "Plat Org A - test" }),
      createOrganization({ name: "Plat Org B - test" }),
    ]);
    orgA = a.id;
    orgB = b.id;
    await createClient(orgA, { name: "Cliente de A", ...emptyClient });
    await createClient(orgA, { name: "Otro de A", ...emptyClient });
    await createClient(orgB, { name: "Cliente de B", ...emptyClient });
    await ensureProfile({
      firebaseUid: UID,
      email: "sa@test.local",
      fullName: "SA",
      role: "admin",
    });
    await ensureProfile({
      firebaseUid: UID_USER,
      email: "u@test.local",
      fullName: "U",
      role: "admin",
    });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.profile.deleteMany({ where: { firebaseUid: { in: [UID, UID_USER] } } });
    await prisma.$disconnect();
  });

  it("lista ambas organizaciones con sus conteos", async () => {
    const overview = await listOrganizationsOverview();
    const a = overview.find((o) => o.id === orgA);
    const b = overview.find((o) => o.id === orgB);

    expect(a?.counts.clients).toBe(2);
    expect(b?.counts.clients).toBe(1);
  });

  it("el detalle devuelve los clientes de esa organización y de ninguna otra", async () => {
    const detail = await getOrganizationDetail(orgA);

    expect(detail?.organization.name).toBe("Plat Org A - test");
    expect(detail?.clients.map((c) => c.name).sort()).toEqual(["Cliente de A", "Otro de A"]);
  });

  it("una organización inexistente devuelve null", async () => {
    expect(await getOrganizationDetail("00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("los repositories normales siguen aislados por organización", async () => {
    expect((await listClients(orgA)).map((c) => c.name).sort()).toEqual([
      "Cliente de A",
      "Otro de A",
    ]);
    expect((await listClients(orgB)).map((c) => c.name)).toEqual(["Cliente de B"]);
  });

  it("asignar y revocar el rol superadmin se refleja en hasRole y getRole", async () => {
    expect(await hasRole(UID, "superadmin")).toBe(false);
    expect(await getRole(UID)).toBe("admin");

    await grantRole(UID, "superadmin");
    await grantRole(UID, "superadmin"); // idempotente
    expect(await hasRole(UID, "superadmin")).toBe(true);
    expect(await getRole(UID)).toBe("superadmin"); // gana sobre admin

    await revokeRole(UID, "superadmin");
    expect(await hasRole(UID, "superadmin")).toBe(false);
    expect(await getRole(UID)).toBe("admin");
  });

  it("un usuario común nunca tiene el rol superadmin", async () => {
    expect(await hasRole(UID_USER, "superadmin")).toBe(false);
  });
});
