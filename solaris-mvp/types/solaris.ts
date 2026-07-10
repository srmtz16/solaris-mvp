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
