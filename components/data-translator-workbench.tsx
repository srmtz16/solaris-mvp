"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Download, FileJson, FileSpreadsheet, FileUp, Library, RefreshCw, Save, ShieldCheck, Undo2, Upload, Wand2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTranslatorExplorer } from "@/components/data-translator-explorer";
import {
  applyTemplate,
  buildFormatSignature,
  buildSheetPreview,
  compareRawProcessedColumns,
  createTemplateFromMappings,
  detectWorkbookMetadata,
  downloadJson,
  inferFileType,
  rankTemplates,
  transformLabels,
  transformOptions,
} from "@/lib/data-translator";
import { cn } from "@/lib/utils";
import { detailForSemantic, semanticFromField } from "@/data-translator/parser/semantic-classifier";
import { familyLabels, familyOptions } from "@/data-translator/ontology/families";
import { fieldDefinitions } from "@/data-translator/ontology/fields";
import { priorityLabels, statusLabels } from "@/data-translator/ontology/priorities";
import { applyParameterizedRule, createAuditEntry, proposeParameterizedRule, rescanWithRules } from "@/data-translator/rules/progressive-rules";
import type {
  FileType,
  ManualMappingDraft,
  ParameterizedRule,
  RawProcessedColumnMatch,
  RuleProposal,
  RuleScope,
  SheetPreview,
  TemplateMatch,
  TemplateScope,
  TranslatorAuditEntry,
  TranslatorTemplate,
} from "@/types/data-translator";

const scopeLabels: Record<TemplateScope, string> = {
  official: "Oficial SOLARIS",
  private: "Privada de empresa",
  custom: "Personalizada para este archivo",
};

const scopeStyles: Record<TemplateScope, string> = {
  official: "bg-blue-50 text-blue-700",
  private: "bg-slate-100 text-slate-700",
  custom: "bg-yellow-50 text-yellow-700",
};

const dataFileAccept =
  ".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type ParsedWorkbook = {
  fileName: string;
  fileType: FileType;
  sheetNames: string[];
  sheets: SheetPreview[];
};

type SheetRole = "RAW" | "PROCESSED" | "ANALYSIS" | "UNKNOWN";

type TranslatorTab = "summary" | "sheets" | "raw" | "solaris" | "mapping" | "explore" | "template";

const tabLabels: Record<TranslatorTab, string> = {
  summary: "Resumen",
  sheets: "Hojas",
  raw: "Variables RAW",
  solaris: "Variables SOLARIS",
  mapping: "Mapeo",
  explore: "Explorar datos",
  template: "Plantilla",
};

function inferSheetRole(sheetName: string): SheetRole {
  const name = sheetName.toLowerCase();
  if (name.includes("analisis") || name.includes("anÃ¡lisis")) return "ANALYSIS";
  if (name.includes("(2)") || name.includes("processed") || name.includes("proces") || name.includes("clean") || name.includes("limp")) return "PROCESSED";
  if (name.includes("raw") || name.includes("historical data")) return "RAW";
  return "UNKNOWN";
}

function parseRowsFromSheet(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, blankrows: false });
}

async function parseFile(file: File): Promise<ParsedWorkbook> {
  const fileType = inferFileType(file.name);
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheets = workbook.SheetNames.map((name) => buildSheetPreview(name, parseRowsFromSheet(workbook.Sheets[name])));

  return {
    fileName: file.name,
    fileType,
    sheetNames: workbook.SheetNames,
    sheets,
  };
}

function TemplateCard({
  match,
  selected,
  onSelect,
}: {
  match: TemplateMatch;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border p-4 text-left transition-colors",
        selected ? "border-blue-600 bg-blue-50" : "border-border bg-card hover:bg-muted/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{match.template.name}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {match.template.manufacturer} · {match.template.model} · {match.template.fileType.toUpperCase()}
          </div>
        </div>
        <span className="text-2xl font-semibold text-blue-700">{match.score}%</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={cn("rounded-md px-2 py-1 text-xs font-medium", scopeStyles[match.template.scope ?? "official"])}>
          {scopeLabels[match.template.scope ?? "official"]}
        </span>
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {match.matchedHeaders}/{match.totalTemplateHeaders} headers
        </span>
      </div>
    </button>
  );
}

function FieldInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-blue-500"
      />
    </label>
  );
}

