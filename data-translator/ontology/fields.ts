import type { ElectricalSide, SemanticFamily } from "@/types/data-translator";

export type FieldDefinition = {
  fieldId: string;
  label: string;
  family: SemanticFamily;
  electricalSide?: ElectricalSide;
  category?: string;
  standardUnit?: string;
  description: string;
};

export const fieldDefinitions: FieldDefinition[] = [
  { fieldId: "timestamp", label: "Marca de tiempo", family: "identification", category: "time", description: "Fecha y hora de la medicion" },
  { fieldId: "serial_number", label: "Numero de serie", family: "identification", category: "asset", description: "Identificador fisico del equipo" },
  { fieldId: "inverter_id", label: "Inversor", family: "identification", category: "asset", description: "Identificador del inversor" },
  { fieldId: "manufacturer", label: "Fabricante", family: "identification", category: "metadata", description: "Fabricante del equipo" },
  { fieldId: "model", label: "Modelo", family: "identification", category: "metadata", description: "Modelo del equipo" },
  { fieldId: "firmware", label: "Firmware", family: "identification", category: "metadata", description: "Version de firmware" },
  { fieldId: "status", label: "Estado", family: "identification", category: "operation", description: "Estado operativo" },
  { fieldId: "energy_daily", label: "Energia AC diaria", family: "energy", electricalSide: "ac", category: "production", standardUnit: "kWh", description: "Energia diaria entregada" },
  { fieldId: "energy_total", label: "Energia AC acumulada", family: "energy", electricalSide: "ac", category: "production", standardUnit: "kWh", description: "Energia acumulada entregada" },
  { fieldId: "pv_energy_daily", label: "Energia FV diaria", family: "energy", electricalSide: "dc", category: "production", standardUnit: "kWh", description: "Energia diaria en lado FV/DC" },
  { fieldId: "pv_energy_total", label: "Energia FV acumulada", family: "energy", electricalSide: "dc", category: "production", standardUnit: "kWh", description: "Energia acumulada en lado FV/DC" },
  { fieldId: "active_power", label: "Potencia activa", family: "power", electricalSide: "ac", category: "production", standardUnit: "kW", description: "Potencia activa AC" },
  { fieldId: "reactive_power", label: "Potencia reactiva", family: "power", electricalSide: "ac", category: "quality", standardUnit: "kVAr", description: "Potencia reactiva AC" },
  { fieldId: "dc_power", label: "Potencia DC", family: "power", electricalSide: "dc", category: "production", standardUnit: "kW", description: "Potencia total DC" },
  { fieldId: "dc_input_power", label: "Potencia FV por canal", family: "power", electricalSide: "dc", category: "production", standardUnit: "kW", description: "Potencia parametrizada por MPPT o entrada FV" },
  { fieldId: "mppt_voltage", label: "Voltaje MPPT", family: "voltage", electricalSide: "dc", category: "electrical", standardUnit: "V", description: "Voltaje por MPPT o entrada FV" },
  { fieldId: "mppt_current", label: "Corriente MPPT", family: "current", electricalSide: "dc", category: "electrical", standardUnit: "A", description: "Corriente por MPPT o entrada FV" },
  { fieldId: "voltage_max", label: "Voltaje maximo", family: "voltage", category: "limit", standardUnit: "V", description: "Voltaje maximo reportado por el equipo" },
  { fieldId: "voltage_min", label: "Voltaje minimo", family: "voltage", category: "limit", standardUnit: "V", description: "Voltaje minimo reportado por el equipo" },
  { fieldId: "power_max", label: "Potencia maxima", family: "power", category: "limit", standardUnit: "kW", description: "Potencia maxima reportada por el equipo" },
  { fieldId: "ac_line_voltage", label: "Voltaje AC linea-linea", family: "voltage", electricalSide: "ac", category: "quality", standardUnit: "V", description: "Voltaje entre fases" },
  { fieldId: "ac_phase_voltage", label: "Voltaje AC fase-neutro", family: "voltage", electricalSide: "ac", category: "quality", standardUnit: "V", description: "Voltaje de fase a neutro" },
  { fieldId: "ac_phase_current", label: "Corriente AC por fase", family: "current", electricalSide: "ac", category: "quality", standardUnit: "A", description: "Corriente por fase" },
  { fieldId: "frequency", label: "Frecuencia", family: "power_quality", electricalSide: "ac", category: "quality", standardUnit: "Hz", description: "Frecuencia de red" },
  { fieldId: "power_factor", label: "Factor de potencia", family: "power_quality", electricalSide: "ac", category: "quality", description: "Factor de potencia" },
  { fieldId: "inverter_temperature", label: "Temperatura del inversor", family: "environment", category: "thermal", standardUnit: "C", description: "Temperatura interna del inversor" },
  { fieldId: "irradiance", label: "Irradiancia", family: "environment", category: "weather", standardUnit: "W/m2", description: "Irradiancia en plano o sensor" },
  { fieldId: "operating_hours", label: "Horas de operacion", family: "operation", category: "operation", standardUnit: "h", description: "Tiempo acumulado de operacion" },
  { fieldId: "alarm_code", label: "Codigo de alarma", family: "operation", category: "events", description: "Codigo de alarma" },
  { fieldId: "warning_code", label: "Codigo de advertencia", family: "operation", category: "events", description: "Codigo de advertencia" },
  { fieldId: "fault_code", label: "Codigo de falla", family: "operation", category: "events", description: "Codigo de falla" },
];

export function getFieldDefinition(fieldId: string) {
  return fieldDefinitions.find((field) => field.fieldId === fieldId);
}
