import { prisma } from "@/repositories/prisma";

export interface OrganizationRecord {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  onboardingCompleted: boolean;
}

/** Sin scope por organizationId a propósito: se usa para RESOLVER esa organización (crearla o leerla por id conocido). */
export async function createOrganization(input: {
  name: string;
  industry?: string | undefined;
  size?: string | undefined;
}): Promise<OrganizationRecord> {
  return prisma.organization.create({
    data: { name: input.name, industry: input.industry ?? null, size: input.size ?? null },
  });
}

export async function getOrganizationById(
  organizationId: string,
): Promise<OrganizationRecord | null> {
  return prisma.organization.findUnique({ where: { id: organizationId } });
}

export async function updateOrganization(
  organizationId: string,
  data: { name?: string; industry?: string | null; size?: string | null },
): Promise<OrganizationRecord> {
  return prisma.organization.update({ where: { id: organizationId }, data });
}

export async function markOnboardingCompleted(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { onboardingCompleted: true },
  });
}