export function DataTranslatorWorkbench({ officialTemplates }: { officialTemplates: TranslatorTemplate[] }) {
  const dataInputRef = useRef<HTMLInputElement | null>(null);
  const processedInputRef = useRef<HTMLInputElement | null>(null);
  const templateInputRef = useRef<HTMLInputElement | null>(null);
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [processedWorkbook, setProcessedWorkbook] = useState<ParsedWorkbook | null>(null);
  const [activeSheetName, setActiveSheetName] = useState("");
  const [processedSheetName, setProcessedSheetName] = useState("");
  const [templates, setTemplates] = useState<TranslatorTemplate[]>(officialTemplates);
  const [matches, setMatches] = useState<TemplateMatch[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(officialTemplates[0]?.templateId ?? "");
  const [mappings, setMappings] = useState<ManualMappingDraft[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("Plantilla corregida");
  const [manufacturer, setManufacturer] = useState("Huawei");
  const [model, setModel] = useState("Modelo demo");
  const [exportType, setExportType] = useState("Exportacion de inversores");
  const [version, setVersion] = useState("1.0.0");
  const [scope, setScope] = useState<TemplateScope>("custom");
  const [fileError, setFileError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [advancedId, setAdvancedId] = useState("");
  const [activeTab, setActiveTab] = useState<TranslatorTab>("summary");
  const [selectedMappingId, setSelectedMappingId] = useState("");
  const [sheetRoles, setSheetRoles] = useState<Record<string, SheetRole>>({});
  const [rawProcessedMatches, setRawProcessedMatches] = useState<RawProcessedColumnMatch[]>([]);
  const [learnedRules, setLearnedRules] = useState<ParameterizedRule[]>([]);
  const [ruleProposal, setRuleProposal] = useState<RuleProposal | null>(null);
  const [selectedRuleHeaders, setSelectedRuleHeaders] = useState<string[]>([]);
  const [ruleScope, setRuleScope] = useState<RuleScope>("manufacturer");
  const [saveRuleToLibrary, setSaveRuleToLibrary] = useState(true);
  const [overwriteConfirmed, setOverwriteConfirmed] = useState(false);
  const [auditEntries, setAuditEntries] = useState<TranslatorAuditEntry[]>([]);

  const activeSheet = workbook?.sheets.find((sheet) => sheet.name === activeSheetName) ?? workbook?.sheets[0] ?? null;
  const activeProcessedSheet =
    processedWorkbook?.sheets.find((sheet) => sheet.name === processedSheetName) ??
    workbook?.sheets.find((sheet) => sheet.name === processedSheetName) ??
    null;
  const learningSheet = activeProcessedSheet ?? activeSheet;
  const selectedTemplate = templates.find((template) => template.templateId === selectedTemplateId) ?? matches[0]?.template;
  const signature = learningSheet && workbook ? buildFormatSignature([...(workbook?.sheetNames ?? []), ...(processedWorkbook?.sheetNames ?? [])], learningSheet) : "";
  const rawSheet = workbook?.sheets.find((sheet) => sheetRoles[sheet.name] === "RAW") ?? workbook?.sheets.find((sheet) => !/analisis|anÃ¡lisis/i.test(sheet.name)) ?? null;
  const processedSheet =
    activeProcessedSheet ??
    workbook?.sheets.find((sheet) => sheetRoles[sheet.name] === "PROCESSED") ??
    workbook?.sheets.find((sheet) => /historical data \(2\)|processed|proces|clean|limp/i.test(sheet.name)) ??
    activeSheet;
  const analysisSheets = workbook?.sheets.filter((sheet) => sheetRoles[sheet.name] === "ANALYSIS") ?? [];
  const rawCount = rawSheet?.headers.length ?? 0;
  const processedCount = processedSheet?.headers.length ?? mappings.length;
  const selectedCount = mappings.filter((mapping) => mapping.semantic.status !== "ignored" && mapping.semantic.fieldId !== "unassigned").length;
  const conflictCount = mappings.filter((mapping) => mapping.semantic.status === "needs_review" || mapping.semantic.fieldId === "unassigned").length;
  const familyCount = new Set(mappings.map((mapping) => mapping.semantic.family).filter((family) => family !== "unknown")).size;
  const coverage = processedCount ? Math.round((selectedCount / processedCount) * 100) : 0;
  const selectedMapping = mappings.find((mapping) => mapping.id === selectedMappingId) ?? mappings[0] ?? null;
  const detectedMetadata = rawSheet && workbook ? detectWorkbookMetadata({ fileName: workbook.fileName, sheet: rawSheet }) : null;
  const discardedRawColumns = rawProcessedMatches.filter((match) => !match.processedHeader || match.score < 45).length;
  const lowConfidenceMatches = rawProcessedMatches.filter((match) => match.score < 70).length;
  const visualizationWorkbook = useMemo(
    () =>
      workbook
        ? {
            ...workbook,
            sheetNames: [...workbook.sheetNames, ...(processedWorkbook?.sheetNames ?? [])],
            sheets: [...workbook.sheets, ...(processedWorkbook?.sheets ?? [])],
          }
        : null,
    [workbook, processedWorkbook],
  );

  const groupedTemplates = useMemo(
    () =>
      templates.reduce<Record<TemplateScope, TranslatorTemplate[]>>(
        (groups, template) => {
          groups[template.scope ?? "official"].push(template);
          return groups;
        },
        { official: [], private: [], custom: [] },
      ),
    [templates],
  );

  function isSupportedDataFile(file: File) {
    return /\.(csv|xls|xlsx)$/i.test(file.name);
  }

  function learnFromSheets(raw: SheetPreview | null | undefined, processed: SheetPreview | null | undefined, availableTemplates = templates) {
    const sheet = processed ?? raw;
    if (!sheet) return;
    const ranked = rankTemplates(availableTemplates, sheet);
    const best = ranked[0]?.template;
    setMatches(ranked);
    setSelectedTemplateId(best?.templateId ?? "");
    setMappings(best ? rescanWithRules(applyTemplate(best, sheet), learnedRules) : []);
    setRawProcessedMatches(raw && processed ? compareRawProcessedColumns(raw, processed) : []);
  }

  async function handleFile(file: File) {
    if (!isSupportedDataFile(file)) {
      setFileError("Selecciona un archivo de datos .csv, .xls o .xlsx. Los JSON son solo para plantillas guardadas.");
      return;
    }

    setFileError("");
    const parsed = await parseFile(file);
    const sheet = parsed.sheets[0];
    const roles = Object.fromEntries(parsed.sheets.map((item) => [item.name, inferSheetRole(item.name)]));
    const guessedProcessed = parsed.sheets.find((item) => roles[item.name] === "PROCESSED" && item.name !== sheet.name) ?? null;
    setWorkbook(parsed);
    setActiveSheetName(sheet.name);
    setProcessedWorkbook(null);
    setProcessedSheetName(guessedProcessed?.name ?? "");
    setSheetRoles(roles);
    setActiveTab("summary");
    learnFromSheets(sheet, guessedProcessed ?? sheet);
  }

  async function handleProcessedFile(file: File) {
    if (!isSupportedDataFile(file)) {
      setFileError("El archivo procesado debe ser .csv, .xls o .xlsx. El JSON queda reservado para plantillas.");
      return;
    }
    if (!rawSheet) {
      setFileError("Carga primero el archivo RAW para poder comparar contra el archivo procesado.");
      return;
    }
    setFileError("");
    const parsed = await parseFile(file);
    const sheet = parsed.sheets[0];
    setProcessedWorkbook(parsed);
    setProcessedSheetName(sheet.name);
    setSheetRoles((current) => ({ ...current, [sheet.name]: "PROCESSED" }));
    setActiveTab("mapping");
    learnFromSheets(rawSheet, sheet);
  }

  function handleSheetChange(sheetName: string) {
    if (!workbook) return;
    const sheet = workbook.sheets.find((item) => item.name === sheetName);
    if (!sheet) return;
    const ranked = rankTemplates(templates, sheet);
    const best = ranked[0]?.template;
    setActiveSheetName(sheetName);
    setMatches(ranked);
    setSelectedTemplateId(best?.templateId ?? "");
    setMappings(best ? rescanWithRules(applyTemplate(best, sheet), learnedRules) : []);
  }

  function handleProcessedSheetChange(sheetName: string) {
    const sheet = processedWorkbook?.sheets.find((item) => item.name === sheetName) ?? workbook?.sheets.find((item) => item.name === sheetName);
    if (!sheet) return;
    setProcessedSheetName(sheetName);
    setSheetRoles((current) => ({ ...current, [sheetName]: "PROCESSED" }));
    learnFromSheets(rawSheet, sheet);
  }

  function handleTemplateSelect(templateId: string) {
    if (!learningSheet) return;
    const template = templates.find((item) => item.templateId === templateId);
    if (!template) return;
    setSelectedTemplateId(templateId);
    setMappings(rescanWithRules(applyTemplate(template, learningSheet), learnedRules));
  }

  function updateSemantic(index: number, patch: Partial<ManualMappingDraft["semantic"]>) {
    setMappings((current) =>
      current.map((mapping, mappingIndex) => {
        if (mappingIndex !== index) return mapping;
        const semantic = { ...mapping.semantic, ...patch };
        return {
          ...mapping,
          targetField: semantic.fieldId,
          sourceUnit: semantic.sourceUnit ?? "",
          targetUnit: semantic.standardUnit ?? "",
          transform: semantic.transform,
          required: semantic.required,
          confidence: semantic.confidence,
          semantic,
        };
      }),
    );
  }

  function changeField(index: number, fieldId: string) {
    const current = mappings[index];
    const semantic = semanticFromField(current.sourceHeader, fieldId, {
      sourceUnit: current.semantic.sourceUnit,
      targetUnit: current.semantic.standardUnit,
      confidence: Math.max(current.semantic.confidence, 0.78),
      required: current.semantic.required,
    });
    updateSemantic(index, { ...semantic, status: "confirmed" });
  }

  function openRuleProposal(index: number) {
    const updatedMappings = mappings.map((mapping, mappingIndex) =>
      mappingIndex === index ? { ...mapping, semantic: { ...mapping.semantic, status: "confirmed" as const } } : mapping,
    );
    setMappings(updatedMappings);
    const proposal = proposeParameterizedRule({
      mapping: updatedMappings[index],
      mappingIndex: index,
      mappings: updatedMappings,
      manufacturer,
      model,
      scope: ruleScope,
    });

    if (!proposal) {
      setFileError("No se encontro un indice numerico claro para proponer una regla parametrizada.");
      return;
    }

    setFileError("");
    setRuleProposal(proposal);
    setSelectedRuleHeaders(proposal.matches.filter((match) => match.action === "apply").map((match) => match.sourceHeader));
    setAuditEntries((current) => [
      createAuditEntry({
        action: "rule_proposed",
        baseHeader: proposal.baseHeader,
        rule: proposal.rule,
        previousValues: [mappings[index]],
        nextValues: [updatedMappings[index]],
      }),
      ...current,
    ]);
  }

  function applyRuleProposal(headers?: string[]) {
    if (!ruleProposal) return;
    const result = applyParameterizedRule({
      mappings,
      rule: ruleProposal.rule,
      selectedHeaders: headers,
      allowOverwriteConfirmed: overwriteConfirmed,
    });
    const activeRules = saveRuleToLibrary ? [ruleProposal.rule, ...learnedRules] : learnedRules;
    setMappings(rescanWithRules(result.mappings, activeRules));
    if (saveRuleToLibrary) setLearnedRules((current) => [ruleProposal.rule, ...current]);
    setAuditEntries((current) => [
      createAuditEntry({
        action: "batch_apply",
        baseHeader: ruleProposal.baseHeader,
        rule: ruleProposal.rule,
        previousValues: result.previousValues,
        nextValues: result.nextValues,
      }),
      ...current,
    ]);
    setRuleProposal(null);
  }

  function saveOnlyRule() {
    if (!ruleProposal) return;
    setLearnedRules((current) => [ruleProposal.rule, ...current]);
    setAuditEntries((current) => [
      createAuditEntry({
        action: "rule_saved",
        baseHeader: ruleProposal.baseHeader,
        rule: ruleProposal.rule,
        previousValues: [],
        nextValues: [],
      }),
      ...current,
    ]);
    setRuleProposal(null);
  }

  function undoLastBatch() {
    const last = auditEntries.find((entry) => entry.action === "batch_apply");
    if (!last) return;
    const previousByHeader = new Map(last.previousValues.map((mapping) => [mapping.sourceHeader, mapping]));
    setMappings((current) => current.map((mapping) => previousByHeader.get(mapping.sourceHeader) ?? mapping));
    setAuditEntries((current) => [
      createAuditEntry({
        action: "undo",
        baseHeader: last.baseHeader,
        previousValues: last.nextValues,
        nextValues: last.previousValues,
      }),
      ...current,
    ]);
  }

  function saveTemplate() {
    if (!workbook || !learningSheet) return;
    const template = createTemplateFromMappings({
      name: templateName,
      manufacturer,
      model,
      exportType,
      version,
      scope,
      fileType: processedWorkbook?.fileType ?? workbook.fileType,
      sheet: learningSheet,
      sheetNames: [...workbook.sheetNames, ...(processedWorkbook?.sheetNames ?? [])],
      mappings,
      parameterizedRules: learnedRules,
      rawSheet,
      processedSheet,
      metadata: detectedMetadata,
      rawProcessedMatches,
    });
    setTemplates((current) => [template, ...current]);
    setSelectedTemplateId(template.templateId);
    setSaveOpen(false);
    downloadJson(`${template.templateId}.json`, template);
  }

  async function loadTemplateFile(file: File) {
    const text = await file.text();
    const template = JSON.parse(text) as TranslatorTemplate;
    setTemplates((current) => [{ ...template, scope: template.scope ?? "custom" }, ...current]);
    if (template.parameterizedRules?.length) setLearnedRules((current) => [...template.parameterizedRules!, ...current]);
    setSelectedTemplateId(template.templateId);
    if (learningSheet) setMappings(rescanWithRules(applyTemplate(template, learningSheet), [...(template.parameterizedRules ?? []), ...learnedRules]));
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Biblioteca de plantillas</CardTitle>
            <CardDescription>Plantillas oficiales en JSON dentro del repositorio; privadas y personalizadas descargables en el MVP.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {(Object.keys(scopeLabels) as TemplateScope[]).map((templateScope) => (
              <div key={templateScope} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{scopeLabels[templateScope]}</div>
                  <Badge variant={templateScope === "official" ? "default" : "secondary"}>{groupedTemplates[templateScope].length}</Badge>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {groupedTemplates[templateScope].slice(0, 3).map((template) => (
                    <div key={template.templateId} className="rounded-md bg-muted/50 p-2 text-sm">
                      {template.name}
                    </div>
                  ))}
                  {!groupedTemplates[templateScope].length ? <div className="text-sm text-muted-foreground">Sin plantillas cargadas.</div> : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entrada</CardTitle>
            <CardDescription>Primero carga RAW y luego el archivo u hoja procesada. El JSON es solo para plantillas guardadas.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div
              className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-blue-300 bg-blue-50/60 p-4 text-center transition-colors hover:bg-blue-50"
              role="button"
              tabIndex={0}
              onClick={() => dataInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") dataInputRef.current?.click();
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.currentTarget.classList.add("border-blue-600");
              }}
              onDragLeave={(event) => {
                event.currentTarget.classList.remove("border-blue-600");
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.currentTarget.classList.remove("border-blue-600");
                const file = event.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
            >
              <FileSpreadsheet className="size-9 text-blue-600" />
              <span className="text-sm font-semibold">1. Archivo RAW XLS, XLSX o CSV</span>
              <span className="text-xs text-muted-foreground">Exportacion original del fabricante o inversor, sin limpiar.</span>
              <Button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  dataInputRef.current?.click();
                }}
              >
                <FileUp className="size-4" />
                Seleccionar XLS/XLSX/CSV
              </Button>
            </div>
            <input
              ref={dataInputRef}
              type="file"
              accept={dataFileAccept}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.currentTarget.value = "";
              }}
            />
            <div
              className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center transition-colors hover:bg-muted/50"
              role="button"
              tabIndex={0}
              onClick={() => processedInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") processedInputRef.current?.click();
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                if (file) void handleProcessedFile(file);
              }}
            >
              <RefreshCw className="size-7 text-primary" />
              <span className="text-sm font-semibold">2. Archivo procesado normalizado</span>
              <span className="text-xs text-muted-foreground">Opcional si el mismo XLS ya contiene una hoja limpia.</span>
              <Button
                type="button"
                variant="outline"
                disabled={!workbook}
                onClick={(event) => {
                  event.stopPropagation();
                  processedInputRef.current?.click();
                }}
              >
                <FileUp className="size-4" />
                Seleccionar procesado
              </Button>
            </div>
            <input
              ref={processedInputRef}
              type="file"
              accept={dataFileAccept}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleProcessedFile(file);
                event.currentTarget.value = "";
              }}
            />
            {workbook && workbook.sheets.length > 1 ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Usar hoja procesada del mismo archivo
                <select
                  value={processedSheetName}
                  onChange={(event) => handleProcessedSheetChange(event.target.value)}
                  className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground"
                >
                  <option value="">Sin hoja procesada separada</option>
                  {workbook.sheets.map((sheet) => (
                    <option key={sheet.name} value={sheet.name}>{sheet.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {fileError ? (
              <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 size-4" />
                {fileError}
              </div>
            ) : null}
            {workbook ? (
              <div className="rounded-md border border-green-100 bg-green-50 p-3 text-sm text-green-700">
                RAW cargado: <span className="font-semibold">{workbook.fileName}</span>
              </div>
            ) : null}
            {processedWorkbook ? (
              <div className="rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                Procesado cargado: <span className="font-semibold">{processedWorkbook.fileName}</span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => templateInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Upload className="size-4" />
              Cargar plantilla JSON guardada (opcional)
            </button>
            <input
              ref={templateInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadTemplateFile(file);
                event.currentTarget.value = "";
              }}
            />
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {(["Cargar RAW", "Metadatos", "Cargar procesado", "Comparar columnas", "Validar mapeos", "Visualizar", "Guardar"] as const).map((label, index) => {
            const complete =
              index === 0 ? Boolean(workbook) :
              index === 1 ? Boolean(detectedMetadata) :
              index === 2 ? Boolean(processedSheet && processedSheet !== rawSheet) :
              index === 3 ? rawProcessedMatches.length > 0 :
              index === 4 ? mappings.length > 0 && conflictCount === 0 :
              index === 5 ? Boolean(workbook) :
              templates.length > officialTemplates.length;
            const current = !workbook ? index === 0 : !rawProcessedMatches.length ? index === 2 : conflictCount ? index === 4 : index === 5;
            const Icon = complete ? CheckCircle2 : Circle;
            return (
              <div key={label} className={`flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium ${current ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{index + 1}. {label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <nav className="flex min-w-0 gap-2 overflow-x-auto rounded-lg border border-border bg-card p-2">
        {(Object.keys(tabLabels) as TranslatorTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            disabled={!workbook && tab !== "summary" && tab !== "template"}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </nav>

      {activeTab === "summary" ? (
        <section className="grid min-w-0 gap-4 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Resumen del aprendizaje</CardTitle>
              <CardDescription>Distingue universo RAW, subconjunto SOLARIS y cobertura del mapping.</CardDescription>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Variables RAW", rawCount],
                ["Variables SOLARIS", processedCount],
                ["Seleccionadas", selectedCount],
                ["No seleccionadas", Math.max(rawCount - selectedCount, 0)],
                ["Conflictos", conflictCount],
                ["Familias", familyCount],
                ["Hojas de análisis", analysisSheets.length],
                ["Emparejadas RAW", rawProcessedMatches.filter((match) => match.processedHeader).length],
                ["Descartadas RAW", discardedRawColumns],
                ["Baja confianza", lowConfidenceMatches],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="text-xs font-medium text-muted-foreground">{label}</div>
                  <div className="mt-2 text-2xl font-semibold">{value}</div>
                </div>
              ))}
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                  <span>{selectedCount} de {processedCount} variables procesadas tienen origen o clasificación SOLARIS.</span>
                  <span className="font-semibold">{coverage}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${coverage}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{selectedCount} de {rawCount} variables RAW fueron seleccionadas para SOLARIS. Una RAW no seleccionada no es invalida: puede haber sido descartada al limpiar el archivo.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadatos detectados</CardTitle>
              <CardDescription>Naturaleza del RAW inferida desde archivo, hojas, encabezados y primeras filas.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {detectedMetadata ? (
                [
                  ["Marca", detectedMetadata.manufacturer ?? "No detectada"],
                  ["Modelo", detectedMetadata.model ?? "No detectado"],
                  ["Potencia nominal", detectedMetadata.powerCapacityKw ? `${detectedMetadata.powerCapacityKw} kW` : "No detectada"],
                  ["Inversor", detectedMetadata.inverter ?? "No detectado"],
                  ["Periodo", detectedMetadata.period ?? "No detectado"],
                  ["Zona horaria", detectedMetadata.timezone ?? "America/Mexico_City (supuesto MVP)"],
                  ["Tipo exportacion", detectedMetadata.exportType ?? "No detectado"],
                  ["Estructura", detectedMetadata.columnStructure],
                ].map(([label, value]) => (
                  <div key={label} className="flex min-w-0 justify-between gap-3 rounded-md border border-border p-3 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="min-w-0 text-right font-medium">{value}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">Carga un archivo RAW para iniciar.</div>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeTab === "sheets" && workbook ? (
        <Card>
          <CardHeader>
            <CardTitle>Clasificación de hojas</CardTitle>
            <CardDescription>Corrige RAW, PROCESSED, ANALYSIS o UNKNOWN sin modificar el archivo original.</CardDescription>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-3 md:grid-cols-2">
            {workbook.sheets.map((sheet) => (
              <div key={sheet.name} className="rounded-lg border border-border p-4">
                <div className="font-medium">{sheet.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{sheet.headers.length} columnas · fila encabezado {sheet.headerRow + 1}</div>
                <select
                  value={sheetRoles[sheet.name] ?? "UNKNOWN"}
                  onChange={(event) => setSheetRoles((current) => ({ ...current, [sheet.name]: event.target.value as SheetRole }))}
                  className="mt-3 h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
                >
                  <option value="RAW">RAW</option>
                  <option value="PROCESSED">PROCESSED</option>
                  <option value="ANALYSIS">ANALYSIS</option>
                  <option value="UNKNOWN">UNKNOWN</option>
                </select>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "raw" && rawSheet ? (
        <Card>
          <CardHeader>
            <CardTitle>Catálogo RAW</CardTitle>
            <CardDescription>Universo completo de encabezados detectados; no todas las variables tienen que usarse en SOLARIS.</CardDescription>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rawSheet.headers.map((header, index) => (
              <div key={`${header}-${index}`} className="rounded-md border border-border p-3 text-sm">
                <div className="font-medium">{header}</div>
                <div className="mt-1 text-xs text-muted-foreground">Unidad: {rawSheet.columnProfiles?.[index]?.detectedUnit || "-"} · {rawSheet.columnProfiles?.[index]?.detectedTypes.join(", ") || "sin perfil"}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "solaris" ? (
        <Card>
          <CardHeader>
            <CardTitle>Variables SOLARIS</CardTitle>
            <CardDescription>Vista compacta de variables seleccionadas para la plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-3 lg:grid-cols-[1fr_360px]">
            <div className="grid min-w-0 gap-2">
              {mappings.map((mapping) => (
                <button
                  key={mapping.id}
                  type="button"
                  onClick={() => setSelectedMappingId(mapping.id)}
                  className={`grid min-w-0 gap-2 rounded-lg border p-3 text-left sm:grid-cols-[1.2fr_1.2fr_.8fr_.4fr_.7fr] ${selectedMapping?.id === mapping.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                >
                  <span className="min-w-0 truncate font-medium">{mapping.sourceHeader}</span>
                  <span className="min-w-0 truncate text-muted-foreground">{mapping.semantic.displayName}</span>
                  <span>{familyLabels[mapping.semantic.family]}</span>
                  <span>{mapping.semantic.sourceUnit || "-"}</span>
                  <span>{statusLabels[mapping.semantic.status]}</span>
                </button>
              ))}
            </div>
            {selectedMapping ? (
              <aside className="min-w-0 rounded-lg border border-border bg-muted/20 p-4">
                <div className="font-semibold">Detalles avanzados</div>
                <div className="mt-3 grid gap-2 text-sm">
                  <div><span className="text-muted-foreground">RAW:</span> {selectedMapping.sourceHeader}</div>
                  <div><span className="text-muted-foreground">Campo estándar:</span> {selectedMapping.semantic.fieldId}</div>
                  <div><span className="text-muted-foreground">Nombre público:</span> {selectedMapping.semantic.displayName}</div>
                  <div><span className="text-muted-foreground">Descripción:</span> {selectedMapping.semantic.description ?? "-"}</div>
                  <div><span className="text-muted-foreground">Lado:</span> {selectedMapping.semantic.electricalSide ?? "-"}</div>
                  <div><span className="text-muted-foreground">Entidad:</span> {selectedMapping.semantic.entity ?? "-"}</div>
                  <div><span className="text-muted-foreground">Índice:</span> {selectedMapping.semantic.index ?? "-"}</div>
                  <div><span className="text-muted-foreground">Fase:</span> {selectedMapping.semantic.phase ?? selectedMapping.semantic.phaseFrom ?? "-"}</div>
                  <div><span className="text-muted-foreground">Unidad:</span> {selectedMapping.semantic.sourceUnit || "-"} → {selectedMapping.semantic.standardUnit || "-"}</div>
                  <div><span className="text-muted-foreground">Confianza:</span> {Math.round(selectedMapping.semantic.confidence * 100)}%</div>
                  <div><span className="text-muted-foreground">Patrón:</span> {selectedMapping.semantic.patternId ?? "-"}</div>
                  <Button variant="outline" size="sm" onClick={() => setEditingId(selectedMapping.id)}>Editar variable</Button>
                </div>
              </aside>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "mapping" ? (
      <section className="grid min-w-0 gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Comparacion RAW + procesado</CardTitle>
            <CardDescription>Hojas, encabezados, firma y coincidencias por valores, unidades y patrones.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {rawProcessedMatches.length ? (
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                {rawProcessedMatches.map((match) => (
                  <div key={match.id} className="border-t border-border p-3 text-sm first:border-t-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{match.rawHeader}</div>
                        <div className="truncate text-xs text-muted-foreground">→ {match.processedHeader || "Descartada / sin match"}</div>
                      </div>
                      <Badge variant={match.score >= 70 ? "default" : match.score >= 45 ? "secondary" : "destructive"}>{match.score}%</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
                      <span className="rounded bg-muted px-2 py-1">{match.method}</span>
                      <span className="rounded bg-muted px-2 py-1">{match.electricalSide ?? "lado ?"}</span>
                      <span className="rounded bg-muted px-2 py-1">{match.measurementType}</span>
                      <span className="rounded bg-muted px-2 py-1">{match.entityType ?? "entidad ?"}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                Carga o selecciona una hoja procesada para crear la relacion RAW original → procesado normalizado → campo SOLARIS.
              </div>
            )}
            {workbook && activeSheet ? (
              <>
                <div className="grid gap-3">
                  <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    Hoja
                    <select
                      value={activeSheet.name}
                      onChange={(event) => handleSheetChange(event.target.value)}
                      className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground"
                    >
                      {workbook.sheetNames.map((sheetName) => (
                        <option key={sheetName} value={sheetName}>
                          {sheetName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    Hoja procesada
                    <select
                      value={processedSheetName}
                      onChange={(event) => handleProcessedSheetChange(event.target.value)}
                      className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground"
                    >
                      <option value="">Usar hoja RAW / sin procesado</option>
                      {[...(workbook?.sheets ?? []), ...(processedWorkbook?.sheets ?? [])].map((sheet) => (
                        <option key={`${sheet.name}-${sheet.headers.length}`} value={sheet.name}>
                          {sheet.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <div className="font-medium">{workbook.fileName}</div>
                    <div className="mt-1 text-muted-foreground">
                      {workbook.fileType.toUpperCase()} · fila de encabezados {activeSheet.headerRow + 1} · {activeSheet.headers.length} columnas
                    </div>
                  </div>
                  <div className="break-all rounded-md border border-border p-3 font-mono text-xs text-muted-foreground">{signature}</div>
                </div>
                <div className="flex flex-col gap-3">
                  {matches.slice(0, 4).map((match) => (
                    <TemplateCard
                      key={match.template.templateId}
                      match={match}
                      selected={selectedTemplateId === match.template.templateId}
                      onSelect={() => handleTemplateSelect(match.template.templateId)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
                Sube un archivo para detectar hojas, encabezados y plantilla recomendada.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Detalles avanzados del mapeo</CardTitle>
                <CardDescription>Vista tecnica completa para revisar reglas, entidades, fases, indices y confianza.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={!auditEntries.some((entry) => entry.action === "batch_apply")} onClick={undoLastBatch}>
                  <Undo2 className="size-4" />
                  Deshacer ultimo lote
                </Button>
                <Button variant="outline" disabled={!selectedTemplate} onClick={() => selectedTemplate && downloadJson(`${selectedTemplate.templateId}.json`, selectedTemplate)}>
                  <Download className="size-4" />
                  Descargar plantilla
                </Button>
                <Button disabled={!mappings.length} onClick={() => setSaveOpen(true)}>
                  <Save className="size-4" />
                  Guardar plantilla SOLARIS
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {selectedTemplate ? (
              <div className="flex flex-wrap gap-2">
                <Badge>
                  <ShieldCheck className="size-3" />
                  Aplicada: {selectedTemplate.name}
                </Badge>
                <span className={cn("rounded-md px-2 py-1 text-xs font-medium", scopeStyles[selectedTemplate.scope ?? "official"])}>
                  {scopeLabels[selectedTemplate.scope ?? "official"]}
                </span>
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[1120px] text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Encabezado fuente</th>
                    <th className="px-3 py-2 text-left">Significado detectado</th>
                    <th className="px-3 py-2 text-left">Categoria</th>
                    <th className="px-3 py-2 text-left">Detalle</th>
                    <th className="px-3 py-2 text-left">Unidad</th>
                    <th className="px-3 py-2 text-left">Importancia</th>
                    <th className="px-3 py-2 text-left">Conf.</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-left">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping, index) => (
                    <Fragment key={mapping.id}>
                      <tr className="border-t border-border align-top">
                        <td className="px-3 py-3 font-medium">{mapping.sourceHeader}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium">{mapping.semantic.displayName}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{mapping.semantic.description}</div>
                        </td>
                        <td className="px-3 py-3">{familyLabels[mapping.semantic.family]}</td>
                        <td className="px-3 py-3 text-muted-foreground">{detailForSemantic(mapping.semantic) || "Requiere revision"}</td>
                        <td className="px-3 py-3">
                          <div className="text-xs text-muted-foreground">Detectada: {mapping.semantic.sourceUnit || "-"}</div>
                          <div className="text-xs text-muted-foreground">Estandar: {mapping.semantic.standardUnit || "-"}</div>
                          <div className="mt-1 text-xs font-medium text-foreground">{transformLabels[mapping.semantic.transform] ?? "Conversion automatica"}</div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={mapping.semantic.priority === "critical" ? "destructive" : mapping.semantic.priority === "important" ? "default" : "secondary"}>
                            {priorityLabels[mapping.semantic.priority]}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 font-mono">{Math.round(mapping.semantic.confidence * 100)}%</td>
                        <td className="px-3 py-3">{statusLabels[mapping.semantic.status]}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingId(editingId === mapping.id ? "" : mapping.id)}>
                              Editar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setAdvancedId(advancedId === mapping.id ? "" : mapping.id)}>
                              Avanzado
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {editingId === mapping.id ? (
                        <tr className="border-t border-border bg-muted/30">
                          <td colSpan={9} className="px-3 py-4">
                            <div className="grid gap-3 md:grid-cols-4">
                              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                Familia
                                <select value={mapping.semantic.family} onChange={(event) => updateSemantic(index, { family: event.target.value as ManualMappingDraft["semantic"]["family"], status: "confirmed" })} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground">
                                  {familyOptions.map((family) => (
                                    <option key={family.value} value={family.value}>{family.label}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                Campo SOLARIS
                                <select value={mapping.semantic.fieldId} onChange={(event) => changeField(index, event.target.value)} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground">
                                  <option value="unassigned">Sin asignar</option>
                                  {fieldDefinitions.map((field) => (
                                    <option key={field.fieldId} value={field.fieldId}>{field.label}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                Lado electrico
                                <select value={mapping.semantic.electricalSide ?? "none"} onChange={(event) => updateSemantic(index, { electricalSide: event.target.value as ManualMappingDraft["semantic"]["electricalSide"], status: "confirmed" })} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground">
                                  <option value="none">No aplica</option>
                                  <option value="dc">DC</option>
                                  <option value="ac">AC</option>
                                  <option value="grid">Red</option>
                                </select>
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                Entidad
                                <input value={mapping.semantic.entity ?? ""} onChange={(event) => updateSemantic(index, { entity: event.target.value, status: "confirmed" })} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground" placeholder="mppt, pv_input, grid" />
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                Tipo de medicion
                                <input value={mapping.semantic.measurementType ?? ""} onChange={(event) => updateSemantic(index, { measurementType: event.target.value, status: "confirmed" })} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground" placeholder="channel, phase, cumulative" />
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                Indice
                                <input type="number" value={mapping.semantic.index ?? ""} onChange={(event) => updateSemantic(index, { index: event.target.value ? Number(event.target.value) : undefined, status: "confirmed" })} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground" />
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                Fase
                                <input value={mapping.semantic.phase ?? ""} onChange={(event) => updateSemantic(index, { phase: event.target.value, status: "confirmed" })} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground" />
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                Importancia
                                <select value={mapping.semantic.priority} onChange={(event) => updateSemantic(index, { priority: event.target.value as ManualMappingDraft["semantic"]["priority"], status: event.target.value === "ignore" ? "ignored" : "confirmed" })} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground">
                                  {Object.entries(priorityLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                Unidad detectada
                                <input value={mapping.semantic.sourceUnit ?? ""} onChange={(event) => updateSemantic(index, { sourceUnit: event.target.value, status: "confirmed" })} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground" />
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                Unidad estandar
                                <input value={mapping.semantic.standardUnit ?? ""} onChange={(event) => updateSemantic(index, { standardUnit: event.target.value, status: "confirmed" })} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground" />
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                Conversion
                                <select value={mapping.semantic.transform} onChange={(event) => updateSemantic(index, { transform: event.target.value, status: "confirmed" })} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground">
                                  {transformOptions.map((transform) => (
                                    <option key={transform} value={transform}>{transformLabels[transform] ?? transform}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                Estado
                                <select value={mapping.semantic.status} onChange={(event) => updateSemantic(index, { status: event.target.value as ManualMappingDraft["semantic"]["status"] })} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground">
                                  {Object.entries(statusLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <div className="mt-4 rounded-md bg-card p-3 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="font-semibold">Aprendizaje progresivo</div>
                                  <div className="mt-1 text-xs text-muted-foreground">Guarda esta correccion y propone una regla para variables indexadas similares.</div>
                                </div>
                                <Button onClick={() => openRuleProposal(index)}>
                                  <Wand2 className="size-4" />
                                  Guardar, actualizar y reconocer similares
                                </Button>
                              </div>
                              <div className="mt-3 grid gap-3 md:grid-cols-4">
                                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                  Alcance de regla
                                  <select value={ruleScope} onChange={(event) => setRuleScope(event.target.value as RuleScope)} className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground">
                                    <option value="current_file">Solo archivo actual</option>
                                    <option value="manufacturer">Fabricante</option>
                                    <option value="manufacturer_model">Fabricante y modelo</option>
                                    <option value="global">Global</option>
                                  </select>
                                </label>
                                <label className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                                  <input type="checkbox" checked={saveRuleToLibrary} onChange={(event) => setSaveRuleToLibrary(event.target.checked)} />
                                  Guardar regla en biblioteca local
                                </label>
                                <label className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                                  <input type="checkbox" defaultChecked readOnly />
                                  Extraer indice automaticamente
                                </label>
                                <label className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                                  <input type="checkbox" checked={overwriteConfirmed} onChange={(event) => setOverwriteConfirmed(event.target.checked)} />
                                  Permitir sobrescribir confirmadas
                                </label>
                              </div>
                              <div className="mt-4 font-semibold">Usada en</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {mapping.semantic.uses.map((use) => (
                                  <span key={use} className="rounded-md bg-muted px-2 py-1 text-xs">{use}</span>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      {advancedId === mapping.id ? (
                        <tr className="border-t border-border bg-slate-50">
                          <td colSpan={9} className="px-3 py-4">
                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="rounded-md border border-border bg-card p-3">
                                <div className="text-xs text-muted-foreground">fieldId</div>
                                <div className="font-mono text-sm">{mapping.semantic.fieldId}</div>
                              </div>
                              <div className="rounded-md border border-border bg-card p-3">
                                <div className="text-xs text-muted-foreground">patternId</div>
                                <div className="font-mono text-sm">{mapping.semantic.patternId ?? "-"}</div>
                              </div>
                              <div className="rounded-md border border-border bg-card p-3">
                                <div className="text-xs text-muted-foreground">transform tecnico</div>
                                <div className="font-mono text-sm">{mapping.semantic.transform}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                  {!mappings.length ? (
                    <tr>
                      <td className="px-3 py-8 text-center text-muted-foreground" colSpan={9}>
                        No hay asignaciones todavia.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
      ) : null}

      {activeTab === "explore" ? <DataTranslatorExplorer workbook={visualizationWorkbook} sourceSheetName={processedSheet?.name} /> : null}

      {activeTab === "template" ? (
        <Card>
          <CardHeader>
            <CardTitle>Plantilla</CardTitle>
            <CardDescription>Guarda y versiona el formato aprendido de SOLARIS.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button disabled={!mappings.length} onClick={() => setSaveOpen(true)}>
              <Save className="size-4" />
              Guardar plantilla SOLARIS
            </Button>
            <Button variant="outline" disabled={!selectedTemplate} onClick={() => selectedTemplate && downloadJson(`${selectedTemplate.templateId}.json`, selectedTemplate)}>
              <Download className="size-4" />
              Descargar plantilla aplicada
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {ruleProposal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
            <div className="border-b border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Nueva regla de familia detectada</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Revisa las variables afectadas antes de aplicar. No se hacen cambios silenciosos.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setRuleProposal(null)}>Cancelar</Button>
              </div>
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-3">
              <div className="rounded-lg border border-border p-4">
                <div className="text-xs text-muted-foreground">Variable base</div>
                <div className="mt-1 font-semibold">{ruleProposal.baseHeader}</div>
                <div className="mt-3 text-xs text-muted-foreground">Patron visual</div>
                <div className="mt-1 font-mono text-sm">{ruleProposal.rule.displayPattern}</div>
              </div>
              <div className="rounded-lg border border-border p-4 lg:col-span-2">
                <div className="text-xs text-muted-foreground">Expresion regular</div>
                <div className="mt-1 break-all rounded-md bg-muted p-2 font-mono text-sm">{ruleProposal.rule.sourcePattern}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge>{ruleProposal.matches.length} coincidencias</Badge>
                  <Badge variant="secondary">{Math.round(ruleProposal.confidence * 100)}% confianza</Badge>
                  <Badge variant={ruleProposal.conflicts.length ? "destructive" : "secondary"}>{ruleProposal.conflicts.length} conflictos</Badge>
                  <Badge variant="secondary">Alcance: {ruleProposal.rule.scope}</Badge>
                </div>
              </div>
              <div className="rounded-lg border border-border p-4 lg:col-span-3">
                <div className="font-semibold">Configuracion que se copiara</div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
                  <span>Campo: {ruleProposal.copiedConfiguration.displayName}</span>
                  <span>Familia: {familyLabels[ruleProposal.copiedConfiguration.family]}</span>
                  <span>Entidad: {ruleProposal.copiedConfiguration.entity ?? "-"}</span>
                  <span>Unidad: {ruleProposal.copiedConfiguration.sourceUnit ?? "-"} a {ruleProposal.copiedConfiguration.standardUnit ?? "-"}</span>
                  <span>Conversion: {transformLabels[ruleProposal.copiedConfiguration.transform] ?? ruleProposal.copiedConfiguration.transform}</span>
                  <span>Importancia: {priorityLabels[ruleProposal.copiedConfiguration.priority]}</span>
                  <span>Tipo: {ruleProposal.copiedConfiguration.measurementType ?? "-"}</span>
                  <span>Estado: confirmado por usuario</span>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border lg:col-span-3">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Aplicar</th>
                      <th className="px-3 py-2 text-left">Variable original</th>
                      <th className="px-3 py-2 text-left">Campo sugerido</th>
                      <th className="px-3 py-2 text-left">Entidad</th>
                      <th className="px-3 py-2 text-left">Indice</th>
                      <th className="px-3 py-2 text-left">Unidad</th>
                      <th className="px-3 py-2 text-left">Confianza</th>
                      <th className="px-3 py-2 text-left">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ruleProposal.matches.map((match) => (
                      <tr key={match.sourceHeader} className="border-t border-border">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            disabled={match.action === "conflict" && !overwriteConfirmed}
                            checked={selectedRuleHeaders.includes(match.sourceHeader)}
                            onChange={(event) =>
                              setSelectedRuleHeaders((current) =>
                                event.target.checked ? [...current, match.sourceHeader] : current.filter((header) => header !== match.sourceHeader),
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">{match.sourceHeader}</td>
                        <td className="px-3 py-2">{match.displayName}</td>
                        <td className="px-3 py-2">{match.entity ?? "-"}</td>
                        <td className="px-3 py-2 font-mono">{match.index}</td>
                        <td className="px-3 py-2">{match.unit}</td>
                        <td className="px-3 py-2">{Math.round(match.confidence * 100)}%</td>
                        <td className="px-3 py-2">
                          {match.action === "conflict" ? <span className="text-red-600">{match.conflictReason}</span> : "Aplicar"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ruleProposal.relatedSuggestions.length ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 lg:col-span-3">
                  <div className="font-semibold">Familias hermanas sugeridas</div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {ruleProposal.relatedSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="rounded-md bg-card p-3 text-sm">
                        <div className="font-medium">{suggestion.label}</div>
                        <div className="mt-1 font-mono text-xs text-muted-foreground">{suggestion.displayPattern}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{suggestion.matches.length} coincidencias pendientes de confirmacion.</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 lg:col-span-3">
                <Button onClick={() => applyRuleProposal()}>
                  <RefreshCw className="size-4" />
                  Aplicar a todas
                </Button>
                <Button variant="outline" onClick={() => applyRuleProposal(selectedRuleHeaders)}>
                  Aplicar seleccionadas
                </Button>
                <Button variant="outline" onClick={saveOnlyRule}>
                  Guardar solo la regla
                </Button>
                <Button variant="ghost" onClick={() => setRuleProposal(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {saveOpen ? (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle>Guardar plantilla SOLARIS</CardTitle>
            <CardDescription>No publica una plantilla oficial. En el MVP descarga un JSON privado o personalizado.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            <FieldInput label="Nombre" value={templateName} onChange={setTemplateName} />
            <FieldInput label="Fabricante" value={manufacturer} onChange={setManufacturer} />
            <FieldInput label="Modelo" value={model} onChange={setModel} />
            <FieldInput label="Tipo de exportacion" value={exportType} onChange={setExportType} />
            <FieldInput label="Version" value={version} onChange={setVersion} />
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Alcance
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value as TemplateScope)}
                className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground"
              >
                <option value="private">Privada de empresa</option>
                <option value="custom">Personalizada para este archivo</option>
              </select>
            </label>
            <div className="flex gap-2 lg:col-span-3">
              <Button onClick={saveTemplate}>
                <FileJson className="size-4" />
                Guardar y descargar JSON
              </Button>
              <Button variant="outline" onClick={() => setSaveOpen(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Vista previa de encabezados</CardTitle>
          <CardDescription>Solo se muestran encabezados y muestra anonimizada; el archivo completo no se guarda en la plantilla.</CardDescription>
        </CardHeader>
        <CardContent>
          {activeSheet ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {activeSheet.headers.map((header) => (
                  <span key={header} className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                    {header}
                  </span>
                ))}
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[720px] text-xs">
                  <tbody>
                    {activeSheet.rows.slice(0, 4).map((row, rowIndex) => (
                      <tr key={`row-${rowIndex}`} className="border-t border-border first:border-t-0">
                        {row.slice(0, 8).map((cell, cellIndex) => (
                          <td key={`${rowIndex}-${cellIndex}`} className="px-2 py-2 text-muted-foreground">
                            {rowIndex === activeSheet.headerRow ? cell : rowIndex > activeSheet.headerRow ? "<anon>" : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
              La vista previa aparecera despues de subir un archivo.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auditoria de aprendizaje</CardTitle>
          <CardDescription>Registro local de reglas propuestas, aplicaciones masivas, reglas guardadas y deshacer.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{learnedRules.length} reglas aprendidas</Badge>
            <Badge variant="secondary">{auditEntries.length} eventos auditados</Badge>
          </div>
          <div className="mt-4 grid gap-2">
            {auditEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{entry.action.replaceAll("_", " ")}</span>
                  <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString("es-MX")}</span>
                </div>
                <div className="mt-1 text-muted-foreground">
                  Base: {entry.baseHeader} · Afectadas: {entry.affectedHeaders.length ? entry.affectedHeaders.join(", ") : "ninguna"}
                </div>
              </div>
            ))}
            {!auditEntries.length ? <div className="text-sm text-muted-foreground">Aun no hay acciones de aprendizaje registradas.</div> : null}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Library className="size-4" />
          Regla de seguridad del MVP
        </div>
        <p className="mt-2">
          Las plantillas guardan encabezados, metadatos, reglas de transformacion, firma de formato y una muestra anonimizada opcional. No guardan el
          archivo original ni datos sensibles de produccion.
        </p>
      </div>
    </div>
  );
}
