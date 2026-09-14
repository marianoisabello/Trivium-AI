import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ingresar — Trivium AI" },
      { name: "description", content: "Accedé a tu cuenta de Trivium AI o creá una nueva." },
      { property: "og:title", content: "Ingresar — Trivium AI" },
      { property: "og:description", content: "Accedé a tu cuenta de Trivium AI." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Ingresá un email válido").max(255);
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(72);

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "cliente">("admin");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  function validate(withName: boolean) {
    const next: Record<string, string> = {};
    const e = emailSchema.safeParse(email);
    if (!e.success) next["email"] = e.error.issues[0]!.message;
    const p = passwordSchema.safeParse(password);
    if (!p.success) next["password"] = p.error.issues[0]!.message;
    if (withName && fullName.trim().length < 2) next["fullName"] = "Ingresá tu nombre y apellido";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSignIn(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate(false)) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error("No pudimos iniciar sesión", { description: error.message });
      return;
    }
    toast.success("¡Bienvenido de nuevo!");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignUp(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate(true)) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim(), role },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("No pudimos crear la cuenta", { description: error.message });
      return;
    }
    if (data.session) {
      navigate({ to: "/onboarding", replace: true });
    } else {
      toast.success("Revisá tu email", {
        description: "Te enviamos un enlace para confirmar tu cuenta.",
      });
    }
  }

  async function handleForgotPassword(ev: React.FormEvent) {
    ev.preventDefault();
    setForgotError(null);
    const e = emailSchema.safeParse(forgotEmail);
    if (!e.success) {
      setForgotError(e.error.issues[0]!.message);
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error("No pudimos enviar el email", { description: error.message });
      return;
    }
    setForgotSent(true);
    toast.success("Revisá tu email", {
      description: "Te enviamos un enlace para restablecer tu contraseña.",
    });
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
          {forgotOpen ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recuperar contraseña</h2>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setForgotOpen(false);
                    setForgotSent(false);
                    setForgotError(null);
                  }}
                >
                  Volver
                </button>
              </div>
              {forgotSent ? (
                <p className="text-sm text-muted-foreground">
                  Te enviamos un enlace a <strong>{forgotEmail.trim()}</strong> para restablecer tu
                  contraseña. Revisá tu correo y seguí las instrucciones.
                </p>
              ) : (
                <form className="space-y-4" onSubmit={handleForgotPassword} noValidate>
                  <p className="text-sm text-muted-foreground">
                    Ingresá tu email y te enviaremos un enlace para crear una nueva contraseña.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      aria-invalid={!!forgotError}
                    />
                    {forgotError && (
                      <p className="text-xs text-destructive">{forgotError}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={forgotLoading}>
                    {forgotLoading ? "Enviando…" : "Enviar enlace"}
                  </Button>
                </form>
              )}
            </div>
          ) : (
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="mt-6 space-y-4" onSubmit={handleSignIn} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email-in">Email</Label>
                  <Input
                    id="email-in"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors["email"]}
                  />
                  {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass-in">Contraseña</Label>
                  <Input
                    id="pass-in"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors["password"]}
                  />
                  {errors["password"] && <p className="text-xs text-destructive">{errors["password"]}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Ingresando..." : "Ingresar"}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    onClick={() => {
                      setForgotOpen(true);
                      setForgotEmail(email);
                      setForgotError(null);
                      setForgotSent(false);
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="mt-6 space-y-4" onSubmit={handleSignUp} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="name-up">Nombre y apellido</Label>
                  <Input
                    id="name-up"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    aria-invalid={!!errors["fullName"]}
                  />
                  {errors["fullName"] && <p className="text-xs text-destructive">{errors["fullName"]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-up">Email</Label>
                  <Input
                    id="email-up"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors["email"]}
                  />
                  {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass-up">Contraseña</Label>
                  <Input
                    id="pass-up"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors["password"]}
                  />
                  {errors["password"] && <p className="text-xs text-destructive">{errors["password"]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-up">Tipo de cuenta</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as "admin" | "cliente")}>
                    <SelectTrigger id="role-up">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador (todos los módulos)</SelectItem>
                      <SelectItem value="cliente">Cliente final (sólo Co-creación)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creando cuenta..." : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
