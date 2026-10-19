import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSuperadmin } from "@/lib/auth/verifyToken";
import {
  getOrganizationDetail,
  listOrganizationsOverview,
  type OrganizationDetail,
  type OrganizationOverview,
} from "@/repositories/platform";

/**
 * Vista de plataforma (rol superadmin): SOLO LECTURA sobre todas las
 * organizaciones. Toda función de este archivo lleva requireSuperadmin; los
 * accesos quedan en el log del servidor (uid del superadmin y organización
 * consultada, sin datos de clientes).
 */
export const listOrganizationsFn = createServerFn({ method: "GET" })
  .middleware([requireSuperadmin])
  .handler(async ({ context }): Promise<OrganizationOverview[]> => {
    console.info(`[platform] superadmin=${context.firebaseUid} lista organizaciones`);
    return listOrganizationsOverview();
  });

export const getOrganizationDetailFn = createServerFn({ method: "GET" })
  .middleware([requireSuperadmin])
  .validator((input: unknown) => z.object({ organizationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<OrganizationDetail> => {
    console.info(
      `[platform] superadmin=${context.firebaseUid} consulta organizacion=${data.organizationId}`,
    );
    const detail = await getOrganizationDetail(data.organizationId);
    if (!detail) throw new Error("Organización no encontrada");
    return detail;
  });
