"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileSpreadsheet, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/theme-selector";

const navItems = [
  { label: "Análisis eléctrico", href: "/", icon: LayoutDashboard },
  { label: "Mapeo avanzado", href: "/data-translator", icon: FileSpreadsheet },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/s/")) {
    return <>{children}</>;
  }

  const sidebar = (
    <aside className="flex h-full w-72 max-w-[min(18rem,calc(100vw-2rem))] flex-col bg-slate-950 px-4 py-5 text-white">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <div className="flex size-10 items-center justify-center rounded-lg bg-yellow-300 text-slate-950">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-normal">SOLARIS</div>
            <div className="text-xs text-slate-400">Solar Intelligence</div>
          </div>
        </Link>
        <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar menu">
          <X className="size-4" />
        </Button>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white",
                active && "bg-blue-600 text-white shadow-sm shadow-blue-950/40",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold">SOLARIS</div>
        <div className="mt-1 text-xs text-slate-400">Version MVP</div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/50" aria-label="Cerrar menu" onClick={() => setOpen(false)} />
          <div className="relative h-full">{sidebar}</div>
        </div>
      ) : null}
      <div className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-8">
          <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="size-4" />
          </Button>
          <div className="hidden text-sm text-muted-foreground lg:block">Análisis eléctrico local y auditable</div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">Los archivos no salen del navegador</span>
            <span className="rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">Modo local</span>
            <ThemeSelector compact />
          </div>
        </header>
        <main className="min-w-0 overflow-x-hidden px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
