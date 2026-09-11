import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Trivium AI" },
      { name: "description", content: "CRM simple con canales de contacto e historial de consumo." },
      { property: "og:title", content: "Clientes — Trivium AI" },
      { property: "og:description", content: "Gestioná tus clientes y su historial de consumo." },
    ],
  }),
  component: ClientesPage,
});

interface Row {
  id: string;
  name: string;
  email: string | null;
  linkedin: string | null;
  whatsapp: string | null;
  segment: string | null;
  consumption: unknown;
}

const schema = z.object({
  name: z.string().trim().min(2, "Ingresá el nombre").max(120),
  email: z.string().trim().email("Email inválido").max(255).or(z.literal("")),
  linkedin: z.string().trim().max(255),
  whatsapp: z.string().trim().max(40),
  segment: z.string().trim().max(60),
});

function ClientesPage() {
  const { organization } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    linkedin: "",
    whatsapp: "",
    segment: "Corporativo",
    consumption: "",
  });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("clients")
      .select("id, name, email, linkedin, whatsapp, segment, consumption")
      .order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  async function save() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (next[String(i.path[0])] = i.message));
      setErrors(next);
      return;
    }
    if (!organization) {
      toast.error("Primero configurá tu organización");
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await supabase.from("clients").insert({
      organization_id: organization.id,
      name: form.name.trim(),
      email: form.email.trim() || null,
      linkedin: form.linkedin.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      segment: form.segment.trim() || null,
      consumption: form.consumption
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean) as unknown as never,
    });
    setSaving(false);
    if (error) {
      toast.error("No pudimos guardar el cliente", { description: error.message });
      return;
    }
    setOpen(false);
    setForm({ name: "", email: "", linkedin: "", whatsapp: "", segment: "Corporativo", consumption: "" });
    toast.success("Cliente agregado");
    void load();
  }

  return (
    <AppLayout title="Clientes" description="CRM simple con canales de contacto e historial.">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" /> Nuevo cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {(
                [
                  ["name", "Nombre *"],
                  ["email", "Email"],
                  ["linkedin", "LinkedIn"],
                  ["whatsapp", "WhatsApp"],
                  ["segment", "Segmento"],
                  ["consumption", "Historial de consumo (separado por comas)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`cl-${key}`}>{label}</Label>
                  <Input
                    id={`cl-${key}`}
                    value={form[key]}
                    aria-invalid={!!errors[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                  {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no cargaste clientes.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>LinkedIn</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Consumo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm">{c.email ?? "—"}</TableCell>
                      <TableCell className="text-sm">{c.linkedin ?? "—"}</TableCell>
                      <TableCell className="text-sm">{c.whatsapp ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.segment ?? "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(c.consumption) ? (c.consumption as string[]) : []).map(
                            (item) => (
                              <Badge key={item} variant="outline">
                                {item}
                              </Badge>
                            ),
                          )}
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
    </AppLayout>
  );
}
