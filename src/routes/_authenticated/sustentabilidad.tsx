import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateInitiatives } from "@/services/sustainabilityService";
import type { Initiative, InitiativeStatus, Kpi, PlanStep, ResourcesInput } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/sustentabilidad")({
  head: () => ({
    meta: [
      { title: "Sustentabilidad — Trivium AI" },
      {
        name: "description",
        content:
          "Generá iniciativas de sustentabilidad con metas, plan de acción y KPIs medibles en un tablero Kanban.",
      },
      { property: "og:title", content: "Sustentabilidad — Trivium AI" },
      {
        property: "og:description",
        content: "Iniciativas de impacto con metas, plan de acción y KPIs.",
      },
    ],
  }),
  component: SustentabilidadPage,
});

const COLUMNS: { key: InitiativeStatus; label: string }[] = [
  { key: "propuesta", label: "Propuesta" },
  { key: "en ejecución", label: "En ejecución" },
  { key: "completada", label: "Completada" },
];

function SustentabilidadPage() {
  const { organization } = useAuth();
  const [res, setRes] = useState<ResourcesInput>({
    materials: "",
    capacities: "",
    waste: "",
    workforce: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [editingKpi, setEditingKpi] = useState<{ kpi: Kpi; initiativeId: string } | null>(null);
  const [kpiForm, setKpiForm] = useState({ name: "", unit: "", target: 0 });
  const [measure, setMeasure] = useState({ value: 0, date: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [{ data: inis }, { data: kpis }] = await Promise.all([
      supabase.from("initiatives").select("*").order("created_at", { ascending: false }),
      supabase.from("kpis").select("*"),
    ]);
    setInitiatives(
      (inis ?? []).map((i) => ({
        id: i.id,
        title: i.title,
        scopes: i.scopes ?? [],
        goal: i.goal ?? "",
        plan: (Array.isArray(i.plan) ? i.plan : []) as unknown as PlanStep[],
        status: i.status as InitiativeStatus,
        kpis: (kpis ?? [])
          .filter((k) => k.initiative_id === i.id)
          .map((k) => ({
            id: k.id,
            name: k.name,
            unit: k.unit ?? "",
            target: Number(k.target_value),
            current: Number(k.current_value),
          })),
      })),
    );
    setLoading(false);
  }

  async function handleGenerate() {
    const next: Record<string, string> = {};
    if (res.materials.trim().length < 3) next["materials"] = "Describí los materiales disponibles";
    if (res.capacities.trim().length < 3)
      next["capacities"] = "Describí las capacidades instaladas";
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error("Completá los datos de recursos");
      return;
    }
    setGenerating(true);
    const generated = await generateInitiatives(res);
    if (organization) {
      for (const ini of generated) {
        const { data } = await supabase
          .from("initiatives")
          .insert({
            organization_id: organization.id,
            title: ini.title,
            scopes: ini.scopes,
            goal: ini.goal,
            plan: ini.plan as unknown as never,
            status: ini.status,
          })
          .select("id")
          .single();
        if (data) {
          await supabase.from("kpis").insert(
            ini.kpis.map((k) => ({
              organization_id: organization.id,
              initiative_id: data.id,
              name: k.name,
              unit: k.unit,
              target_value: k.target,
              current_value: k.current,
            })),
          );
        }
      }
      await load();
    } else {
      setInitiatives([...generated, ...initiatives]);
    }
    setGenerating(false);
    toast.success("Iniciativas generadas");
  }

  async function moveInitiative(id: string, status: InitiativeStatus) {
    setInitiatives(initiatives.map((i) => (i.id === id ? { ...i, status } : i)));
    await supabase.from("initiatives").update({ status }).eq("id", id);
  }

  function openKpi(kpi: Kpi, initiativeId: string) {
    setEditingKpi({ kpi, initiativeId });
    setKpiForm({ name: kpi.name, unit: kpi.unit, target: kpi.target });
    setMeasure({ value: kpi.current, date: new Date().toISOString().slice(0, 10) });
  }

  async function saveKpi() {
    if (!editingKpi) return;
    if (kpiForm.name.trim().length < 2 || kpiForm.target <= 0) {
      toast.error("Revisá el nombre y el valor objetivo del KPI");
      return;
    }
    const { kpi, initiativeId } = editingKpi;
    setInitiatives(
      initiatives.map((i) =>
        i.id === initiativeId
          ? {
              ...i,
              kpis: i.kpis.map((k) =>
                k.id === kpi.id
                  ? {
                      ...k,
                      name: kpiForm.name,
                      unit: kpiForm.unit,
                      target: kpiForm.target,
                      current: measure.value,
                    }
                  : k,
              ),
            }
          : i,
      ),
    );
    await supabase
      .from("kpis")
      .update({
        name: kpiForm.name,
        unit: kpiForm.unit,
        target_value: kpiForm.target,
        current_value: measure.value,
      })
      .eq("id", kpi.id);
    if (organization) {
      await supabase.from("kpi_measurements").insert({
        organization_id: organization.id,
        kpi_id: kpi.id,
        value: measure.value,
        measured_at: measure.date,
      });
    }
    setEditingKpi(null);
    toast.success("KPI actualizado y medición registrada");
  }

  const chartData = initiatives.flatMap((i) =>
    i.kpis.map((k) => ({
      name: k.name.length > 18 ? `${k.name.slice(0, 18)}…` : k.name,
      Avance: Math.round((k.current / (k.target || 1)) * 100),
      Objetivo: 100,
    })),
  );

  return (
    <AppLayout
      title="Sustentabilidad"
      description="De los recursos de tu organización a iniciativas con impacto medible."
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recursos de la organización</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {(
                [
                  ["materials", "Materiales *"],
                  ["capacities", "Capacidades *"],
                  ["waste", "Flujos de residuos"],
                  ["workforce", "Equipo de trabajo"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`su-${key}`}>{label}</Label>
                  <Textarea
                    id={`su-${key}`}
                    rows={3}
                    value={res[key]}
                    aria-invalid={!!errors[key]}
                    onChange={(e) => setRes({ ...res, [key]: e.target.value })}
                  />
                  {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
                </div>
              ))}
            </div>
            <Button onClick={handleGenerate} disabled={generating}>
              <Sparkles className="mr-2 size-4" />
              {generating ? "Generando propuestas..." : "Generar propuestas"}
            </Button>
          </CardContent>
        </Card>

        {(generating || loading) && (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="space-y-3 pt-6">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!generating && !loading && initiatives.length > 0 && (
          <>
            <section>
              <h2 className="mb-3 text-lg font-semibold">Iniciativas propuestas</h2>
              <div className="grid gap-4 lg:grid-cols-3">
                {initiatives.map((ini) => (
                  <Card key={ini.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{ini.title}</CardTitle>
                      <div className="flex flex-wrap gap-1 pt-2">
                        {ini.scopes.map((s) => (
                          <Badge key={s} variant="secondary">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Meta</p>
                        <p className="text-sm">{ini.goal}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          Plan de acción
                        </p>
                        <ol className="mt-2 space-y-2">
                          {ini.plan.map((p, idx) => (
                            <li key={idx} className="flex gap-2 text-sm">
                              <span className="text-muted-foreground">{p.date}</span>
                              <span>{p.step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">KPIs</p>
                        <div className="mt-2 space-y-3">
                          {ini.kpis.map((k) => {
                            const pct = Math.min(
                              100,
                              Math.round((k.current / (k.target || 1)) * 100),
                            );
                            return (
                              <div key={k.id}>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="truncate">{k.name}</span>
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    {k.current}/{k.target} {k.unit}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="size-6"
                                      aria-label={`Editar KPI ${k.name}`}
                                      onClick={() => openKpi(k, ini.id)}
                                    >
                                      <Pencil className="size-3" />
                                    </Button>
                                  </span>
                                </div>
                                <div
                                  className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted"
                                  role="progressbar"
                                  aria-valuenow={pct}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-label={`Avance de ${k.name}`}
                                >
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Tablero de iniciativas</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {COLUMNS.map((col) => (
                  <div key={col.key} className="rounded-xl border bg-card p-4">
                    <p className="mb-3 text-sm font-medium">
                      {col.label}{" "}
                      <span className="text-muted-foreground">
                        ({initiatives.filter((i) => i.status === col.key).length})
                      </span>
                    </p>
                    <div className="space-y-3">
                      {initiatives
                        .filter((i) => i.status === col.key)
                        .map((i) => (
                          <div key={i.id} className="rounded-lg border p-3">
                            <p className="text-sm font-medium">{i.title}</p>
                            <Select
                              value={i.status}
                              onValueChange={(v) => moveInitiative(i.id, v as InitiativeStatus)}
                            >
                              <SelectTrigger
                                className="mt-2 h-8 text-xs"
                                aria-label={`Estado de ${i.title}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COLUMNS.map((c) => (
                                  <SelectItem key={c.key} value={c.key}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      {initiatives.filter((i) => i.status === col.key).length === 0 && (
                        <p className="text-xs text-muted-foreground">Sin iniciativas.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Avance de KPIs (%)</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" fontSize={11} interval={0} angle={-20} height={60} />
                    <YAxis fontSize={12} domain={[0, 100]} />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="Avance" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}

        {!loading && !generating && initiatives.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Plus className="size-6 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Cargá los recursos de tu organización y generá tus primeras iniciativas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!editingKpi} onOpenChange={(o) => !o && setEditingKpi(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar KPI y registrar medición</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kpi-name">Nombre</Label>
              <Input
                id="kpi-name"
                value={kpiForm.name}
                onChange={(e) => setKpiForm({ ...kpiForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kpi-unit">Unidad</Label>
                <Input
                  id="kpi-unit"
                  value={kpiForm.unit}
                  onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kpi-target">Valor objetivo</Label>
                <Input
                  id="kpi-target"
                  type="number"
                  value={kpiForm.target}
                  onChange={(e) => setKpiForm({ ...kpiForm, target: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kpi-value">Medición</Label>
                <Input
                  id="kpi-value"
                  type="number"
                  value={measure.value}
                  onChange={(e) => setMeasure({ ...measure, value: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kpi-date">Fecha</Label>
                <Input
                  id="kpi-date"
                  type="date"
                  value={measure.date}
                  onChange={(e) => setMeasure({ ...measure, date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingKpi(null)}>
              Cancelar
            </Button>
            <Button onClick={saveKpi}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
