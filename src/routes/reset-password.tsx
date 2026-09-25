import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { confirmPasswordReset, signOut, verifyPasswordResetCode } from "firebase/auth";
import { Sparkles } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Restablecer contraseña — Trivium AI" },
      {
        name: "description",
        content: "Definí una nueva contraseña para tu cuenta de Trivium AI.",
      },
      { property: "og:title", content: "Restablecer contraseña — Trivium AI" },
      {
        property: "og:description",
        content: "Definí una nueva contraseña para tu cuenta de Trivium AI.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(72);

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);

  useEffect(() => {
    // Firebase manda el link con ?mode=resetPassword&oobCode=... (query, no hash).
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const code = params.get("oobCode");
    if (mode !== "resetPassword" || !code) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    verifyPasswordResetCode(getFirebaseAuth(), code)
      .then(() => {
        setOobCode(code);
        setReady(true);
      })
      .catch(() => {
        toast.error("El enlace no es válido o ya expiró");
        navigate({ to: "/auth", replace: true });
      });
  }, [navigate]);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    const p = passwordSchema.safeParse(password);
    if (!p.success) {
      setError(p.error.issues[0]!.message);
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (!oobCode) return;
    setLoading(true);
    try {
      await confirmPasswordReset(getFirebaseAuth(), oobCode, password);
    } catch (updateError) {
      setLoading(false);
      toast.error("No pudimos actualizar la contraseña", {
        description: (updateError as Error).message,
      });
      return;
    }
    setLoading(false);
    toast.success("Contraseña actualizada", {
      description: "Iniciá sesión con tu nueva contraseña.",
    });
    await signOut(getFirebaseAuth());
    navigate({ to: "/auth", replace: true });
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Redirigiendo…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="size-5 text-primary-foreground" aria-hidden />
          </div>
          <span className="text-lg font-semibold">Trivium AI</span>
        </Link>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Restablecer contraseña</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Definí una nueva contraseña para tu cuenta.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="new-pass">Nueva contraseña</Label>
              <Input
                id="new-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pass">Repetir contraseña</Label>
              <Input
                id="confirm-pass"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={!!error}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando…" : "Guardar nueva contraseña"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
