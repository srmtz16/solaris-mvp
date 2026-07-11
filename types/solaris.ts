export type InstallationStatus = "normal" | "warning" | "critical";

export type Installation = {
  id: string;
  name: string;
  client: string;
  location: string;
  capacityKw: number;
  inverterBrand: string;
  status: InstallationStatus;
  currentPowerKw: number;
  dailyGenerationMwh: number;
  monthlyGenerationMwh: number;
  performanceRatio: number;
  availability: number;
  lastUpdate: string;
  alerts: string[];
  equipment: string[];
};

export type Client = {
  name: string;
  installations: number;
  totalCapacityKw: number;
  monthlyGenerationMwh: number;
  savingsMxn: number;
  alerts: number;
};

export type ChartPoint = {
  label: string;
  generation: number;
  irradiation?: number;
};

export type ElectricalSide = "dc" | "ac";

export type ElectricalViewMode = "plant" | "inverter" | "compare";

export type ElectricalMetric = "voltage" | "current" | "power";

export type Phase = "L1" | "L2" | "L3";

export type MpptId = "MPPT 1" | "MPPT 2" | "MPPT 3" | "MPPT 4";

export type Inverter = {
  id: string;
  plantId: string;
  name: string;
  model: string;
  nominalPowerKw: number;
  mppts: MpptId[];
};

export type MpptElectricalValue = {
  mpptId: MpptId;
  voltageDc: number;
  currentDc: number;
  powerDc: number;
};

export type ElectricalDataPoint = {
  timestamp: string;
  inverterId: string;
  plantId: string;
  voltageDc: number;
  currentDc: number;
  powerDc: number;
  voltageAcL1: number;
  voltageAcL2: number;
  voltageAcL3: number;
  currentAcL1: number;
  currentAcL2: number;
  currentAcL3: number;
  activePowerKw: number;
  reactivePowerKvar: number;
  frequencyHz: number;
  powerFactor: number;
  irradianceWm2: number;
  inverterTemperatureC: number;
  mpptValues: MpptElectricalValue[];
};

export type DetectedPattern = {
  id: string;
  severity: InstallationStatus;
  affectedEquipment: string;
  detectedPeriod: string;
  description: string;
  recommendation: string;
};
