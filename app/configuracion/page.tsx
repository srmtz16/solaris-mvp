"use client";

import { useState } from "react";
import { Bell, Building2, Languages, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeSelector } from "@/components/theme-selector";

const settings = [
  { title: "Idioma", detail: "Español / Ingles", icon: Languages },
  { title: "Notificaciones", detail: "Alertas operativas y reportes", icon: Bell },
  { title: "Empresa", detail: "Datos comerciales de SOLARIS", icon: Building2 },
  { title: "Usuario", detail: "Perfil demo sin autenticacion", icon: User },
];

export default function SettingsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    Idioma: true,
    Notificaciones: true,
    Empresa: true,
    Usuario: true,
  });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Configuracion</h1>
        <p className="mt-2 text-sm text-muted-foreground">Preferencias visuales y operativas del MVP.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
          <CardDescription>Aplica el tema inmediatamente, persiste la preferencia y respeta el sistema cuando corresponde.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferencias</CardTitle>
          <CardDescription>Controles demo para preferencias operativas.</CardDescription>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-3 md:grid-cols-2">
          {settings.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-border p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-muted-foreground">{item.detail}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled((current) => ({ ...current, [item.title]: !current[item.title] }))}
                  className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors ${
                    enabled[item.title] ? "bg-primary" : "bg-muted"
                  }`}
                  aria-label={`Cambiar ${item.title}`}
                >
                  <span className={`size-4 rounded-full bg-card transition-transform ${enabled[item.title] ? "translate-x-5" : ""}`} />
                </button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
