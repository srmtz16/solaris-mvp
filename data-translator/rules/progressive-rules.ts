import type {
  ManualMappingDraft,
  ParameterizedRule,
  RelatedFamilySuggestion,
  RulePreviewMatch,
  RuleProposal,
  RuleScope,
  SemanticVariable,
  TranslatorAuditEntry,
} from "@/types/data-translator";
import { getFieldDefinition } from "@/data-translator/ontology/fields";
import { priorityForField } from "@/data-translator/ontology/priorities";
import { usesForField } from "@/data-translator/ontology/uses";
import { extractUnit, normalizeSemanticHeader } from "@/data-translator/parser/header-parser";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function labelForField(fieldId: string) {
  return getFieldDefinition(fieldId)?.label ?? fieldId;
}

function cloneDraft(mapping: ManualMappingDraft): ManualMappingDraft {
  return { ...mapping, semantic: { ...mapping.semantic, uses: [...mapping.semantic.uses], inferenceReasons: [...(mapping.semantic.inferenceReasons ?? [])] } };
}

function semanticFromRule(sourceHeader: string, rule: ParameterizedRule, index: number, confidence: number): SemanticVariable {
  const definition = getFieldDefinition(rule.targetField);
  return {
    sourceHeader,
    normalizedHeader: normalizeSemanticHeader(sourceHeader),
    displayName: definition?.label ?? rule.name,
    fieldId: rule.targetField,
    family: rule.family,
    category: definition?.category,
    electricalSide: rule.electricalSide,
    entity: rule.entity,
    measurementType: rule.measurementType,
    index,
    sourceUnit: rule.detectedUnit,
    standardUnit: rule.standardUnit,
    transform: rule.conversion,
    priority: rule.importance,
    confidence,
    required: priorityForField(rule.targetField) === "critical",
    uses: usesForField(rule.targetField),
    description: definition?.description ?? `Variable reconocida por regla ${rule.displayPattern}.`,
    patternId: rule.id,
    status: "auto_detected",
    inferenceReasons: ["Regla parametrizada validada", `Indice extraido: ${index}`],
  };
}

export function proposeParameterizedRule({
  mapping,
  mappingIndex,
  mappings,
  manufacturer,
  model,
  scope,
}: {
  mapping: ManualMappingDraft;
  mappingIndex: number;
  mappings: ManualMappingDraft[];
  manufacturer: string;
  model?: string;
  scope: RuleScope;
}): RuleProposal | null {
  const header = mapping.sourceHeader.trim();
  const unit = extractUnit(header) || mapping.semantic.sourceUnit || "";
  const compactUnit = unit ? `\\s*\\(${escapeRegex(unit)}\\)$` : "$";
  const headerWithoutUnit = unit ? header.replace(/\s*\([^)]*\)\s*$/, "") : header;
  const match = headerWithoutUnit.match(/^([A-Za-z]+)_?(\d+)(.*)$/);
  if (!match) return null;

  const [, prefix, , suffix] = match;
  const sourcePattern = `^${escapeRegex(prefix)}_?(\\d+)${escapeRegex(suffix)}${compactUnit}`;
  const displayPattern = `${prefix}{indice}${suffix}${unit ? `(${unit})` : ""}`;
  const createdAt = nowIso();
  const rule: ParameterizedRule = {
    id: uid("rule"),
    name: `${mapping.semantic.displayName} numerado`,
    manufacturer,
    modelScope: scope === "manufacturer_model" ? model ?? null : null,
    sourcePattern,
    displayPattern,
    targetField: mapping.semantic.fieldId,
    family: mapping.semantic.family,
    electricalSide: mapping.semantic.electricalSide,
    entity: mapping.semantic.entity,
    indexCaptureGroup: 1,
    detectedUnit: unit,
    standardUnit: mapping.semantic.standardUnit ?? unit,
    conversion: mapping.semantic.transform,
    importance: mapping.semantic.priority,
    measurementType: mapping.semantic.measurementType,
    status: "validated",
    scope,
    createdBy: "user",
    createdAt,
    updatedAt: createdAt,
  };
  const matches = previewRuleMatches(rule, mappings, false);
  const conflicts = matches.filter((item) => item.action === "conflict");
  return {
    baseMappingIndex: mappingIndex,
    baseHeader: mapping.sourceHeader,
    rule,
    confidence: matches.length > 1 ? 0.93 : 0.72,
    copiedConfiguration: mapping.semantic,
    matches,
    relatedSuggestions: suggestRelatedFamilies(rule, mappings),
    conflicts,
  };
}

