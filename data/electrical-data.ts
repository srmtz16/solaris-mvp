import { installations } from "@/data/mock-data";
import type { DetectedPattern, ElectricalDataPoint, Inverter, MpptId } from "@/types/solaris";

const mppts: MpptId[] = ["MPPT 1", "MPPT 2", "MPPT 3", "MPPT 4"];

const inverterCountsByPlant: Record<string, number> = {
  "hotel-costa-azul": 3,
  "hospital-san-gabriel": 3,
  "universidad-mayab": 4,
  "plaza-comercial": 3,
  "planta-industrial": 5,
  "agroparque-solar": 4,
  "corporativo-santa-fe": 2,
  "techo-industrial-bajio": 3,
  "resort-punta-luna": 3,
  "logistica-centro": 4,
};

export const inverters: Inverter[] = installations.flatMap((plant) => {
  const count = inverterCountsByPlant[plant.id] ?? 3;
  const basePower = plant.capacityKw / count;

  return Array.from({ length: count }, (_, index) => ({
    id: `${plant.id}-inv-${index + 1}`,
    plantId: plant.id,
    name: `INV-${String(index + 1).padStart(2, "0")}`,
    model: `${plant.inverterBrand} ${Math.round(basePower)}KTL`,
    nominalPowerKw: Math.round(basePower),
    mppts,
  }));
});

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function solarShape(hour: number) {
  if (hour < 6 || hour > 19) {
    return 0;
  }

  return Math.sin(((hour - 6) / 13) * Math.PI);
}

function cloudFactor(slot: number, inverterIndex: number) {
  const softVariation = 0.04 * Math.sin(slot / 3 + inverterIndex);
  const shortCloud = slot >= 49 && slot <= 52 ? -0.16 : 0;
  const lateCloud = slot >= 62 && slot <= 65 ? -0.08 : 0;
  return Math.max(0.68, 1 + softVariation + shortCloud + lateCloud);
}

export const electricalData: ElectricalDataPoint[] = inverters.flatMap((inverter, inverterIndex) =>
  Array.from({ length: 96 }, (_, slot) => {
    const hour = slot / 4;
    const timestamp = new Date(Date.UTC(2026, 6, 10, 0, slot * 15)).toISOString();
    const sun = solarShape(hour);
    const irradianceWm2 = round(Math.max(0, sun * 1010 * cloudFactor(slot, inverterIndex)), 0);
    const clipping = sun > 0.92 ? 0.95 : 1;
    const communicationDrop = inverter.plantId === "planta-industrial" && inverter.name === "INV-02" && slot >= 58 && slot <= 60 ? 0.18 : 1;
    const mppt2Loss = inverter.name === "INV-01" && slot >= 38 && slot <= 58 ? 0.82 : 1;
    const capacityFactor = Math.min(0.98, (irradianceWm2 / 1000) * clipping * communicationDrop);
    const activePowerKw = round(inverter.nominalPowerKw * capacityFactor * (0.96 + 0.02 * Math.sin(inverterIndex)), 2);
    const powerFactor = activePowerKw > 0 ? round(0.965 + 0.015 * Math.sin(hour / 2), 3) : 0;
    const reactivePowerKvar = round(activePowerKw * Math.tan(Math.acos(Math.max(powerFactor, 0.1))), 2);
    const voltageDc = activePowerKw > 0 ? round(705 + 18 * Math.sin(hour / 2) + inverterIndex * 2, 1) : 0;
    const powerDc = round(activePowerKw / 0.975, 2);
    const currentDc = voltageDc > 0 ? round((powerDc * 1000) / voltageDc, 1) : 0;
    const acBase = activePowerKw > 0 ? 229 + 4 * Math.sin(hour / 3) : 0;
    const currentBase = activePowerKw > 0 ? (activePowerKw * 1000) / (3 * Math.max(acBase, 1) * Math.max(powerFactor, 0.1)) : 0;
    const phaseUnbalance = inverter.plantId === "hospital-san-gabriel" && slot >= 44 && slot <= 56 ? 1.12 : 1;
    const mpptPowerBase = powerDc / inverter.mppts.length;

    return {
      timestamp,
      inverterId: inverter.id,
      plantId: inverter.plantId,
      voltageDc,
      currentDc,
      powerDc,
      voltageAcL1: activePowerKw > 0 ? round(acBase + 1.8, 1) : 0,
      voltageAcL2: activePowerKw > 0 ? round(acBase - 0.7, 1) : 0,
      voltageAcL3: activePowerKw > 0 ? round(acBase + (slot >= 46 && slot <= 54 ? 7.5 : 0.4), 1) : 0,
      currentAcL1: round(currentBase * phaseUnbalance, 1),
      currentAcL2: round(currentBase * 0.97, 1),
      currentAcL3: round(currentBase * 1.01, 1),
      activePowerKw,
      reactivePowerKvar,
      frequencyHz: activePowerKw > 0 ? round(60 + 0.04 * Math.sin(slot / 5), 2) : 0,
      powerFactor,
      irradianceWm2,
      inverterTemperatureC: activePowerKw > 0 ? round(31 + sun * 27 + inverterIndex * 0.8, 1) : round(26 + 2 * Math.sin(hour), 1),
      mpptValues: inverter.mppts.map((mpptId, mpptIndex) => {
        const anomalyFactor = mpptId === "MPPT 2" ? mppt2Loss : 1;
        const mpptPower = round(mpptPowerBase * anomalyFactor * (0.98 + mpptIndex * 0.012), 2);
        const mpptVoltage = activePowerKw > 0 ? round(voltageDc + (mpptIndex - 1.5) * 4, 1) : 0;
        return {
          mpptId,
          voltageDc: mpptVoltage,
          currentDc: mpptVoltage > 0 ? round((mpptPower * 1000) / mpptVoltage, 1) : 0,
          powerDc: mpptPower,
        };
      }),
    };
  }),
);

