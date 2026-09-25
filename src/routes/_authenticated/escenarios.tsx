import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Sparkles, FileDown, Check, X } from "lucide-react";
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
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generateScenarios } from "@/services/scenariosService";
import type { Asset, AssetType, Impact, KeyVariable, RiskLevel, Scenario } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/escenarios")({
  head: () => ({
    meta: [
      { title: "Escenarios Futuros — Trivium AI" },
      {
        name: "description",
        content:
          "Generá escenarios optimista, esperado y pesimista con retorno esperado, riesgo y probabilidad.",
      },
      { property: "og:title", content: "Escenarios Futuros — Trivium AI" },
      {
        property: "og:description",
        content: "Análisis de escenarios para la toma de decisiones.",
      },
    ],
  }),
  component: EscenariosPage,
});

const uid = () => Math.random().toString(36).slice(2, 9);
const riskScore: Record<RiskLevel, number> = { bajo: 33, medio: 66, alto: 100 };

function usesManualMarket(scenarios: Scenario[]): boolean {
  return scenarios.some((scenario) => {
    const source = (scenario as Scenario & { dataSource?: string }).dataSource;
    return source === "manual";
  });
}

interface HistoryItem {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

function EscenariosPage() {
  const { organization, user } = useAuth();
  const [name, setName] = useState("");
  const [situation, setSituation] = useState("");
  const [assets, setAssets] = useState<Asset[]>([
    { id: uid(), name: "", type: "acción", value: 0, weight: 0 },
  ]);
  const [variables, setVariables] = useState<KeyVariable[]>([
    { id: uid(), name: "", probability: 50, impact: "medio" },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [scenarioFeedback, setScenarioFeedback] = useState<
    Record<string, "aprobado" | "rechazado">
  >({});
  const [rejectingScenario, setRejectingScenario] = useState<Scenario | null>(null);
  const [scenarioRejectReason, setScenarioRejectReason] = useState("");

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory() {
    const { data } = await supabase
      .from("analyses")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory((data as HistoryItem[]) ?? []);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (name.trim().length < 3) next["name"] = "El nombre debe tener al menos 3 caracteres";
    if (situation.trim().length < 10)
      next["situation"] = "Describí la situación actual (mínimo 10 caracteres)";
    if (!assets.some((a) => a.name.trim())) next["assets"] = "Cargá al menos un activo con nombre";
    else {
      const totalWeight = assets.reduce((acc, a) => acc + Number(a.weight || 0), 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        next["assets"] = "Los pesos de la cartera deben sumar 100%";
      }
    }
    if (!variables.some((v) => v.name.trim()))
      next["variables"] = "Cargá al menos una variable independiente";
    else if (variables.some((v) => v.probability < 0 || v.probability > 100))
      next["variables"] = "La probabilidad debe estar entre 0 y 100";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleGenerate() {
    if (!validate()) {
      toast.error("Revisá el formulario");
      return;
    }
    setGenerating(true);
    setScenarios([]);
    setScenarioFeedback({});
    try {
      const result = await generateScenarios({
        name,
        currentSituation: situation,
        assets: assets.filter((a) => a.name.trim()),
        variables: variables.filter((v) => v.name.trim()),
      });
      setScenarios(result);
      void loadHistory();
      toast.success("Escenarios generados");
    } catch {
      toast.error("No pudimos generar los escenarios. Probá de nuevo en unos minutos.");
    } finally {
      setGenerating(false);
    }
  }

  /** Fase 4: feedback por tipo de escenario, alimenta el prompt de próximas generaciones (scenario_feedback). */
  async function submitScenarioFeedback(
    s: Scenario,
    decision: "aprobado" | "rechazado",
    reason?: string,
  ) {
    if (!organization) return;
    const { error } = await supabase.from("scenario_feedback").insert({
      organization_id: organization.id,
      scenario_type: s.type,
      user_id: user?.uid ?? null,
      decision,
      reason: reason || null,
    });
    if (error) {
      toast.error("No se pudo registrar el feedback");
      return;
    }
    setScenarioFeedback((prev) => ({ ...prev, [s.id]: decision }));
    toast.success(decision === "aprobado" ? "Escenario aprobado" : "Escenario rechazado");
  }

  function submitScenarioReject() {
    if (!rejectingScenario) return;
    void submitScenarioFeedback(rejectingScenario, "rechazado", scenarioRejectReason.trim());
    setRejectingScenario(null);
    setScenarioRejectReason("");
  }

  function exportPdf() {
    const doc = new jsPDF();
    let y = 18;
    doc.setFontSize(18);
    doc.text("Trivium AI — Análisis de escenarios", 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.text(`Análisis: ${name}`, 14, y);
    y += 6;
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.splitTextToSize(`Situación actual: ${situation}`, 180).forEach((line: string) => {
      doc.text(line, 14, y);
      y += 5;
    });
    y += 4;
    scenarios.forEach((s) => {
      if (y > 250) {
        doc.addPage();
        y = 18;
      }
      doc.setFontSize(13);
      doc.text(`Escenario ${s.type}`, 14, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(
        `Retorno esperado: ${s.expectedReturn}%  |  Riesgo: ${s.risk}  |  Probabilidad: ${s.probability}%`,
        14,
        y,
      );
      y += 6;
      doc.splitTextToSize(s.narrative, 180).forEach((line: string) => {
        doc.text(line, 14, y);
        y += 5;
      });
      doc.text(`Variables clave: ${s.drivers.join(" · ")}`, 14, y);
      y += 10;
    });
    doc.save(`escenarios-${name.replace(/\s+/g, "-").toLowerCase() || "analisis"}.pdf`);
  }

  const chartData = scenarios.map((s) => ({
    name: s.type,
    Retorno: s.expectedReturn,
    Riesgo: riskScore[s.risk],
  }));

  return (
    <AppLayout
      title="Escenarios Futuros"
      description="Definí tu portafolio y las variables clave para generar escenarios de decisión."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Definición del análisis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="an-name">Nombre del análisis *</Label>
              <Input
                id="an-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors["name"]}
                maxLength={120}
              />
              {errors["name"] && <p className="text-xs text-destructive">{errors["name"]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="an-sit">Situación actual *</Label>
              <Textarea
                id="an-sit"
                rows={4}
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                aria-invalid={!!errors["situation"]}
                maxLength={2000}
              />
              {errors["situation"] && (
                <p className="text-xs text-destructive">{errors["situation"]}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Composición del portafolio</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setAssets([
                      ...assets,
                      { id: uid(), name: "", type: "acción", value: 0, weight: 0 },
                    ])
                  }
                >
                  <Plus className="mr-1 size-4" /> Activo
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Peso %</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((a, i) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Input
                            aria-label={`Nombre del activo ${i + 1}`}
                            value={a.name}
                            onChange={(e) =>
                              setAssets(
                                assets.map((x) =>
                                  x.id === a.id ? { ...x, name: e.target.value } : x,
                                ),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={a.type}
                            onValueChange={(v) =>
                              setAssets(
                                assets.map((x) =>
                                  x.id === a.id ? { ...x, type: v as AssetType } : x,
                                ),
                              )
                            }
                          >
                            <SelectTrigger aria-label={`Tipo del activo ${i + 1}`} className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="acción">acción</SelectItem>
                              <SelectItem value="derivado">derivado</SelectItem>
                              <SelectItem value="producto">producto</SelectItem>
                              <SelectItem value="servicio">servicio</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-28"
                            aria-label={`Valor del activo ${i + 1}`}
                            value={a.value}
                            onChange={(e) =>
                              setAssets(
                                assets.map((x) =>
                                  x.id === a.id ? { ...x, value: Number(e.target.value) } : x,
                                ),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="w-20"
                            aria-label={`Peso del activo ${i + 1}`}
                            value={a.weight}
                            onChange={(e) =>
                              setAssets(
                                assets.map((x) =>
                                  x.id === a.id ? { ...x, weight: Number(e.target.value) } : x,
                                ),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Eliminar activo ${i + 1}`}
                            onClick={() => setAssets(assets.filter((x) => x.id !== a.id))}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {errors["assets"] && <p className="text-xs text-destructive">{errors["assets"]}</p>}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Variables independientes clave</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setVariables([
                      ...variables,
                      { id: uid(), name: "", probability: 50, impact: "medio" },
                    ])
                  }
                >
                  <Plus className="mr-1 size-4" /> Variable
                </Button>
              </div>
              <div className="space-y-4">
                {variables.map((v, i) => (
                  <div key={v.id} className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label={`Nombre de la variable ${i + 1}`}
                        placeholder="Ej: Tipo de cambio"
                        value={v.name}
                        onChange={(e) =>
                          setVariables(
                            variables.map((x) =>
                              x.id === v.id ? { ...x, name: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <Select
                        value={v.impact}
                        onValueChange={(val) =>
                          setVariables(
                            variables.map((x) =>
                              x.id === v.id ? { ...x, impact: val as Impact } : x,
                            ),
                          )
                        }
                      >
                        <SelectTrigger
                          aria-label={`Impacto de la variable ${i + 1}`}
                          className="w-28"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alto">alto</SelectItem>
                          <SelectItem value="medio">medio</SelectItem>
                          <SelectItem value="bajo">bajo</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Eliminar variable ${i + 1}`}
                        onClick={() => setVariables(variables.filter((x) => x.id !== v.id))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">Probabilidad</span>
                      <Slider
                        aria-label={`Probabilidad de la variable ${i + 1}`}
                        value={[v.probability]}
                        max={100}
                        step={1}
                        className="flex-1"
                        onValueChange={([val]) =>
                          setVariables(
                            variables.map((x) =>
                              x.id === v.id ? { ...x, probability: val ?? 0 } : x,
                            ),
                          )
                        }
                      />
                      <span className="w-10 text-right text-sm font-medium">{v.probability}%</span>
                    </div>
                  </div>
                ))}
              </div>
              {errors["variables"] && (
                <p className="text-xs text-destructive">{errors["variables"]}</p>
              )}
            </div>

            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              <Sparkles className="mr-2 size-4" />
              {generating ? "Generando escenarios..." : "Generar escenarios"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {generating && (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="space-y-3 pt-6">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-2 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!generating && scenarios.length > 0 && (
            <>
              {usesManualMarket(scenarios) && (
                <p
                  role="status"
                  className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
                >
                  Datos de mercado con fuente manual: no se pudo obtener la cotización automática.
                </p>
              )}
              <div className="flex justify-end">
                <Button variant="outline" onClick={exportPdf}>
                  <FileDown className="mr-2 size-4" /> Exportar a PDF
                </Button>
              </div>
              {scenarios.map((s) => (
                <Card key={s.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">Escenario {s.type}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Probabilidad {s.probability}%</Badge>
                      {scenarioFeedback[s.id] ? (
                        <Badge
                          variant={
                            scenarioFeedback[s.id] === "aprobado" ? "default" : "destructive"
                          }
                        >
                          {scenarioFeedback[s.id]}
                        </Badge>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Aprobar escenario ${s.type}`}
                            onClick={() => void submitScenarioFeedback(s, "aprobado")}
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Rechazar escenario ${s.type}`}
                            onClick={() => setRejectingScenario(s)}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "text-3xl font-semibold",
                          s.expectedReturn >= 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        {s.expectedReturn > 0 ? "+" : ""}
                        {s.expectedReturn}%
                      </span>
                      <span className="text-xs text-muted-foreground">retorno esperado</span>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Riesgo del portafolio</span>
                        <span className="font-medium capitalize">{s.risk}</span>
                      </div>
                      <div
                        className="h-2 w-full overflow-hidden rounded-full bg-muted"
                        role="meter"
                        aria-valuenow={riskScore[s.risk]}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Riesgo ${s.risk}`}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full",
                            s.risk === "bajo"
                              ? "bg-success"
                              : s.risk === "medio"
                                ? "bg-warning"
                                : "bg-destructive",
                          )}
                          style={{ width: `${riskScore[s.risk]}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{s.narrative}</p>
                    <div className="flex flex-wrap gap-2">
                      {s.drivers.map((d) => (
                        <Badge key={d} variant="outline">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Comparación de escenarios</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <RTooltip />
                      <Legend />
                      <Bar dataKey="Retorno" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Riesgo" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de análisis</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no generaste análisis.</p>
              ) : (
                <ul className="divide-y">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{h.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                      <Badge variant="secondary">{h.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!rejectingScenario} onOpenChange={(o) => !o && setRejectingScenario(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar escenario {rejectingScenario?.type}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="scenario-reject-reason">Motivo (opcional)</Label>
            <Textarea
              id="scenario-reject-reason"
              rows={3}
              placeholder="Ej: muy pesimista para el contexto actual"
              value={scenarioRejectReason}
              onChange={(e) => setScenarioRejectReason(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              El motivo ayuda a que los próximos escenarios generados se ajusten mejor.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingScenario(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={submitScenarioReject}>
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
