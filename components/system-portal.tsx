"use client";

import {
  ArrowRight, CalendarDays, Camera, Check, ChevronRight, ClipboardCheck,
  FileText, FolderOpen, Headphones, History, Home, Images, LayoutGrid,
  MessageSquareText, ShieldCheck, Sparkles, Sun, Wrench, X,
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

function NextMaintenance({ system, onRequest }: { system: SolarSystem; onRequest: () => void }) {
  return <section className="relative overflow-hidden rounded-[2rem] bg-[#191914] p-6 text-white shadow-[0_20px_60px_rgba(20,20,15,.16)] md:p-10">
    <div className="absolute -right-16 -top-20 size-56 rounded-full bg-[#d6b76f]/15 blur-2xl" /><div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-end"><div><div className="mb-5 flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#d6b76f]"><CalendarDays className="size-5" /></div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#d6b76f]">Próximo mantenimiento</p><h2 className="mt-2 text-3xl font-medium tracking-[-.03em] md:text-4xl">{system.nextMaintenance}</h2><p className="mt-3 text-sm text-stone-400">Mantenimiento preventivo recomendado</p></div><button onClick={onRequest} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#d6b76f] px-6 text-sm font-semibold text-[#191914] transition hover:bg-[#e2c682]">Solicitar mantenimiento <ArrowRight className="size-4" /></button></div>
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

function QuickActions({ id, openRequest }: { id: string; openRequest: (type: RequestType) => void }) {
  const actions = [{ label: "Solicitar mantenimiento", icon: CalendarDays, action: "maintenance" as const }, { label: "Reportar una falla", icon: Headphones, action: "failure" as const }, { label: "Ver historial", icon: History, href: portalHref(id, "historial") }, { label: "Ver documentos", icon: FolderOpen, href: portalHref(id, "documentos") }];
  return <section><SectionHeading eyebrow="Accesos directos" title="¿Qué necesitas?" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{actions.map(({ label, icon: Icon, href, action }) => href ? <Link key={label} href={href} className="flex min-h-32 flex-col justify-between rounded-3xl border border-stone-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg"><Icon className="size-5 text-[#9b7835]" /><span className="mt-6 text-sm font-semibold leading-5 text-stone-900">{label}</span></Link> : <button key={label} onClick={() => action && openRequest(action)} className="flex min-h-32 flex-col justify-between rounded-3xl border border-stone-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg"><Icon className="size-5 text-[#9b7835]" /><span className="mt-6 text-sm font-semibold leading-5 text-stone-900">{label}</span></button>)}</div></section>;
}

type RequestType = "maintenance" | "failure";

function RequestDialog({ type, systemId, close, completed }: { type: RequestType; systemId: string; close: () => void; completed: (message: string) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const title = type === "maintenance" ? "Solicitar mantenimiento" : "Reportar una falla";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/client-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemId, requestType: type, name: form.get("name"), phone: form.get("phone"), email: form.get("email"), preferredDate: form.get("preferredDate"), message: form.get("message"), website: form.get("website") }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok || !result.reference) { setError(result.error || "No pudimos confirmar el envío. Verifica con el equipo antes de reenviar."); return; }
      setReference(result.reference);
    } catch {
      setError("No se pudo confirmar el envío por un problema de conexión. Verifica con el equipo antes de reenviar.");
    } finally {
      setSubmitting(false);
    }
  }
  if (reference) return <div className="fixed inset-0 z-[70] grid place-items-center bg-stone-950/45 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Solicitud recibida"><div className="w-full max-w-lg rounded-[2rem] bg-[#faf9f6] p-8"><Check className="mb-4 size-8 text-emerald-700" /><h2 className="text-2xl font-semibold">Solicitud recibida</h2><p className="mt-3 text-sm text-stone-600">Conserva tu folio para el seguimiento. El envío no confirma una cita ni un diagnóstico.</p><p className="mt-5 text-xs font-semibold uppercase tracking-wider text-stone-500">Folio</p><p className="mt-2 break-all rounded-xl border border-stone-200 bg-white p-4 font-mono text-sm">{reference}</p><button onClick={() => { completed("Solicitud enviada"); close(); }} className="mt-6 h-12 w-full rounded-full bg-stone-900 text-sm font-semibold text-white">Entendido</button></div></div>;
  return <div className="fixed inset-0 z-[70] grid place-items-end bg-stone-950/45 p-0 backdrop-blur-sm sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-[#faf9f6] p-6 shadow-2xl sm:max-w-lg sm:rounded-[2rem] sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#9b7835]">Sistema {systemId}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-2 text-sm leading-6 text-stone-500">Déjanos tus datos y el equipo dará seguimiento a tu solicitud.</p></div><button onClick={close} aria-label="Cerrar" className="grid size-10 shrink-0 place-items-center rounded-full border border-stone-200 bg-white"><X className="size-4" /></button></div><form onSubmit={submit} className="mt-6 space-y-4"><input name="website" className="hidden" tabIndex={-1} autoComplete="off" /><label className="block text-sm font-medium">Nombre completo<input required name="name" maxLength={100} className="mt-2 h-12 w-full rounded-xl border border-stone-200 bg-white px-4 outline-none focus:border-[#b48b43]" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Teléfono<input required name="phone" type="tel" maxLength={30} className="mt-2 h-12 w-full rounded-xl border border-stone-200 bg-white px-4 outline-none focus:border-[#b48b43]" /></label><label className="block text-sm font-medium">Correo <span className="text-stone-400">(opcional)</span><input name="email" type="email" className="mt-2 h-12 w-full rounded-xl border border-stone-200 bg-white px-4 outline-none focus:border-[#b48b43]" /></label></div>{type === "maintenance" && <label className="block text-sm font-medium">Fecha preferida <span className="text-stone-400">(opcional)</span><input name="preferredDate" type="date" className="mt-2 h-12 w-full rounded-xl border border-stone-200 bg-white px-4 outline-none focus:border-[#b48b43]" /></label>}<label className="block text-sm font-medium">{type === "maintenance" ? "Comentarios" : "Describe lo que sucede"}<textarea required name="message" minLength={5} maxLength={1500} rows={4} className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-white p-4 outline-none focus:border-[#b48b43]" /></label>{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button disabled={submitting} className="flex h-12 w-full items-center justify-center rounded-full bg-stone-900 px-5 text-sm font-semibold text-white disabled:opacity-60">{submitting ? "Enviando…" : "Enviar solicitud"}</button></form></div></div>;
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <div className="mb-5"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#9b7835]">{eyebrow}</p><h2 className="text-2xl font-semibold tracking-[-.025em] text-stone-900 md:text-3xl">{title}</h2></div>; }

function MobileNavigation({ id }: { id: string }) { const pathname = usePathname(); return <nav className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-stone-200/80 bg-white/95 p-1.5 shadow-[0_12px_40px_rgba(20,20,15,.16)] backdrop-blur-xl md:hidden"><div className="grid grid-cols-4">{navItems.map(({ label, icon: Icon, section }) => { const href = portalHref(id, section); const active = pathname === href; return <Link key={label} href={href} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition ${active ? "bg-stone-900 text-white" : "text-stone-500 active:bg-stone-100"}`}><Icon className="size-4" />{label}</Link>; })}</div></nav>; }

export function SystemPortal({ system, view = "inicio" }: { system: SolarSystem; view?: SystemPortalView }) {
  const [toast, setToast] = useState("");
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2200); };
  return <div className="min-h-screen bg-[#faf9f6] text-stone-900"><Header id={system.id} /><main className="mx-auto min-h-[70vh] max-w-6xl space-y-16 px-5 pb-32 pt-10 md:px-8 md:pb-16 md:pt-16">{view === "inicio" && <><SystemSummary system={system} /><NextMaintenance system={system} onRequest={() => setRequestType("maintenance")} /><Observations system={system} /></>}{view === "historial" && <MaintenanceHistory system={system} />}{view === "documentos" && <Documents system={system} notify={notify} />}{view === "soporte" && <QuickActions id={system.id} openRequest={setRequestType} />}</main><footer className="border-t border-stone-200 bg-white px-5 py-10 text-center text-xs text-stone-400"><div className="mb-2 flex items-center justify-center gap-2 font-semibold tracking-[.16em] text-stone-700"><ShieldCheck className="size-4 text-[#9b7835]" /> SOLARIS</div>Expediente de mantenimiento · {system.id}</footer><MobileNavigation id={system.id} />{requestType && <RequestDialog type={requestType} systemId={system.id} close={() => setRequestType(null)} completed={notify} />}{toast && <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white shadow-xl md:bottom-8">{toast}</div>}</div>;
}
