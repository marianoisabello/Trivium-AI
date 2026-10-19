import {
  createFileRoute,
  Outlet,
  redirect,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";

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
  // Si una pantalla autenticada falla (ej. la base no responde), el usuario no
  // debe quedar atrapado sin forma de cerrar sesión o usar otra cuenta.
  errorComponent: AuthenticatedError,
});

function AuthenticatedError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between">
        <span className="text-sm font-semibold">Trivium AI</span>
        <UserMenu />
      </header>
      <div className="mx-auto mt-16 w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No pudimos cargar esta pantalla. Podés reintentar, o cerrar sesión desde el ícono de
          arriba para entrar con otra cuenta.
        </p>
        <p className="mt-4 break-words rounded-md bg-muted p-3 font-mono text-xs">
          {error instanceof Error ? error.message : String(error)}
        </p>
        <Button className="mt-4" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}
