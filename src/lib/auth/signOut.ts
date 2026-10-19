import type { useNavigate } from "@tanstack/react-router";
import { signOut as firebaseSignOut } from "firebase/auth";
import { toast } from "sonner";
import { getFirebaseAuth } from "@/lib/firebase/client";

/** Cierra la sesión de Firebase y vuelve al login. Se usa desde el menú de usuario. */
export async function signOutAndGoToLogin(navigate: ReturnType<typeof useNavigate>) {
  try {
    await firebaseSignOut(getFirebaseAuth());
  } catch (error) {
    toast.error("No pudimos cerrar la sesión", { description: (error as Error).message });
    return;
  }
  await navigate({ to: "/auth", replace: true });
}
