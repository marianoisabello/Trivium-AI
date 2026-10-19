/**
 * Mensaje legible para errores de Firebase Auth.
 * auth/invalid-credential = email/password incorrectos (o cuenta que no existe
 * en Firebase tras migrar desde Supabase).
 */
export function firebaseAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";

  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  ) {
    return "Email o contraseña incorrectos. Si migraste desde Supabase, creá una cuenta nueva en «Crear cuenta».";
  }

  if (error instanceof Error && error.message) return error.message;
  return "Ocurrió un error de autenticación. Probá de nuevo.";
}
