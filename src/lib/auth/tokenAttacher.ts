import { createMiddleware } from "@tanstack/react-start";
import { getFirebaseAuth } from "@/lib/firebase/client";

/**
 * Reemplaza attachSupabaseAuth (src/integrations/supabase/auth-attacher.ts).
 * Registrado como functionMiddleware global en src/start.ts: sin esto, el
 * browser nunca manda el ID token a los server functions.
 */
export const attachFirebaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const user = getFirebaseAuth().currentUser;
    const token = user ? await user.getIdToken() : null;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
