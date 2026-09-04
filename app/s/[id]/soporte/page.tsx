import { notFound } from "next/navigation";
import { SystemPortal } from "@/components/system-portal";
import { system } from "@/data/system";

export default async function SupportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== system.id) notFound();
  return <SystemPortal system={system} view="soporte" />;
}
