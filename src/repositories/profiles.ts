import { prisma } from "@/repositories/prisma";
import type { Role } from "@prisma/client";
import { pickEffectiveRole } from "@/lib/auth/roles";

export interface ProfileRecord {
  firebaseUid: string;
  organizationId: string | null;
  fullName: string | null;
  email: string | null;
}

/**
 * Idempotente: crea el profile + rol si no existen (reemplaza el trigger
 * handle_new_user de Supabase). No toca organizationId si el profile ya
 * existe -- eso lo cambia únicamente assignOrganization.
 */
export async function ensureProfile(input: {
  firebaseUid: string;
  email: string | null;
  fullName: string | null;
  role: Role;
}): Promise<ProfileRecord> {
  const profile = await prisma.profile.upsert({
    where: { firebaseUid: input.firebaseUid },
    update: {},
    create: {
      firebaseUid: input.firebaseUid,
      email: input.email,
      fullName: input.fullName,
    },
  });

  await prisma.userRole.upsert({
    where: { firebaseUid_role: { firebaseUid: input.firebaseUid, role: input.role } },
    update: {},
    create: { firebaseUid: input.firebaseUid, role: input.role },
  });

  return profile;
}

export async function getProfile(firebaseUid: string): Promise<ProfileRecord | null> {
  return prisma.profile.findUnique({ where: { firebaseUid } });
}

/** Rol efectivo: determinista aunque el usuario tenga varios (superadmin > admin > cliente). */
export async function getRole(firebaseUid: string): Promise<Role> {
  const rows = await prisma.userRole.findMany({ where: { firebaseUid }, select: { role: true } });
  return pickEffectiveRole(rows.map((r) => r.role));
}

export async function hasRole(firebaseUid: string, role: Role): Promise<boolean> {
  const row = await prisma.userRole.findUnique({
    where: { firebaseUid_role: { firebaseUid, role } },
    select: { id: true },
  });
  return row !== null;
}

/**
 * Solo para scripts de operación (scripts/grant-superadmin.ts). El profile tiene
 * que existir (el usuario ya inició sesión alguna vez): la FK lo exige.
 */
export async function grantRole(firebaseUid: string, role: Role): Promise<void> {
  await prisma.userRole.upsert({
    where: { firebaseUid_role: { firebaseUid, role } },
    update: {},
    create: { firebaseUid, role },
  });
}

export async function revokeRole(firebaseUid: string, role: Role): Promise<void> {
  await prisma.userRole.deleteMany({ where: { firebaseUid, role } });
}

export async function assignOrganization(
  firebaseUid: string,
  organizationId: string,
): Promise<void> {
  await prisma.profile.update({ where: { firebaseUid }, data: { organizationId } });
}

export async function updateFullName(firebaseUid: string, fullName: string): Promise<void> {
  await prisma.profile.update({ where: { firebaseUid }, data: { fullName } });
}
