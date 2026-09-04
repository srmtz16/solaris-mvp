import { NextResponse } from "next/server";
import { validateClientRequest } from "@/lib/client-request";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "El servicio aún no está conectado." }, { status: 503 });
  }
  let input: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return NextResponse.json({ error: "Solicitud demasiado grande." }, { status: 413 });
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const validation = validateClientRequest(input);
  if ("error" in validation) return NextResponse.json({ error: validation.error }, { status: 400 });

  try {
    // This restricted function may insert requests, never read customer records.
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/submit_client_request`, {
      method: "POST",
      headers: { apikey: supabaseKey, "Content-Type": "application/json" },
      body: JSON.stringify(validation.payload),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      // Do not log error details: they can contain contact data.
      if (detail.code === "PGRST202") return NextResponse.json({ error: "La recepción de solicitudes aún no está habilitada." }, { status: 503 });
      if (detail.code === "P0001") return NextResponse.json({ error: "Ya recibimos una solicitud reciente con este teléfono. Espera cinco minutos antes de enviar otra." }, { status: 429 });
      if (detail.code === "22023") return NextResponse.json({ error: "No fue posible validar el sistema o los datos. Revisa tu información." }, { status: 400 });
      return NextResponse.json({ error: "No pudimos guardar la solicitud. Intenta nuevamente." }, { status: 502 });
    }
    const reference = await response.json();
    if (typeof reference !== "string" || !/^[0-9a-f-]{36}$/i.test(reference)) {
      return NextResponse.json({ error: "No se pudo confirmar el envío. Verifica con el equipo antes de reenviar." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, reference }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo confirmar el envío por un problema de conexión. Verifica con el equipo antes de reenviar." }, { status: 502 });
  }
}
