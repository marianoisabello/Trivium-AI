import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  LineChart,
  Package,
  Leaf,
  Settings,
  Users,
  Bell,
  LogOut,
  Menu,
  Sparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/escenarios", label: "Escenarios Futuros", icon: LineChart, roles: ["admin"] },
  { to: "/productos", label: "Generador de Productos", icon: Package, roles: ["admin", "cliente"] },
  { to: "/sustentabilidad", label: "Sustentabilidad", icon: Leaf, roles: ["admin"] },
  { to: "/clientes", label: "Clientes", icon: Users, roles: ["admin"] },
  { to: "/configuracion", label: "Configuración", icon: Settings, roles: ["admin", "cliente"] },
] as const;

export function AppLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { organization, fullName, user, role } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const items = NAV.filter((i) => (i.roles as readonly string[]).includes(role ?? "admin"));
  const initials = (fullName ?? user?.email ?? "U").slice(0, 2).toUpperCase();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Sparkles className="size-5 text-sidebar-primary-foreground" aria-hidden />
          </div>
          <div>
            <p className="text-base font-semibold leading-none">Trivium AI</p>
            <p className="mt-1 text-xs text-sidebar-foreground/60">IA generativa aplicada</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Navegación principal">
          {items.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-6 py-4 text-xs text-sidebar-foreground/60">
          {role === "cliente" ? "Acceso cliente final" : "Acceso administrador"}
        </div>
      </aside>

      {open && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-card px-4 py-3 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Abrir menú"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {organization?.name ?? "Sin organización"}
            </p>
            <p className="truncate text-xs text-muted-foreground">Plataforma de IA generativa</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative">
            <Bell className="size-5" />
            <Badge className="absolute -right-0.5 -top-0.5 size-4 justify-center rounded-full p-0 text-[10px]">
              3
            </Badge>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Menú de usuario"
              >
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">
                {fullName ?? user?.email ?? "Usuario"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/configuracion" })}>
                Configuración
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 size-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
