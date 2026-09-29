import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getFirebaseAuth } from "@/lib/firebase/client";

function waitForAuthReady() {
  const auth = getFirebaseAuth();
  if (!auth.currentUser) {
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }
  return Promise.resolve(auth.currentUser);
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Firebase resuelve el estado de auth de forma asíncrona al cargar la
    // página (a diferencia de supabase.auth.getUser(), que pegaba a la red);
    // hay que esperar el primer evento antes de decidir si redirigir.
    const user = await waitForAuthReady();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
