"use client";

import { useState } from "react";
import { Bell, Building2, Languages, Moon, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const settings = [
  { title: "Tema claro/oscuro", detail: "Preferencia visual simulada", icon: Moon },
  { title: "Idioma", detail: "Español / Ingles", icon: Languages },
  { title: "Notificaciones", detail: "Alertas operativas y reportes", icon: Bell },
  { title: "Empresa", detail: "Datos comerciales de SOLARIS", icon: Building2 },
  { title: "Usuario", detail: "Perfil demo sin autenticacion", icon: User },
];

export default function SettingsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    "Tema claro/oscuro": false,
    Idioma: true,
    Notificaciones: true,
    Empresa: true,
    Usuario: true,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Configuracion</h1>
        <p className="mt-2 text-sm text-muted-foreground">Opciones visuales simuladas para la demostracion MVP.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Preferencias</CardTitle>
          <CardDescription>Controles de ejemplo sin persistencia real.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {settings.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-muted-foreground">{item.detail}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled((current) => ({ ...current, [item.title]: !current[item.title] }))}
                  className={`flex h-6 w-11 items-center rounded-full p-1 transition-colors ${
                    enabled[item.title] ? "bg-blue-600" : "bg-slate-300"
                  }`}
                  aria-label={`Cambiar ${item.title}`}
                >
                  <span className={`size-4 rounded-full bg-white transition-transform ${enabled[item.title] ? "translate-x-5" : ""}`} />
                </button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
