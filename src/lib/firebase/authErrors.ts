/**
 * Traduce códigos de Firebase Auth a mensajes en español accionables.
 * Con Email Enumeration Protection, Firebase unifica "usuario inexistente" y
 * "contraseña incorrecta" en auth/invalid-credential.
 */
export function firebaseAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Email o contraseña incorrectos. Si migraste desde Supabase, creá una cuenta nueva en la pestaña «Crear cuenta».";
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con ese email. Probá iniciar sesión o recuperá la contraseña.";
    case "auth/weak-password":
      return "La contraseña es demasiado débil. Usá al menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Esperá unos minutos e intentá de nuevo.";
    case "auth/network-request-failed":
      return "No pudimos conectar con Firebase. Revisá tu red o que el emulador esté corriendo si estás en local.";
    case "auth/operation-not-allowed":
      return "El inicio de sesión con email/contraseña no está habilitado en Firebase (Identity Platform).";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
      return "La API key de Firebase no es válida. Revisá VITE_FIREBASE_API_KEY en el entorno.";
    case "auth/configuration-not-found":
      return "Firebase Auth no está configurado para este proyecto. Revisá VITE_FIREBASE_PROJECT_ID y que Identity Platform esté habilitado.";
    case "auth/expired-action-code":
    case "auth/invalid-action-code":
      return "El enlace no es válido o ya expiró. Pedí uno nuevo desde «¿Olvidaste tu contraseña?».";
    default: {
      if (error instanceof Error && error.message) return error.message;
      return "Ocurrió un error de autenticación. Probá de nuevo.";
    }
  }
}
