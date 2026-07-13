import type { SemanticFamily } from "@/types/data-translator";

export const familyLabels: Record<SemanticFamily, string> = {
  identification: "Identificacion",
  energy: "Energia",
  power: "Potencia",
  voltage: "Voltaje",
  current: "Corriente",
  power_quality: "Calidad electrica",
  environment: "Temperatura y ambiente",
  operation: "Operacion",
  unknown: "Sin clasificar",
};

export const familyOptions = Object.entries(familyLabels).map(([value, label]) => ({ value, label }));
