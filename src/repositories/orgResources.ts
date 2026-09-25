import { prisma } from "@/repositories/prisma";

export async function saveOrgResources(
  organizationId: string,
  input: { materials: string; capacities: string; waste: string; workforce: string },
): Promise<void> {
  await prisma.orgResource.create({ data: { organizationId, ...input } });
}
