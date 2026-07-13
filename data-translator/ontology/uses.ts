export const usesByField: Record<string, string[]> = {
  timestamp: ["Dashboard", "Graficas", "Validacion", "Reportes"],
  serial_number: ["Validacion", "Reportes"],
  inverter_id: ["Dashboard", "Graficas", "Analisis", "Alertas", "Reportes"],
  status: ["Dashboard", "Alertas", "IA", "Reportes"],
  energy_daily: ["Dashboard", "KPIs", "Reportes", "Comparaciones diarias"],
  energy_total: ["Reportes", "Validacion", "Analisis historico"],
  pv_energy_daily: ["Dashboard", "KPIs", "Reportes", "Comparaciones diarias"],
  pv_energy_total: ["Reportes", "Validacion", "Analisis historico"],
  dc_input_power: ["Comparacion de MPPT", "Analisis de perdidas", "Deteccion de sombreado", "Alertas", "Graficas tecnicas"],
  dc_power: ["Graficas", "Analisis", "Validacion"],
  active_power: ["Dashboard", "Graficas", "Analisis", "Alertas", "IA", "Reportes"],
  reactive_power: ["Analisis", "Calidad electrica", "Reportes"],
  mppt_voltage: ["Graficas tecnicas", "Analisis de MPPT", "Validacion"],
  mppt_current: ["Comparacion de MPPT", "Analisis de perdidas", "Alertas"],
  ac_line_voltage: ["Calidad electrica", "Alertas", "Validacion"],
  ac_phase_voltage: ["Calidad electrica", "Alertas", "Validacion"],
  ac_phase_current: ["Balance de fases", "Alertas", "Graficas tecnicas"],
  frequency: ["Calidad electrica", "Alertas", "Reportes"],
  power_factor: ["Calidad electrica", "Reportes"],
  inverter_temperature: ["Alertas", "Analisis termico", "IA"],
  irradiance: ["Analisis", "IA", "Validacion de performance"],
  operating_hours: ["Mantenimiento", "Reportes"],
};

export function usesForField(fieldId: string) {
  return usesByField[fieldId] ?? ["Validacion"];
}