export function previewRuleMatches(rule: ParameterizedRule, mappings: ManualMappingDraft[], allowOverwriteConfirmed: boolean): RulePreviewMatch[] {
  const regex = new RegExp(rule.sourcePattern, "i");
  return mappings.flatMap((mapping, mappingIndex) => {
    const match = mapping.sourceHeader.match(regex);
    const rawIndex = match?.[rule.indexCaptureGroup];
    if (!match || !rawIndex || !/^\d+$/.test(rawIndex)) return [];
    const index = Number(rawIndex);
    const confirmed = mapping.semantic.status === "confirmed";
    const hasHigherPriority = confirmed && mapping.semantic.patternId && mapping.semantic.patternId !== rule.id;
    const action = confirmed && !allowOverwriteConfirmed ? "conflict" : hasHigherPriority ? "conflict" : "apply";
    return [
      {
        mappingIndex,
        sourceHeader: mapping.sourceHeader,
        suggestedField: rule.targetField,
        displayName: labelForField(rule.targetField),
        entity: rule.entity,
        index,
        unit: rule.detectedUnit,
        confidence: action === "conflict" ? 0.66 : 0.94,
        action,
        conflictReason: action === "conflict" ? "Ya esta confirmado o tiene una regla de mayor prioridad." : undefined,
      },
    ];
  });
}

export function applyParameterizedRule({
  mappings,
  rule,
  selectedHeaders,
  allowOverwriteConfirmed,
}: {
  mappings: ManualMappingDraft[];
  rule: ParameterizedRule;
  selectedHeaders?: string[];
  allowOverwriteConfirmed: boolean;
}) {
  const selected = new Set(selectedHeaders);
  const previews = previewRuleMatches(rule, mappings, allowOverwriteConfirmed).filter(
    (match) => match.action === "apply" && (!selectedHeaders || selected.has(match.sourceHeader)),
  );
  const byIndex = new Map(previews.map((preview) => [preview.mappingIndex, preview]));
  const previousValues: ManualMappingDraft[] = [];
  const nextValues: ManualMappingDraft[] = [];
  const nextMappings = mappings.map((mapping, index) => {
    const preview = byIndex.get(index);
    if (!preview) return mapping;
    previousValues.push(cloneDraft(mapping));
    const semantic = semanticFromRule(mapping.sourceHeader, rule, preview.index, preview.confidence);
    const next = {
      ...mapping,
      targetField: semantic.fieldId,
      sourceUnit: semantic.sourceUnit ?? "",
      targetUnit: semantic.standardUnit ?? "",
      transform: semantic.transform,
      required: semantic.required,
      confidence: semantic.confidence,
      semantic,
    };
    nextValues.push(cloneDraft(next));
    return next;
  });
  return { mappings: nextMappings, applied: previews, previousValues, nextValues };
}

export function rescanWithRules(mappings: ManualMappingDraft[], rules: ParameterizedRule[]) {
  return rules.reduce((current, rule) => applyParameterizedRule({ mappings: current, rule, allowOverwriteConfirmed: false }).mappings, mappings);
}

export function createAuditEntry({
  action,
  baseHeader,
  rule,
  previousValues,
  nextValues,
}: {
  action: TranslatorAuditEntry["action"];
  baseHeader: string;
  rule?: ParameterizedRule;
  previousValues: ManualMappingDraft[];
  nextValues: ManualMappingDraft[];
}): TranslatorAuditEntry {
  return {
    id: uid("audit"),
    action,
    baseHeader,
    ruleId: rule?.id,
    ruleScope: rule?.scope,
    confirmedBy: "usuario-mvp",
    affectedHeaders: nextValues.map((mapping) => mapping.sourceHeader),
    previousValues,
    nextValues,
    createdAt: nowIso(),
  };
}

function relatedRule(baseRule: ParameterizedRule, prefix: string, unit: string, targetField: string, label: string): RelatedFamilySuggestion {
  const definition = getFieldDefinition(targetField);
  return {
    id: `${baseRule.id}-${prefix.toLowerCase()}`,
    label,
    sourcePattern: `^${prefix}_?(\\d+)\\s*\\(${unit}\\)$`,
    displayPattern: `${prefix}{indice}(${unit})`,
    targetField,
    family: definition?.family ?? "unknown",
    electricalSide: definition?.electricalSide,
    entity: "mppt",
    standardUnit: definition?.standardUnit ?? unit,
    conversion: unit.toLowerCase() === "w" ? "wToKw" : "number",
    matches: [],
  };
}

export function suggestRelatedFamilies(rule: ParameterizedRule, mappings: ManualMappingDraft[]): RelatedFamilySuggestion[] {
  if (rule.targetField !== "mppt_voltage" && rule.targetField !== "mppt_current" && rule.targetField !== "dc_input_power") return [];
  const suggestions = [
    relatedRule(rule, "Ipv", "A", "mppt_current", "Corriente MPPT numerada"),
    relatedRule(rule, "Ppv", "W", "dc_input_power", "Potencia MPPT numerada"),
  ];
  return suggestions
    .map((suggestion) => {
      const previewRule: ParameterizedRule = {
        ...rule,
        id: suggestion.id,
        name: suggestion.label,
        sourcePattern: suggestion.sourcePattern,
        displayPattern: suggestion.displayPattern,
        targetField: suggestion.targetField,
        family: suggestion.family,
        electricalSide: suggestion.electricalSide,
        entity: suggestion.entity,
        detectedUnit: suggestion.standardUnit === "kW" ? "W" : suggestion.standardUnit,
        standardUnit: suggestion.standardUnit,
        conversion: suggestion.conversion,
        status: "suggested",
      };
      return { ...suggestion, matches: previewRuleMatches(previewRule, mappings, false) };
    })
    .filter((suggestion) => suggestion.matches.length);
}
