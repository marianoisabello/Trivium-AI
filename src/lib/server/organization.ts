import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Resuelve organization_id a partir del profile del usuario autenticado.
 * Mismo chequeo que ya hace scenariosService.functions.ts inline; extraído
 * acá porque los server functions de Productos y Sustentabilidad lo
 * necesitan igual (Escenarios no se toca, sigue con su copia propia).
 */
export async function resolveOrganizationId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo resolver el perfil del usuario: ${error.message}`);
  }
  if (!profile?.organization_id) {
    throw new Error("El usuario no tiene una organización asignada");
  }
  return profile.organization_id;
}
