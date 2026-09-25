import { prisma } from "@/repositories/prisma";

export async function createKpiMeasurement(
  organizationId: string,
  input: { kpiId: string; value: number; measuredAt: Date },
): Promise<void> {
  await prisma.kpiMeasurement.create({
    data: {
      organizationId,
      kpiId: input.kpiId,
      value: input.value,
      measuredAt: input.measuredAt,
    },
  });
}