export const detectedPatterns: DetectedPattern[] = [
  {
    id: "afternoon-drop",
    severity: "warning",
    affectedEquipment: "Hotel Costa Azul · INV-01",
    detectedPeriod: "14:10 - 14:40",
    description: "Caida recurrente de potencia durante una ventana corta de alta irradiancia.",
    recommendation: "Revisar sombreado temporal, ventilacion del inversor y continuidad de comunicacion.",
  },
  {
    id: "mppt-2-low",
    severity: "warning",
    affectedEquipment: "INV-01 · MPPT 2",
    detectedPeriod: "09:30 - 14:30",
    description: "Corriente de MPPT 2 un 18% inferior al promedio de entradas equivalentes.",
    recommendation: "Inspeccionar strings asociados, conectores MC4 y suciedad localizada en modulos.",
  },
  {
    id: "phase-unbalance",
    severity: "critical",
    affectedEquipment: "Hospital San Gabriel · Fases AC",
    detectedPeriod: "11:00 - 14:00",
    description: "Desbalance de corriente entre fases superior al 10%.",
    recommendation: "Validar cargas aguas abajo, apriete de terminales y medicion del tablero AC.",
  },
  {
    id: "high-ac-voltage",
    severity: "warning",
    affectedEquipment: "Red AC · L3",
    detectedPeriod: "11:30 - 13:30",
    description: "Voltaje AC cercano al limite superior operativo.",
    recommendation: "Revisar tap del transformador y configuracion de protecciones de sobretension.",
  },
  {
    id: "clipping",
    severity: "normal",
    affectedEquipment: "Universidad Mayab · Portafolio DC",
    detectedPeriod: "12:00 - 13:15",
    description: "Posible clipping durante horas de maxima irradiancia.",
    recommendation: "Comparar potencia DC contra potencia AC y validar si el recorte es esperado por diseno.",
  },
  {
    id: "communication-loss",
    severity: "critical",
    affectedEquipment: "Planta Industrial · INV-02",
    detectedPeriod: "14:30 - 15:00",
    description: "Perdida intermitente de comunicacion con reduccion abrupta de muestras validas.",
    recommendation: "Revisar gateway, cableado de red y energia auxiliar del inversor.",
  },
];
