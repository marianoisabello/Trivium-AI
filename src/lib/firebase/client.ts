import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";

/**
 * Reemplaza src/integrations/supabase/client.ts. Con
 * VITE_FIREBASE_USE_EMULATOR=true (o project id "demo-*") se conecta al
 * emulador local en vez de a un proyecto real -- así se puede desarrollar y
 * testear signup/login sin tener Identity Platform real todavía.
 */
function createFirebaseAuth(): Auth {
  const projectId = import.meta.env["VITE_FIREBASE_PROJECT_ID"] || "demo-trivium";
  const useEmulator =
    import.meta.env["VITE_FIREBASE_USE_EMULATOR"] === "true" || projectId.startsWith("demo-");

  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: import.meta.env["VITE_FIREBASE_API_KEY"] || "demo-api-key",
        authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"] || `${projectId}.firebaseapp.com`,
        projectId,
      });

  const auth = getAuth(app);
  if (useEmulator) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  return auth;
}

let _auth: Auth | undefined;

export function getFirebaseAuth(): Auth {
  _auth ??= createFirebaseAuth();
  return _auth;
}

/**
 * Fuerza un refresh del ID token. Necesario después de que el servidor
 * cambia los custom claims (ej. createOrganizationFn) -- el token ya emitido
 * no los tiene hasta que se pide uno nuevo explícitamente.
 */
export async function refreshIdToken(): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (user) await user.getIdToken(true);
}
