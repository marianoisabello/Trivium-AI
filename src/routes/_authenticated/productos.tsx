import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Check, Pause, Pencil, Eye, X } from "lucide-react";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  buildMessageTemplate,
  generateProposals,
  generateRecommendations,
} from "@/services/productsService";
import type { Cadence, Channel, ProductSuggestion, Proposal } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/productos")({
  head: () => ({
    meta: [
      { title: "Generador de Productos y Servicios — Trivium AI" },
      {
        name: "description",
        content:
          "Propuestas automáticas por canal y cadencia, y co-creación de productos con recomendaciones de IA.",
      },
      { property: "og:title", content: "Generador de Productos — Trivium AI" },
      {
        property: "og:description",
        content: "Propuestas automáticas y co-creación de productos con IA.",
      },
    ],
  }),
  component: ProductosPage,
});

const HISTORY_CHIPS = [
  "Plan básico 2023",
  "Consultoría trimestral",
  "Cobertura FX",
  "Reportes sectoriales",
  "Capacitación in-company",
  "Soporte premium",
];

function ProductosPage() {
  const { organization, role, user } = useAuth();
  const isCliente = role === "cliente";

  return (
    <AppLayout
      title="Generador de Productos y Servicios"
      description={
        isCliente
          ? "Armá tu propio producto con recomendaciones basadas en tu consumo previo."
          : "Propuestas automáticas para tus clientes y espacio de co-creación."
      }
    >
      {isCliente ? (
        <CoCreacion />
      ) : (
        <Tabs defaultValue="auto">
          <TabsList>
            <TabsTrigger value="auto">Propuestas automáticas</TabsTrigger>
            <TabsTrigger value="co">Co-creación</TabsTrigger>
          </TabsList>
          <TabsContent value="auto" className="mt-6">
            <PropuestasAutomaticas orgId={organization?.id ?? null} userId={user?.uid ?? null} />
          </TabsContent>
          <TabsContent value="co" className="mt-6">
            <CoCreacion />
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}

function PropuestasAutomaticas({ orgId, userId }: { orgId: string | null; userId: string | null }) {
  const [rows, setRows] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [segment, setSegment] = useState("Corporativo");
  const [cadence, setCadence] = useState<Cadence>("semanal");
  const [channel, setChannel] = useState<Channel>("Email");
  const [preview, setPreview] = useState<{ proposal: Proposal; channel: Channel } | null>(null);
  const [template, setTemplate] = useState("");
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [rejecting, setRejecting] = useState<Proposal | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("proposals")
      .select("*")
      .order("created_at", { ascending: false });
    setRows(
      (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        targetClient: p.target_client ?? "",
        channel: p.channel as Channel,
        schedule: p.schedule as Cadence,
        status: p.status as Proposal["status"],
        ...(p.template ? { template: p.template } : {}),
      })),
    );
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    const generated = await generateProposals(segment, channel, cadence);
    if (orgId) {
      await load();
    } else {
      setRows([...generated, ...rows]);
    }
    setGenerating(false);
    toast.success("Propuestas generadas");
  }

  async function updateStatus(p: Proposal, status: Proposal["status"]) {
    setRows(rows.map((r) => (r.id === p.id ? { ...r, status } : r)));
    if (orgId) await supabase.from("proposals").update({ status }).eq("id", p.id);
    toast.success(`Propuesta ${status}`);
  }

  /** Fase 4: aprobar además queda registrado en proposal_feedback (alimenta el prompt de próximas generaciones). */
  async function handleApprove(p: Proposal) {
    await updateStatus(p, "programada");
    if (orgId) {
      await supabase.from("proposal_feedback").insert({
        organization_id: orgId,
        proposal_id: p.id,
        user_id: userId,
        decision: "aprobado",
      });
    }
  }

  async function submitReject() {
    if (!rejecting) return;
    const reason = rejectReason.trim();
    await updateStatus(rejecting, "pausada");
    if (orgId) {
      await supabase.from("proposal_feedback").insert({
        organization_id: orgId,
        proposal_id: rejecting.id,
        user_id: userId,
        decision: "rechazado",
        reason: reason || null,
      });
    }
    setRejecting(null);
    setRejectReason("");
  }

  async function saveEdit() {
    if (!editing) return;
    setRows(rows.map((r) => (r.id === editing.id ? editing : r)));
    if (orgId)
      await supabase
        .from("proposals")
        .update({
          name: editing.name,
          description: editing.description,
          channel: editing.channel,
          schedule: editing.schedule,
        })
        .eq("id", editing.id);
    setEditing(null);
    toast.success("Propuesta actualizada");
  }

  async function saveTemplate() {
    if (!preview) return;
    setRows(rows.map((r) => (r.id === preview.proposal.id ? { ...r, template } : r)));
    if (orgId) await supabase.from("proposals").update({ template }).eq("id", preview.proposal.id);
    setPreview(null);
    toast.success("Plantilla guardada");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cadencia y canales por segmento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="seg">Segmento de cliente</Label>
            <Input id="seg" value={segment} onChange={(e) => setSegment(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cad">Cadencia</Label>
            <Select value={cadence} onValueChange={(v) => setCadence(v as Cadence)}>
              <SelectTrigger id="cad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">semanal</SelectItem>
                <SelectItem value="mensual">mensual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chan">Canal preferido</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
              <SelectTrigger id="chan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              <Sparkles className="mr-2 size-4" />
              {generating ? "Generando..." : "Generar propuestas"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Propuestas generadas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || generating ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay propuestas. Generá las primeras con el botón de arriba.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto / servicio</TableHead>
                    <TableHead>Cliente objetivo</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Cadencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </TableCell>
                      <TableCell className="text-sm">{p.targetClient}</TableCell>
                      <TableCell className="text-sm">{p.channel}</TableCell>
                      <TableCell className="text-sm">{p.schedule}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === "enviada"
                              ? "default"
                              : p.status === "pausada"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Vista previa del mensaje"
                            onClick={() => {
                              setPreview({ proposal: p, channel: p.channel });
                              setTemplate(p.template ?? buildMessageTemplate(p, p.channel));
                            }}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Aprobar"
                            onClick={() => void handleApprove(p)}
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Rechazar"
                            onClick={() => setRejecting(p)}
                          >
                            <X className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Editar"
                            onClick={() => setEditing(p)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Pausar"
                            onClick={() => updateStatus(p, "pausada")}
                          >
                            <Pause className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vista previa del mensaje</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <Tabs
                value={preview.channel}
                onValueChange={(v) => {
                  const ch = v as Channel;
                  setPreview({ ...preview, channel: ch });
                  setTemplate(buildMessageTemplate(preview.proposal, ch));
                }}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="Email">Email</TabsTrigger>
                  <TabsTrigger value="LinkedIn">LinkedIn</TabsTrigger>
                  <TabsTrigger value="WhatsApp">WhatsApp</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="space-y-2">
                <Label htmlFor="tpl">Plantilla editable</Label>
                <Textarea
                  id="tpl"
                  rows={10}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Usá {"{{nombre}}"} y {"{{remitente}}"} para personalizar el mensaje.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Cerrar
            </Button>
            <Button onClick={saveTemplate}>Guardar plantilla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar propuesta</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ed-name">Nombre</Label>
                <Input
                  id="ed-name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-desc">Descripción</Label>
                <Textarea
                  id="ed-desc"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ed-chan">Canal</Label>
                  <Select
                    value={editing.channel}
                    onValueChange={(v) => setEditing({ ...editing, channel: v as Channel })}
                  >
                    <SelectTrigger id="ed-chan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ed-cad">Cadencia</Label>
                  <Select
                    value={editing.schedule}
                    onValueChange={(v) => setEditing({ ...editing, schedule: v as Cadence })}
                  >
                    <SelectTrigger id="ed-cad">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">semanal</SelectItem>
                      <SelectItem value="mensual">mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar propuesta</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo (opcional)</Label>
            <Textarea
              id="reject-reason"
              rows={3}
              placeholder="Ej: canal poco usado por este segmento"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              El motivo ayuda a que las próximas propuestas generadas se ajusten mejor.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void submitReject()}>
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CoCreacion() {
  const [category, setCategory] = useState("Servicio financiero");
  const [needs, setNeeds] = useState("");
  const [budget, setBudget] = useState(1000);
  const [history, setHistory] = useState<string[]>(["Plan básico 2023"]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);

  async function handleGenerate() {
    const next: Record<string, string> = {};
    if (needs.trim().length < 10) next["needs"] = "Contanos tu necesidad (mínimo 10 caracteres)";
    if (!budget || budget <= 0) next["budget"] = "Ingresá un presupuesto válido";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setSuggestions([]);
    const result = await generateRecommendations({ category, needs, budget, history });
    setSuggestions(result);
    setLoading(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contanos qué necesitás</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat">Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Servicio financiero">Servicio financiero</SelectItem>
                <SelectItem value="Consultoría">Consultoría</SelectItem>
                <SelectItem value="Producto digital">Producto digital</SelectItem>
                <SelectItem value="Capacitación">Capacitación</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="needs">Necesidades *</Label>
            <Textarea
              id="needs"
              rows={4}
              value={needs}
              onChange={(e) => setNeeds(e.target.value)}
              aria-invalid={!!errors["needs"]}
              maxLength={1000}
            />
            {errors["needs"] && <p className="text-xs text-destructive">{errors["needs"]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Presupuesto (USD) *</Label>
            <Input
              id="budget"
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              aria-invalid={!!errors["budget"]}
            />
            {errors["budget"] && <p className="text-xs text-destructive">{errors["budget"]}</p>}
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            <Sparkles className="mr-2 size-4" />
            {loading ? "Generando recomendación..." : "Generar recomendación"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tu consumo previo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {HISTORY_CHIPS.map((chip) => {
                const active = history.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setHistory(active ? history.filter((h) => h !== chip) : [...history, chip])
                    }
                    className={
                      active
                        ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                        : "rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
                    }
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {loading &&
          [0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-3 pt-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}

        {suggestions.map((s) => (
          <Card key={s.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{s.name}</CardTitle>
              <Badge>USD {s.price.toLocaleString("es-AR")}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{s.description}</p>
              <p className="text-sm text-muted-foreground">
                <strong className="font-medium text-foreground">Por qué: </strong>
                {s.rationale}
              </p>
              <div className="flex flex-wrap gap-2">
                {s.features.map((f) => (
                  <Badge key={f} variant="outline">
                    {f}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
