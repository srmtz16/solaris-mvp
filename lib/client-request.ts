export type ClientRequestPayload = {
  p_system_code: string;
  p_request_type: "maintenance" | "failure";
  p_customer_name: string;
  p_phone: string;
  p_email: string | null;
  p_message: string;
  p_preferred_date: string | null;
};

type Validation = { payload: ClientRequestPayload } | { error: string };

// Maps form fields to the SQL function; never creates or edits a client profile.
export function validateClientRequest(input: unknown): Validation {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "Solicitud inválida." };
  const body = input as Record<string, unknown>;
  for (const field of ["systemId", "requestType", "name", "phone", "email", "message", "preferredDate", "website"]) {
    if (body[field] !== undefined && body[field] !== null && typeof body[field] !== "string") return { error: "Solicitud inválida." };
  }
  const value = (field: string) => typeof body[field] === "string" ? body[field].trim() : "";
  const systemCode = value("systemId");
  const requestType = value("requestType");
  const name = value("name");
  const phone = value("phone");
  const email = value("email");
  const message = value("message");
  const preferredDate = value("preferredDate");
  if (value("website")) return { error: "No se pudo validar el envío." };
  if (!/^FV-\d{4,}$/.test(systemCode) || !["maintenance", "failure"].includes(requestType)) return { error: "Sistema o tipo de solicitud inválido." };
  if (name.length < 2 || name.length > 100 || phone.length < 7 || phone.length > 30) return { error: "Revisa el nombre y teléfono." };
  if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return { error: "El correo no es válido." };
  if (message.length < 5 || message.length > 1500) return { error: "El mensaje debe contener entre 5 y 1,500 caracteres." };
  if (preferredDate) {
    const parsed = new Date(`${preferredDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== preferredDate) return { error: "La fecha preferida no es válida." };
    if (requestType !== "maintenance") return { error: "La fecha preferida solo aplica a mantenimientos." };
  }
  return { payload: {
    p_system_code: systemCode,
    p_request_type: requestType as ClientRequestPayload["p_request_type"],
    p_customer_name: name,
    p_phone: phone,
    p_email: email || null,
    p_message: message,
    p_preferred_date: preferredDate || null,
  } };
}
