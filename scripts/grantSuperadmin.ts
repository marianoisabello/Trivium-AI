/**
 * Asigna o revoca el rol superadmin (operador de la plataforma). Es la ÚNICA
 * forma de crear un superadmin: la app nunca lo asigna desde un request.
 *
 * Uso:
 *   bun run superadmin:grant  usuario@dominio.com --yes
 *   bun run superadmin:revoke usuario@dominio.com --yes
 *
 * Requisitos: el usuario ya inició sesión alguna vez (tiene profile) y el
 * entorno apunta a la base y a Firebase correctos (.env.local o variables de
 * entorno). Contra Cloud SQL real, usar DATABASE_URL vía Cloud SQL Auth Proxy
 * (el Connector de src/repositories/prisma.ts no funciona en Windows nativo).
 *
 * Tras asignar, el usuario debe cerrar sesión y volver a entrar para que su
 * token traiga el claim nuevo. Al revocar, el acceso se corta al instante
 * (el servidor también valida la fila de rol en la base).
 */
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { getProfile, grantRole, revokeRole } from "@/repositories/profiles";
import { prisma } from "@/repositories/prisma";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"));
  const revoke = args.includes("--revoke");
  const confirmed = args.includes("--yes");

  if (!email) {
    throw new Error("Falta el email. Uso: bun scripts/grantSuperadmin.ts <email> [--revoke] --yes");
  }

  const auth = getFirebaseAdminAuth();
  const user = await auth.getUserByEmail(email);
  const profile = await getProfile(user.uid);
  if (!profile) {
    throw new Error(
      `${email} existe en Firebase pero todavía no tiene profile: tiene que iniciar sesión una vez antes.`,
    );
  }

  const action = revoke ? "REVOCAR" : "ASIGNAR";
  console.log(
    `Acción: ${action} rol superadmin a ${email} (organización: ${profile.organizationId ?? "ninguna"})`,
  );
  if (!confirmed) {
    console.log("Sin cambios. Repetí el comando con --yes para aplicarlo.");
    return;
  }

  if (revoke) {
    await revokeRole(user.uid, "superadmin");
    await auth.setCustomUserClaims(user.uid, { ...user.customClaims, role: "admin" });
    await auth.revokeRefreshTokens(user.uid);
    console.log("OK: rol revocado y sesiones renovadas.");
  } else {
    await grantRole(user.uid, "superadmin");
    await auth.setCustomUserClaims(user.uid, { ...user.customClaims, role: "superadmin" });
    console.log("OK: rol asignado. El usuario debe cerrar sesión y volver a entrar.");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
