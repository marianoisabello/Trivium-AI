import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Settings, UserRound } from "lucide-react";
import { signOutAndGoToLogin } from "@/lib/auth/signOut";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// string (no Record<Role, ...>) para no acoplarse al tipo Role: "superadmin" llega con otra rama.
const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  cliente: "Cliente final",
  superadmin: "Superadmin (operador de la plataforma)",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-all text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

/**
 * Ícono de usuario con menú: datos de usuario, configuración y cerrar sesión.
 * Se usa en AppLayout y en las pantallas fuera de él (onboarding, errores).
 */
export function UserMenu() {
  const { user, fullName, role, organization } = useAuth();
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const displayName = fullName ?? user?.email ?? "Usuario";
  const initials = (fullName ?? user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <>
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
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <p className="truncate">{displayName}</p>
            {user?.email && fullName && (
              <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDetailsOpen(true)}>
            <UserRound className="mr-2 size-4" /> Datos de usuario
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void navigate({ to: "/configuracion" })}>
            <Settings className="mr-2 size-4" /> Configuración
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOutAndGoToLogin(navigate)}>
            <LogOut className="mr-2 size-4" /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Datos de usuario</DialogTitle>
            <DialogDescription>La cuenta con la que estás usando la plataforma.</DialogDescription>
          </DialogHeader>
          <dl>
            <DetailRow label="Nombre" value={fullName ?? "—"} />
            <DetailRow label="Email" value={user?.email ?? "—"} />
            <DetailRow label="Rol" value={role ? (ROLE_LABEL[role] ?? role) : "—"} />
            <DetailRow label="Organización" value={organization?.name ?? "Sin organización"} />
            <DetailRow label="ID de usuario" value={user?.uid ?? "—"} />
          </dl>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Cerrar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDetailsOpen(false);
                void signOutAndGoToLogin(navigate);
              }}
            >
              <LogOut className="mr-2 size-4" /> Cerrar sesión
            </Button>
            <Button
              onClick={() => {
                setDetailsOpen(false);
                void navigate({ to: "/configuracion" });
              }}
            >
              Editar en Configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
