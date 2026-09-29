import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/repositories/prisma";
import { createOrganization } from "@/repositories/organizations";
import { createClient, listClients } from "@/repositories/clients";
import { createProposals, listProposals, updateProposalStatus } from "@/repositories/proposals";

/**
 * Integración contra el Postgres local de docker-compose.yml (Sección 1) --
 * no mockea Prisma. Verifica lo que reemplaza a RLS: un repository nunca
 * devuelve ni deja modificar datos de una organización que no sea la suya.
 */
describe("guard de organización (repositories)", () => {
  let orgA: string;
  let orgB: string;

  beforeAll(async () => {
    const [a, b] = await Promise.all([
      createOrganization({ name: "Org A - test" }),
      createOrganization({ name: "Org B - test" }),
    ]);
    orgA = a.id;
    orgB = b.id;
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.$disconnect();
  });

  it("listClients de la org A no devuelve clientes de la org B", async () => {
    await createClient(orgA, {
      name: "Cliente de A",
      email: null,
      linkedin: null,
      whatsapp: null,
      segment: null,
      consumption: [],
    });
    await createClient(orgB, {
      name: "Cliente de B",
      email: null,
      linkedin: null,
      whatsapp: null,
      segment: null,
      consumption: [],
    });

    const rowsA = await listClients(orgA);
    const rowsB = await listClients(orgB);

    expect(rowsA.map((r) => r.name)).toEqual(["Cliente de A"]);
    expect(rowsB.map((r) => r.name)).toEqual(["Cliente de B"]);
  });

  it("un update con el organizationId equivocado falla y no modifica la fila de otra organización", async () => {
    const [proposal] = await createProposals(orgA, [
      {
        name: "Propuesta de A",
        description: "desc",
        targetClient: "target",
        channel: "Email",
        schedule: "semanal",
      },
    ]);

    // Alguien de la org B intenta actualizar una propuesta que es de la org A:
    // el where compuesto {id, organizationId} no matchea ninguna fila, Prisma
    // tira P2025 (record not found) en vez de actualizar 0 filas en silencio.
    await expect(updateProposalStatus(orgB, proposal!.id, "programada")).rejects.toThrow();

    const stillDraft = await prisma.proposal.findUnique({ where: { id: proposal!.id } });
    expect(stillDraft?.status).toBe("borrador");

    // Con el organizationId correcto sí se puede.
    await updateProposalStatus(orgA, proposal!.id, "programada");
    const updated = await prisma.proposal.findUnique({ where: { id: proposal!.id } });
    expect(updated?.status).toBe("programada");
  });

  it("listProposals no cruza organizaciones", async () => {
    const rowsA = await listProposals(orgA);
    const rowsB = await listProposals(orgB);
    expect(rowsA.every((p) => p.name === "Propuesta de A")).toBe(true);
    expect(rowsB).toHaveLength(0);
  });
});
