import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

/**
 * Admin SDK, server-only (nunca debe llegar al bundle de cliente). Si
 * FIREBASE_AUTH_EMULATOR_HOST está seteado, el SDK habla con el emulador
 * local y no necesita credenciales reales -- alcanza con el projectId.
 */
function createFirebaseAdminApp(): App {
  if (getApps().length) return getApps()[0]!;

  const projectId = process.env["FIREBASE_PROJECT_ID"] || "demo-trivium";
  const usingEmulator = !!process.env["FIREBASE_AUTH_EMULATOR_HOST"];

  if (usingEmulator) {
    return initializeApp({ projectId });
  }

  const raw = process.env["FIREBASE_ADMIN_CREDENTIALS_JSON"];
  if (!raw) {
    throw new Error(
      "Falta FIREBASE_ADMIN_CREDENTIALS_JSON (o FIREBASE_AUTH_EMULATOR_HOST para desarrollo local)",
    );
  }
  const credentials = JSON.parse(raw) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  return initializeApp({
    credential: cert({
      projectId: credentials.project_id,
      clientEmail: credentials.client_email,
      privateKey: credentials.private_key,
    }),
    projectId: credentials.project_id,
  });
}

let _adminAuth: Auth | undefined;

export function getFirebaseAdminAuth(): Auth {
  _adminAuth ??= getAuth(createFirebaseAdminApp());
  return _adminAuth;
}
