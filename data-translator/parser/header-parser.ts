export function normalizeSemanticHeader(header: string) {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function compactHeader(header: string) {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function extractUnit(header: string) {
  return header.match(/\(([^)]+)\)/)?.[1]?.trim() ?? "";
}

export function normalizePhase(phase: string) {
  const value = phase.toUpperCase();
  if (value === "A") return "R";
  if (value === "B") return "S";
  if (value === "C") return "T";
  if (value === "L1") return "R";
  if (value === "L2") return "S";
  if (value === "L3") return "T";
  return value;
}

export function transformForUnit(sourceUnit: string, standardUnit?: string) {
  const source = sourceUnit.toLowerCase();
  const target = standardUnit?.toLowerCase();
  if (source === "w" && target === "kw") return "wToKw";
  if (source === "var" && target === "kvar") return "varToKvar";
  if (source === "wh" && target === "kwh") return "whToKwh";
  if (source === "%" || source === "percent") return "percentToDecimal";
  if (!sourceUnit) return "none";
  return "number";
}
