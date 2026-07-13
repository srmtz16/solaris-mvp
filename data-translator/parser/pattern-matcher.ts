import type { SemanticVariable } from "@/types/data-translator";
import { matchCurrentPattern } from "@/data-translator/patterns/current-patterns";
import { matchEnergyPattern } from "@/data-translator/patterns/energy-patterns";
import { matchEnvironmentalPattern } from "@/data-translator/patterns/environmental-patterns";
import { matchOperationPattern } from "@/data-translator/patterns/operation-patterns";
import { matchPowerPattern } from "@/data-translator/patterns/power-patterns";
import { matchVoltagePattern } from "@/data-translator/patterns/voltage-patterns";

const matchers = [matchEnergyPattern, matchPowerPattern, matchVoltagePattern, matchCurrentPattern, matchEnvironmentalPattern, matchOperationPattern];

export function matchSemanticPattern(sourceHeader: string): SemanticVariable | null {
  for (const matcher of matchers) {
    const match = matcher(sourceHeader);
    if (match) return match;
  }
  return null;
}
