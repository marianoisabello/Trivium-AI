import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — Trivium AI" },
      { name: "description", content: "Datos de la organización, perfil y permisos de acceso." },
      { property: "og:title", content: "Configuración — Trivium AI" },
      { property: "og:description", content: "Administrá tu organización y tu perfil." },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const { organization, fullName, user, role, refresh } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOrgName(organization?.name ?? "");
    setIndustry(organization?.industry ?? "");
    setSize(organization?.size ?? "");
    setName(fullName ?? "");
  }, [organization, fullName]);

  async function save() {
    setSaving(true);
    if (organization) {
      await supabase
        .from("organizations")
        .update({ name: orgName.trim(), industry, size })
        .eq("id", organization.id);
    }
    if (user) {
      await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", user.uid);
    }
    await refresh();
    setSaving(false);
    toast.success("Cambios guardados");
  }

  return (
    <AppLayout title="Configuración" description="Organización, perfil y permisos.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organización</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cf-org">Nombre</Label>
              <Input id="cf-org" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-ind">Industria</Label>
              <Input id="cf-ind" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-size">Tamaño</Label>
              <Input id="cf-size" value={size} onChange={(e) => setSize(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tu perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cf-name">Nombre y apellido</Label>
              <Input id="cf-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <div>
                <Badge variant="secondary">
                  {role === "cliente" ? "Cliente final" : "Administrador"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button onClick={save} disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </AppLayout>
  );
}
