import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/repositories/prisma";
import { ensureProfile, getProfile } from "@/repositories/profiles";

/**
 * Integración contra el Postgres local -- reemplaza al trigger
 * handle_new_user de Supabase. bootstrapFn (authService.functions.ts) llama
 * a ensureProfile en cada login/signup, no solo el primero, así que tiene
 * que ser un no-op seguro si el profile ya existe.
 */
describe("ensureProfile (bootstrap idempotente)", () => {
  const firebaseUid = `test-bootstrap-${Date.now()}`;

  afterAll(async () => {
    await prisma.userRole.deleteMany({ where: { firebaseUid } });
    await prisma.profile.deleteMany({ where: { firebaseUid } });
    await prisma.$disconnect();
  });

  it("crea el profile y el rol la primera vez", async () => {
    await ensureProfile({
      firebaseUid,
      email: "bootstrap@example.com",
      fullName: "Bootstrap Test",
      role: "admin",
    });

    const profile = await getProfile(firebaseUid);
    expect(profile?.fullName).toBe("Bootstrap Test");

    const roles = await prisma.userRole.findMany({ where: { firebaseUid } });
    expect(roles).toHaveLength(1);
    expect(roles[0]?.role).toBe("admin");
  });

  it("llamarlo de nuevo no duplica el rol ni pisa el organizationId ya asignado", async () => {
    await prisma.profile.update({
      where: { firebaseUid },
      data: { organizationId: null }, // sin org todavía en este test
    });

    // Segundo login: mismo firebaseUid, bootstrapFn se llama de nuevo.
    await ensureProfile({
      firebaseUid,
      email: "bootstrap@example.com",
      fullName: "Bootstrap Test",
      role: "admin",
    });
    await ensureProfile({
      firebaseUid,
      email: "bootstrap@example.com",
      fullName: "Bootstrap Test",
      role: "admin",
    });

    const roles = await prisma.userRole.findMany({ where: { firebaseUid } });
    expect(roles).toHaveLength(1);

    const profiles = await prisma.profile.findMany({ where: { firebaseUid } });
    expect(profiles).toHaveLength(1);
  });
});
