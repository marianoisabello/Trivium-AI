import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOrganization } from "@/lib/auth/verifyToken";
import { createClient, listClients, type ClientRow } from "@/repositories/clients";

export const listClientsFn = createServerFn({ method: "GET" })
  .middleware([requireOrganization])
  .handler(async ({ context }): Promise<ClientRow[]> => {
    return listClients(context.organizationId);
  });

const createClientInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(255),
  linkedin: z.string().trim().max(255),
  whatsapp: z.string().trim().max(40),
  segment: z.string().trim().max(60),
  consumption: z.array(z.string()),
});

export const createClientFn = createServerFn({ method: "POST" })
  .middleware([requireOrganization])
  .validator((input: unknown) => createClientInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await createClient(context.organizationId, {
      name: data.name,
      email: data.email || null,
      linkedin: data.linkedin || null,
      whatsapp: data.whatsapp || null,
      segment: data.segment || null,
      consumption: data.consumption,
    });
  });
