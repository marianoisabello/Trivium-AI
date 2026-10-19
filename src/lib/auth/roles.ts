/**
 * Roles de la plataforma.
 *
 * - `admin`: administra UNA organización (la suya).
 * - `cliente`: usuario final de una organización.
 * - `superadmin`: operador de la plataforma; puede LEER datos de todas las
 *   organizaciones (src/repositories/platform.ts). No es un rol de tenant.
 */
export type AppRole = "admin" | "cliente" | "superadmin";

/**
 * Roles que un usuario puede elegir al registrarse (bootstrapFn). `superadmin`
 * NUNCA debe estar acá: se asigna únicamente fuera de la app, con
 * scripts/grant-superadmin.ts (Admin SDK + base), nunca desde un body de request.
 */
export const SELF_ASSIGNABLE_ROLES = ["admin", "cliente"] as const;

/**
 * Doble verificación del superadmin. El claim del ID token (firmado, solo
 * escribible con el Admin SDK) es necesario pero no suficiente: el rol también
 * tiene que seguir existiendo en la base. Así, revocar el rol en la base corta
 * el acceso al instante, sin esperar a que caduque el token (hasta 1 hora).
 */
export function isSuperadminAuthorized(
  claimRole: string | undefined,
  hasSuperadminRowInDb: boolean,
): boolean {
  return claimRole === "superadmin" && hasSuperadminRowInDb;
}

/** Si un usuario tiene varios roles, el de mayor privilegio es el efectivo para la UI. */
const ROLE_PRIORITY: readonly AppRole[] = ["superadmin", "admin", "cliente"];

export function pickEffectiveRole(roles: readonly AppRole[]): AppRole {
  return ROLE_PRIORITY.find((r) => roles.includes(r)) ?? "admin";
}
