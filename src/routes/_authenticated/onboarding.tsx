import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Boxes, UserPlus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — Trivium AI" },
      { name: "description", content: "Configurá tu organización en tres pasos." },
      { property: "og:title", content: "Onboarding — Trivium AI" },
      { property: "og:description", content: "Configurá tu organización en tres pasos." },
    ],
  }),
  component: Onboarding,
});

const STEPS = [
  { title: "Datos de la empresa", icon: Building2 },
  { title: "Carga de recursos", icon: Boxes },
  { title: "Invitar usuarios", icon: UserPlus },
];

function Onboarding() {
  const navigate = useNavigate();
  const { user, organization, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [org, setOrg] = useState({ name: organization?.name ?? "", industry: "", size: "" });
  const [res, setRes] = useState({ materials: "", capacities: "", waste: "", workforce: "" });
  const [invites, setInvites] = useState("");

  async function saveOrg() {
    if (org.name.trim().length < 2) {
      setErrors({ name: "Ingresá el nombre de la organización" });
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await supabase.rpc("create_organization", {
      _name: org.name.trim(),
      ...(org.industry.trim() ? { _industry: org.industry.trim() } : {}),
      ...(org.size.trim() ? { _size: org.size.trim() } : {}),
    });
    if (error) {
      setSaving(false);
      toast.error("No pudimos guardar la organización", { description: error.message });
      return;
    }
    await refresh();
    setSaving(false);
    setStep(1);
  }

  async function saveResources() {
    setSaving(true);
    const { data: prof } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user!.id)
      .maybeSingle();
    if (prof?.organization_id) {
      await supabase
        .from("org_resources")
        .insert({ organization_id: prof.organization_id, ...res });
    }
    setSaving(false);
    setStep(2);
  }

  async function finish() {
    setSaving(true);
    const { data: prof } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user!.id)
      .maybeSingle();
    if (prof?.organization_id) {
      await supabase
        .from("organizations")
        .update({ onboarding_completed: true })
        .eq("id", prof.organization_id);
    }
    await refresh();
    setSaving(false);
    const count = invites.split(/[\s,;]+/).filter((v) => v.includes("@")).length;
    toast.success("¡Todo listo!", {
      description: count ? `Registramos ${count} invitación(es).` : "Ya podés usar la plataforma.",
    });
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Configurá tu organización</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tres pasos rápidos y empezamos.</p>

        <ol className="mt-8 flex items-center gap-2" aria-label="Progreso de onboarding">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm",
                  i < step
                    ? "border-primary bg-primary text-primary-foreground"
                    : i === step
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-4" /> : <s.icon className="size-4" />}
              </div>
              <span
                className={cn(
                  "hidden text-xs sm:block",
                  i === step ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {s.title}
              </span>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Nombre de la organización *</Label>
                <Input
                  id="org-name"
                  value={org.name}
                  onChange={(e) => setOrg({ ...org, name: e.target.value })}
                  aria-invalid={!!errors["name"]}
                />
                {errors["name"] && <p className="text-xs text-destructive">{errors["name"]}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-ind">Industria</Label>
                  <Input
                    id="org-ind"
                    value={org.industry}
                    onChange={(e) => setOrg({ ...org, industry: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-size">Tamaño</Label>
                  <Input
                    id="org-size"
                    placeholder="Ej: 50-200 empleados"
                    value={org.size}
                    onChange={(e) => setOrg({ ...org, size: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={saveOrg} disabled={saving}>
                {saving ? "Guardando..." : "Continuar"}
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {(
                [
                  ["materials", "Materiales disponibles"],
                  ["capacities", "Capacidades instaladas"],
                  ["waste", "Flujos de residuos"],
                  ["workforce", "Equipo de trabajo"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`res-${key}`}>{label}</Label>
                  <Textarea
                    id={`res-${key}`}
                    rows={2}
                    value={res[key]}
                    onChange={(e) => setRes({ ...res, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Atrás
                </Button>
                <Button onClick={saveResources} disabled={saving}>
                  {saving ? "Guardando..." : "Continuar"}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invites">Emails a invitar</Label>
                <Textarea
                  id="invites"
                  rows={4}
                  placeholder="maria@empresa.com, juan@empresa.com"
                  value={invites}
                  onChange={(e) => setInvites(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separá los emails con comas. Podés invitar más personas después desde
                  Configuración.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button onClick={finish} disabled={saving}>
                  {saving ? "Finalizando..." : "Finalizar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
