"use client";

import {
  ArrowRight, CalendarDays, Camera, Check, ChevronRight, ClipboardCheck,
  FileText, FolderOpen, Headphones, History, Home, Images, LayoutGrid,
  MessageSquareText, ShieldCheck, Sparkles, Sun, Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { SolarSystem } from "@/data/system";

export type SystemPortalView = "inicio" | "historial" | "documentos" | "soporte";

const navItems = [
  { label: "Inicio", icon: Home, section: "" },
  { label: "Historial", icon: History, section: "historial" },
  { label: "Documentos", icon: FolderOpen, section: "documentos" },
  { label: "Soporte", icon: Headphones, section: "soporte" },
] as const;

const portalHref = (id: string, section: string) => `/s/${id}${section ? `/${section}` : ""}`;

function Header({ id }: { id: string }) {
  const pathname = usePathname();
  return <header className="border-b border-stone-200/80 bg-[#faf9f6]/90 backdrop-blur-xl">
    <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
      <Link href={portalHref(id, "")} className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-[#171713] text-[#d5b66f]"><Sun className="size-5" /></div><div><div className="text-sm font-semibold tracking-[.18em] text-stone-900">SOLARIS</div><div className="text-[10px] uppercase tracking-[.2em] text-stone-500">Cuidado solar</div></div></Link>
      <nav className="hidden items-center gap-1 md:flex">{navItems.map(({ label, section }) => { const href = portalHref(id, section); const active = pathname === href; return <Link key={label} href={href} className={`rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-white hover:text-stone-900"}`}>{label}</Link>; })}</nav>
      <div className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600">ID · {id}</div>
    </div>
  </header>;
}

function SystemSummary({ system }: { system: SolarSystem }) {
  const items = [["Potencia instalada", system.installedPower], ["Fecha de instalación", system.installationDate], ["Último mantenimiento", system.lastMaintenance], ["Próximo recomendado", system.nextMaintenance]];
  return <section id="inicio" className="scroll-mt-6">
    <div className="mb-8 md:mb-10"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-[#9b7835]"><Sparkles className="size-3.5" /> Expediente de mantenimiento</div><h1 className="max-w-2xl text-4xl font-medium leading-[1.05] tracking-[-.04em] text-[#171713] md:text-6xl">Mi Sistema<br />Fotovoltaico</h1><p className="mt-4 max-w-xl text-sm leading-6 text-stone-500 md:text-base">Información, servicios y documentos de tu sistema en un solo lugar.</p></div>
    <div className="grid overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_18px_50px_rgba(28,25,20,.06)] sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value], index) => <div key={label} className={`p-5 md:p-6 ${index ? "border-t border-stone-100 sm:border-t-0 sm:border-l" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t lg:border-l lg:border-t-0" : ""}`}><div className="mb-3 text-[11px] font-semibold uppercase tracking-[.14em] text-stone-400">{label}</div><div className="text-lg font-semibold tracking-tight text-stone-900">{value}</div></div>)}
    </div>
  </section>;
}

function NextMaintenance({ system, notify }: { system: SolarSystem; notify: (message: string) => void }) {
  return <section className="relative overflow-hidden rounded-[2rem] bg-[#191914] p-6 text-white shadow-[0_20px_60px_rgba(20,20,15,.16)] md:p-10">
    <div className="absolute -right-16 -top-20 size-56 rounded-full bg-[#d6b76f]/15 blur-2xl" /><div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-end"><div><div className="mb-5 flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#d6b76f]"><CalendarDays className="size-5" /></div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#d6b76f]">Próximo mantenimiento</p><h2 className="mt-2 text-3xl font-medium tracking-[-.03em] md:text-4xl">{system.nextMaintenance}</h2><p className="mt-3 text-sm text-stone-400">Mantenimiento preventivo recomendado</p></div><button onClick={() => notify("Disponible próximamente")} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#d6b76f] px-6 text-sm font-semibold text-[#191914] transition hover:bg-[#e2c682]">Solicitar mantenimiento <ArrowRight className="size-4" /></button></div>
  </section>;
}

function MaintenanceHistory({ system }: { system: SolarSystem }) {
  return <section id="historial" className="scroll-mt-8"><SectionHeading eyebrow="Trazabilidad" title="Historial de mantenimiento" /><div className="space-y-4">{system.maintenanceHistory.map((item) => <article key={item.date} className="group rounded-3xl border border-stone-200 bg-white p-5 transition hover:border-stone-300 md:p-6"><div className="grid gap-5 sm:grid-cols-[112px_1fr_auto] sm:items-center"><div><div className="text-sm font-semibold text-stone-900">{item.date}</div><div className="mt-1 text-xs text-stone-400">Fecha de servicio</div></div><div className="sm:border-l sm:border-stone-100 sm:pl-6"><h3 className="font-semibold text-stone-900">{item.type}</h3><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-500"><span className="flex items-center gap-1.5"><FileText className="size-3.5" /> Reporte</span><span className="flex items-center gap-1.5"><Camera className="size-3.5" /> Fotografías</span><span className="flex items-center gap-1.5"><MessageSquareText className="size-3.5" /> Observaciones</span><span className="flex items-center gap-1.5"><Wrench className="size-3.5" /> {item.technician}</span></div></div><div className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><span className="grid size-6 place-items-center rounded-full bg-emerald-50"><Check className="size-3.5" /></span>{item.status}</div></div></article>)}</div></section>;
}

function Documents({ system, notify }: { system: SolarSystem; notify: (message: string) => void }) {
  const icons = [FileText, ClipboardCheck, Images, LayoutGrid, FolderOpen];
  return <section id="documentos" className="scroll-mt-8"><SectionHeading eyebrow="Expediente digital" title="Documentos del sistema" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{system.documents.map((doc, index) => { const Icon = icons[index]; return <button key={doc.name} onClick={() => notify("Disponible próximamente")} className="group flex min-h-28 items-center gap-4 rounded-3xl border border-stone-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#c8a65c] hover:shadow-lg"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#f4efe4] text-[#9b7835]"><Icon className="size-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-stone-900">{doc.name}</span><span className="mt-1 block text-xs text-stone-400">{doc.type}</span></span><ChevronRight className="size-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-[#9b7835]" /></button>; })}</div></section>;
}

function Observations({ system }: { system: SolarSystem }) {
  return <section className="rounded-3xl border border-stone-200 bg-[#f4f1ea] p-6 md:p-8"><div className="flex gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-[#9b7835] shadow-sm"><ClipboardCheck className="size-5" /></div><div><h2 className="text-xl font-semibold tracking-tight text-stone-900">Observaciones del último servicio</h2><div className="mt-4 space-y-3">{system.observations.map((observation) => <p key={observation} className="text-sm leading-6 text-stone-600">{observation}</p>)}</div></div></div></section>;
}

function QuickActions({ id, notify }: { id: string; notify: (message: string) => void }) {
  const actions = [{ label: "Solicitar mantenimiento", icon: CalendarDays }, { label: "Reportar una falla", icon: Headphones }, { label: "Ver historial", icon: History, href: portalHref(id, "historial") }, { label: "Ver documentos", icon: FolderOpen, href: portalHref(id, "documentos") }];
  return <section><SectionHeading eyebrow="Accesos directos" title="¿Qué necesitas?" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{actions.map(({ label, icon: Icon, href }) => href ? <Link key={label} href={href} className="flex min-h-32 flex-col justify-between rounded-3xl border border-stone-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg"><Icon className="size-5 text-[#9b7835]" /><span className="mt-6 text-sm font-semibold leading-5 text-stone-900">{label}</span></Link> : <button key={label} onClick={() => notify("Próximamente")} className="flex min-h-32 flex-col justify-between rounded-3xl border border-stone-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg"><Icon className="size-5 text-[#9b7835]" /><span className="mt-6 text-sm font-semibold leading-5 text-stone-900">{label}</span></button>)}</div></section>;
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <div className="mb-5"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#9b7835]">{eyebrow}</p><h2 className="text-2xl font-semibold tracking-[-.025em] text-stone-900 md:text-3xl">{title}</h2></div>; }

function MobileNavigation({ id }: { id: string }) { const pathname = usePathname(); return <nav className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-stone-200/80 bg-white/95 p-1.5 shadow-[0_12px_40px_rgba(20,20,15,.16)] backdrop-blur-xl md:hidden"><div className="grid grid-cols-4">{navItems.map(({ label, icon: Icon, section }) => { const href = portalHref(id, section); const active = pathname === href; return <Link key={label} href={href} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition ${active ? "bg-stone-900 text-white" : "text-stone-500 active:bg-stone-100"}`}><Icon className="size-4" />{label}</Link>; })}</div></nav>; }

export function SystemPortal({ system, view = "inicio" }: { system: SolarSystem; view?: SystemPortalView }) {
  const [toast, setToast] = useState("");
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2200); };
  return <div className="min-h-screen bg-[#faf9f6] text-stone-900"><Header id={system.id} /><main className="mx-auto min-h-[70vh] max-w-6xl space-y-16 px-5 pb-32 pt-10 md:px-8 md:pb-16 md:pt-16">{view === "inicio" && <><SystemSummary system={system} /><NextMaintenance system={system} notify={notify} /><Observations system={system} /></>}{view === "historial" && <MaintenanceHistory system={system} />}{view === "documentos" && <Documents system={system} notify={notify} />}{view === "soporte" && <QuickActions id={system.id} notify={notify} />}</main><footer className="border-t border-stone-200 bg-white px-5 py-10 text-center text-xs text-stone-400"><div className="mb-2 flex items-center justify-center gap-2 font-semibold tracking-[.16em] text-stone-700"><ShieldCheck className="size-4 text-[#9b7835]" /> SOLARIS</div>Expediente de mantenimiento · {system.id}</footer><MobileNavigation id={system.id} />{toast && <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white shadow-xl md:bottom-8">{toast}</div>}</div>;
}
