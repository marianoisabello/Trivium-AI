import { prisma } from "@/repositories/prisma";
import type { Prisma } from "@prisma/client";

export interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  linkedin: string | null;
  whatsapp: string | null;
  segment: string | null;
  consumption: unknown;
}

export async function createClient(
  organizationId: string,
  input: {
    name: string;
    email: string | null;
    linkedin: string | null;
    whatsapp: string | null;
    segment: string | null;
    consumption: unknown;
  },
): Promise<void> {
  await prisma.client.create({
    data: { ...input, organizationId, consumption: input.consumption as Prisma.InputJsonValue },
  });
}

export async function listClients(organizationId: string): Promise<ClientRow[]> {
  return prisma.client.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      linkedin: true,
      whatsapp: true,
      segment: true,
      consumption: true,
    },
  });
}
