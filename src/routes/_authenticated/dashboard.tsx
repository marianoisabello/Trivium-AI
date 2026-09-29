import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LineChart, Package, Leaf, ArrowRight, Activity } from "lucide-react";
import { getDashboardSummaryFn } from "@/services/dashboardService.functions";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Trivium AI" },
      { name: "description", content: "Resumen de escenarios, propuestas e iniciativas activas." },
      { property: "og:title", content: "Dashboard — Trivium AI" },
      { property: "og:description", content: "Resumen de los tres pilares de tu organización." },
    ],
  }),
  component: Dashboard,
});

interface Activity {
  label: string;
  detail: string;
  date: string;
}

function Dashboard() {
  const { organization, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  const [proposalsSent, setProposalsSent] = useState(0);
  const [activeInitiatives, setActiveInitiatives] = useState(0);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (role === "cliente") {
      navigate({ to: "/productos", replace: true });
      return;
    }
    if (!organization) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    void (async () => {
      const summary = await getDashboardSummaryFn();
      setLastAnalysis(summary.lastAnalysisName);
      setProposalsSent(summary.proposalsSent);
      setActiveInitiatives(summary.activeInitiatives);
      setActivity(summary.activity);
      setLoading(false);
    })();
  }, [authLoading, organization, role, navigate]);

  const cards = [
    {
      title: "Escenarios Futuros",
      icon: LineChart,
      value: lastAnalysis ?? "Sin análisis aún",
      caption: "Último análisis generado",
      to: "/escenarios" as const,
    },
    {
      title: "Productos y Servicios",
      icon: Package,
      value: `${proposalsSent}`,
      caption: "Propuestas enviadas",
      to: "/productos" as const,
    },
    {
      title: "Sustentabilidad",
      icon: Leaf,
      value: `${activeInitiatives}`,
      caption: "Iniciativas en ejecución",
      to: "/sustentabilidad" as const,
    },
  ];

  return (
    <AppLayout
      title={`Hola, ${organization?.name ?? "equipo"}`}
      description="Resumen de los tres pilares de Trivium AI."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className="size-4 text-primary" aria-hidden />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                <p className="truncate text-xl font-semibold">{c.value}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{c.caption}</p>
              <Button asChild variant="link" className="mt-2 h-auto p-0 text-sm">
                <Link to={c.to}>
                  Abrir módulo <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-primary" aria-hidden /> Actividad reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay actividad. Generá tu primer análisis de escenarios para empezar.
            </p>
          ) : (
            <ul className="divide-y">
              {activity.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.detail}</p>
                    <p className="text-xs text-muted-foreground">{a.label}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {new Date(a.date).toLocaleDateString("es-AR")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
