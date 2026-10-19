import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { isSuperadminAuthorized, type AppRole } from "@/lib/auth/roles";
import { hasRole } from "@/repositories/profiles";

/**
 * Reemplaza requireSupabaseAuth (src/integrations/supabase/auth-middleware.ts,
 * ahora eliminado). organizationId y role salen de custom claims del ID
 * token -- verificados criptográficamente por el Admin SDK, sin round-trip a
 * la base en cada request. Eso es lo que baja la latencia respecto al patrón
 * anterior (que hacía 2-3 queries a Supabase por request autenticado).
 */
export const requireFirebaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: No autorización Bearer");
    }
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      throw new Error("Unauthorized: No token provided");
    }

    const decoded = await getFirebaseAdminAuth()
      .verifyIdToken(token)
      .catch(() => null);
    if (!decoded) {
      throw new Error("Unauthorized: Invalid token");
    }

    const organizationId = (decoded["organizationId"] as string | undefined) ?? null;
    const role = (decoded["role"] as string | undefined) ?? "admin";

    return next({
      context: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? null,
        organizationId,
        role: role as AppRole,
      },
    });
  },
);

/**
 * Solo para las server functions de plataforma (src/services/platformService.functions.ts),
 * las únicas que pueden leer datos de TODAS las organizaciones. No exige
 * organizationId: un superadmin puede no pertenecer a ninguna organización.
 * Verifica el claim del token Y la fila de rol en la base (ver isSuperadminAuthorized).
 */
export const requireSuperadmin = createMiddleware({ type: "function" })
  .middleware([requireFirebaseAuth])
  .server(async ({ next, context }) => {
    const hasDbRole =
      context.role === "superadmin" && (await hasRole(context.firebaseUid, "superadmin"));
    if (!isSuperadminAuthorized(context.role, hasDbRole)) {
      throw new Error("Forbidden: se requiere rol superadmin");
    }
    return next({ context: { firebaseUid: context.firebaseUid } });
  });

/**
 * Igual que requireFirebaseAuth pero exige organizationId ya asignado --
 * para todo lo que no sea el flujo de bootstrap/onboarding en sí.
 */
export const requireOrganization = createMiddleware({ type: "function" })
  .middleware([requireFirebaseAuth])
  .server(async ({ next, context }) => {
    if (!context.organizationId) {
      throw new Error("El usuario todavía no tiene una organización asignada");
    }
    return next({ context: { organizationId: context.organizationId } });
  });
