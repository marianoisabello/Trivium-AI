import { PrismaClient } from "@prisma/client";

/**
 * Singleton de PrismaClient, server-only. En dev con HMR, guardarlo en
 * globalThis evita abrir una conexión nueva en cada recarga del módulo.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}
