/**
 * Borra SOLO los datos demo: organizaciones [DEMO] (cascada) + profiles
 * demo-seed-* + usuarios demo del emulador de Firebase si está levantado.
 * Uso: bun run seed:reset
 */
import { DEMO_UID_PREFIX, deleteDemoData, disconnectPrisma } from "@/repositories/demoSeed";

async function deleteFirebaseEmulatorDemoUsers(): Promise<number> {
  if (!process.env["FIREBASE_AUTH_EMULATOR_HOST"]) return 0;
  const { getFirebaseAdminAuth } = await import("@/lib/firebase/admin");
  const auth = getFirebaseAdminAuth();
  let deleted = 0;
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    const demoUids = page.users.map((u) => u.uid).filter((uid) => uid.startsWith(DEMO_UID_PREFIX));
    if (demoUids.length > 0) {
      await auth.deleteUsers(demoUids);
      deleted += demoUids.length;
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return deleted;
}

function assertNotProduction(): void {
  const cloudSql = process.env["CLOUD_SQL_CONNECTION_NAME"];
  const dbUrl = process.env["DATABASE_URL"] ?? "";
  const looksLocal =
    !cloudSql &&
    (dbUrl === "" ||
      dbUrl.includes("localhost") ||
      dbUrl.includes("127.0.0.1") ||
      dbUrl.includes("@postgres"));
  if (looksLocal) return;
  const confirmed =
    process.argv.includes("--allow-production") && process.env["SEED_ALLOW_PRODUCTION"] === "yes";
  if (!confirmed) {
    throw new Error(
      "Entorno NO local detectado. seed:reset aborta. Para forzar: --allow-production y SEED_ALLOW_PRODUCTION=yes.",
    );
  }
}

async function main(): Promise<void> {
  assertNotProduction();
  const result = await deleteDemoData();
  const firebaseDeleted = await deleteFirebaseEmulatorDemoUsers();
  console.log(
    `✅ Reset demo: ${result.organizations} organizaciones, ${result.profiles} profiles, ` +
      `${firebaseDeleted} usuarios del emulador de Firebase.`,
  );
}

main()
  .then(() => disconnectPrisma())
  .catch((error: unknown) => {
    console.error("❌ seed:reset falló:", error);
    void disconnectPrisma().finally(() => process.exit(1));
  });
