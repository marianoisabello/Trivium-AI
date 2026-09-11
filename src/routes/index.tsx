import { createFileRoute, Link } from "@tanstack/react-router";
import { LineChart, Package, Leaf, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trivium AI — IA generativa para organizaciones" },
      {
        name: "description",
        content:
          "Tres pilares en una sola plataforma: escenarios futuros para decidir, generación de productos y servicios, e iniciativas de sustentabilidad medibles.",
      },
      { property: "og:title", content: "Trivium AI — IA generativa para organizaciones" },
      {
        property: "og:description",
        content:
          "Escenarios futuros, generación de productos y sustentabilidad con IA, en una sola plataforma.",
      },
    ],
  }),
  component: Landing,
});

const PILARES = [
  {
    icon: LineChart,
    title: "Escenarios Futuros",
    text: "Cargá tu portafolio y variables clave, y obtené escenarios optimista, esperado y pesimista con retorno, riesgo y narrativa.",
  },
  {
    icon: Package,
    title: "Generador de Productos",
    text: "Propuestas automáticas por canal y cadencia, más un espacio de co-creación para que tus clientes armen su propio producto.",
  },
  {
    icon: Leaf,
    title: "Sustentabilidad",
    text: "Iniciativas con alcance, meta, plan de acción y KPIs con seguimiento en tablero Kanban.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="size-5 text-primary-foreground" aria-hidden />
          </div>
          <span className="text-lg font-semibold">Trivium AI</span>
        </div>
        <Button asChild>
          <Link to="/auth">Ingresar</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 text-center">
          <p className="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            Plataforma B2B de IA generativa
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Tres pilares de IA generativa para tu organización
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            Decidí con escenarios futuros, generá productos y servicios a medida y llevá adelante
            iniciativas de sustentabilidad con métricas reales.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Empezar ahora <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 md:grid-cols-3">
          {PILARES.map((p) => (
            <article key={p.title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
                <p.icon className="size-5 text-accent-foreground" aria-hidden />
              </div>
              <h2 className="mt-4 text-lg font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
