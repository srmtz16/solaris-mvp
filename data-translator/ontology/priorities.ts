import type { SemanticPriority, SemanticStatus } from "@/types/data-translator";

export const priorityLabels: Record<SemanticPriority, string> = {
  critical: "Critica",
  important: "Importante",
  complementary: "Complementaria",
  optional: "Opcional",
  ignore: "Ignorar",
};

export const statusLabels: Record<SemanticStatus, string> = {
  auto_detected: "Detectado automaticamente",
  needs_review: "Requiere revision",
  confirmed: "Confirmado por usuario",
  unassigned: "Sin asignar",
  ignored: "Ignorado",
};

export function priorityForField(fieldId: string): SemanticPriority {
  if (["timestamp", "inverter_id", "serial_number", "active_power", "energy_daily", "energy_total", "status"].includes(fieldId)) {
    return "critical";
  }
  if (
    [
      "dc_input_power",
      "dc_power",
      "mppt_voltage",
      "mppt_current",
      "ac_phase_voltage",
      "ac_line_voltage",
      "ac_phase_current",
      "frequency",
      "power_factor",
      "inverter_temperature",
    ].includes(fieldId)
  ) {
    return "important";
  }
  if (["irradiance", "ambient_temperature", "operating_hours", "alarm_code", "warning_code", "fault_code"].includes(fieldId)) {
    return "complementary";
  }
  if (fieldId === "ignore") return "ignore";
  return "optional";
}
