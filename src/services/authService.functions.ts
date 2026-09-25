import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFirebaseAuth, requireOrganization } from "@/lib/auth/verifyToken";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import {
  assignOrganization,
  ensureProfile,
  getProfile,
  getRole,
  updateFullName,
} from "@/repositories/profiles";
import {
  createOrganization,
  getOrganizationById,
  markOnboardingCompleted,
  updateOrganization,
} from "@/repositories/organizations";
import { saveOrgResources } from "@/repositories/orgResources";

const bootstrapInputSchema = z.object({
  fullName: z.string().min(1).nullable(),
  role: z.enum(["admin", "cliente"]).default("admin"),
});

/**
 * Reemplaza el trigger handle_new_user de Supabase. Idempotente: se llama
 * después de cada login/signup exitoso (no solo el primero). No crea
 * organización -- eso lo hace createOrganizationFn en el paso 1 de
 * onboarding.tsx, igual que el flujo actual con create_organization.
 */
export const bootstrapFn = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .validator((input: unknown) => bootstrapInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureProfile({
      firebaseUid: context.firebaseUid,
      email: context.email,
      fullName: data.fullName,
      role: data.role,
    });
  });

/**
 * Perfil + organización + rol del usuario autenticado, en una sola llamada
 * (reemplaza las 3 queries secuenciales que hacía useAuth.tsx contra
 * profiles/user_roles/organizations).
 */
export const getCurrentUserFn = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    const [profile, role] = await Promise.all([
      getProfile(context.firebaseUid),
      getRole(context.firebaseUid),
    ]);
    const organization = profile?.organizationId
      ? await getOrganizationById(profile.organizationId)
      : null;
    return {
      fullName: profile?.fullName ?? null,
      role,
      organization,
    };
  });

const createOrganizationInputSchema = z.object({
  name: z.string().min(2),
  industry: z.string().optional(),
  size: z.string().optional(),
});

/**
 * Reemplaza el RPC create_organization. A diferencia de la versión de
 * Supabase (que hacía upsert si el usuario ya tenía organization_id), acá
 * siempre crea una nueva -- el caso "el usuario ya tiene org" no se daba en
 * la práctica (onboarding.tsx solo llama esto una vez, en el paso 0).
 *
 * IMPORTANTE: después de llamar esto, el cliente tiene que forzar un
 * refresh del ID token para que organizationId aparezca en los custom
 * claims de los próximos requests -- ver refreshIdToken() en
 * src/lib/firebase/client.ts.
 */
export const createOrganizationFn = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .validator((input: unknown) => createOrganizationInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const org = await createOrganization(data);
    await assignOrganization(context.firebaseUid, org.id);
    await getFirebaseAdminAuth().setCustomUserClaims(context.firebaseUid, {
      organizationId: org.id,
      role: context.role,
    });
    return org;
  });

const saveOrgResourcesInputSchema = z.object({
  materials: z.string(),
  capacities: z.string(),
  waste: z.string(),
  workforce: z.string(),
});

export const saveOrgResourcesFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown) => saveOrgResourcesInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await saveOrgResources(context.organizationId, data);
  });

export const completeOnboardingFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .handler(async ({ context }) => {
    await markOnboardingCompleted(context.organizationId);
  });

const saveProfileInputSchema = z.object({
  fullName: z.string().min(1),
  orgName: z.string().min(2),
  industry: z.string(),
  size: z.string(),
});

/** Reemplaza el guardado directo en configuracion.tsx (update de organizations + profiles). */
export const saveProfileFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown) => saveProfileInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await Promise.all([
      updateOrganization(context.organizationId, {
        name: data.orgName,
        industry: data.industry || null,
        size: data.size || null,
      }),
      updateFullName(context.firebaseUid, data.fullName),
    ]);
  });
