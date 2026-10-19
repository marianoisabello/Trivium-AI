import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getOrganizationDetailFn, listOrganizationsFn } from "@/services/platformService.functions";
import type { OrganizationDetail, OrganizationOverview } from "@/repositories/platform";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/plataforma")({
  head: () => ({
    meta: [
      { title: "Plataforma — Trivium AI" },
      { name: "description", content: "Vista de operador: todas las organizaciones." },
    ],
  }),
  component: PlataformaPage,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR");
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function PlataformaPage() {
  const { role } = useAuth();

  // La verificación real es del servidor (requireSuperadmin); esto solo evita
  // mostrar una pantalla que fallaría con "Forbidden".
  if (role === null) {
    return (
      <AppLayout title="Plataforma">
        <Skeleton className="h-24 w-full" />
      </AppLayout>
    );
  }
  if (role !== "superadmin") {
    return (
      <AppLayout title="Plataforma">
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No tenés permisos para ver esta sección.
          </CardContent>
        </Card>
      </AppLayout>
    );
  }
  return <PlataformaContent />;
}

function PlataformaContent() {
  const [orgs, setOrgs] = useState<OrganizationOverview[] | null>(null);
  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    listOrganizationsFn()
      .then(setOrgs)
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "No se pudo cargar las organizaciones");
        setOrgs([]);
      });
  }, []);

  async function openOrg(organizationId: string) {
    setLoadingDetail(true);
    try {
      setDetail(await getOrganizationDetailFn({ data: { organizationId } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cargar la organización");
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <AppLayout
      title="Plataforma"
      description="Vista de operador, solo lectura: datos de todas las organizaciones."
    >
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="size-4" /> Acceso de superadmin. Cada consulta queda registrada.
      </div>

      {detail ? (
        <OrganizationView detail={detail} onBack={() => setDetail(null)} />
      ) : (
        <Card>
          <CardContent className="pt-6">
            {orgs === null || loadingDetail ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : orgs.length === 0 ? (
              <EmptyRow text="Todavía no hay organizaciones." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organización</TableHead>
                      <TableHead>Industria</TableHead>
                      <TableHead className="text-right">Miembros</TableHead>
                      <TableHead className="text-right">Clientes</TableHead>
                      <TableHead className="text-right">Análisis</TableHead>
                      <TableHead className="text-right">Propuestas</TableHead>
                      <TableHead className="text-right">Iniciativas</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgs.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{o.name}</TableCell>
                        <TableCell>{o.industry ?? "—"}</TableCell>
                        <TableCell className="text-right">{o.counts.members}</TableCell>
                        <TableCell className="text-right">{o.counts.clients}</TableCell>
                        <TableCell className="text-right">{o.counts.analyses}</TableCell>
                        <TableCell className="text-right">{o.counts.proposals}</TableCell>
                        <TableCell className="text-right">{o.counts.initiatives}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => void openOrg(o.id)}>
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}

function OrganizationView({ detail, onBack }: { detail: OrganizationDetail; onBack: () => void }) {
  const { organization: org } = detail;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 size-4" /> Organizaciones
        </Button>
        <h2 className="text-lg font-semibold">{org.name}</h2>
        <Badge variant="secondary">{org.industry ?? "sin industria"}</Badge>
        <span className="text-xs text-muted-foreground">Alta: {formatDate(org.createdAt)}</span>
      </div>

      <Tabs defaultValue="clientes">
        <TabsList>
          <TabsTrigger value="clientes">Clientes ({detail.clients.length})</TabsTrigger>
          <TabsTrigger value="escenarios">Escenarios ({detail.analyses.length})</TabsTrigger>
          <TabsTrigger value="propuestas">Propuestas ({detail.proposals.length})</TabsTrigger>
          <TabsTrigger value="iniciativas">Iniciativas ({detail.initiatives.length})</TabsTrigger>
          <TabsTrigger value="miembros">Miembros ({detail.members.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes">
          <Card>
            <CardContent className="pt-6">
              {detail.clients.length === 0 ? (
                <EmptyRow text="Sin clientes." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Segmento</TableHead>
                      <TableHead>Alta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.clients.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-sm">{c.email ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{c.segment ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(c.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escenarios">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {detail.analyses.length === 0 ? (
                <EmptyRow text="Sin análisis." />
              ) : (
                detail.analyses.map((a) => (
                  <div key={a.id} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {a.scenarios.map((s) => (
                        <Badge key={s.type} variant="outline">
                          {s.type}: {s.expectedReturn}% · riesgo {s.risk} · prob. {s.probability}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="propuestas">
          <Card>
            <CardContent className="pt-6">
              {detail.proposals.length === 0 ? (
                <EmptyRow text="Sin propuestas." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Propuesta</TableHead>
                      <TableHead>Cliente objetivo</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.proposals.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-sm">{p.targetClient ?? "—"}</TableCell>
                        <TableCell>{p.channel}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{p.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iniciativas">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {detail.initiatives.length === 0 ? (
                <EmptyRow text="Sin iniciativas." />
              ) : (
                detail.initiatives.map((i) => (
                  <div key={i.id} className="rounded-md border p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium">{i.title}</span>
                      <Badge variant="secondary">{i.status}</Badge>
                    </div>
                    <p className="mb-2 text-sm text-muted-foreground">{i.goal ?? "Sin meta"}</p>
                    <div className="flex flex-wrap gap-2">
                      {i.kpis.map((k) => (
                        <Badge key={k.name} variant="outline">
                          {k.name}: {k.currentValue}/{k.targetValue} {k.unit ?? ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="miembros">
          <Card>
            <CardContent className="pt-6">
              {detail.members.length === 0 ? (
                <EmptyRow text="Sin miembros." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.members.map((m, idx) => (
                      <TableRow key={`${m.email ?? "sin-email"}-${idx}`}>
                        <TableCell className="font-medium">{m.fullName ?? "—"}</TableCell>
                        <TableCell className="text-sm">{m.email ?? "—"}</TableCell>
                        <TableCell>{m.roles.join(", ") || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
