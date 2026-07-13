"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, FileJson, FileSpreadsheet, FileUp, Library, Save, ShieldCheck, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  applyTemplate,
  buildFormatSignature,
  buildSheetPreview,
  createTemplateFromMappings,
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
import type {
  FileType,
  ManualMappingDraft,
  SheetPreview,
  TemplateMatch,
  TemplateScope,
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
  const templateInputRef = useRef<HTMLInputElement | null>(null);
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [activeSheetName, setActiveSheetName] = useState("");
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

  const activeSheet = workbook?.sheets.find((sheet) => sheet.name === activeSheetName) ?? workbook?.sheets[0] ?? null;
  const selectedTemplate = templates.find((template) => template.templateId === selectedTemplateId) ?? matches[0]?.template;
  const signature = activeSheet && workbook ? buildFormatSignature(workbook.sheetNames, activeSheet) : "";

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

  async function handleFile(file: File) {
    if (!isSupportedDataFile(file)) {
      setFileError("Selecciona un archivo de datos .csv, .xls o .xlsx. Los JSON son solo para plantillas guardadas.");
      return;
    }

    setFileError("");
    const parsed = await parseFile(file);
    const sheet = parsed.sheets[0];
    const ranked = rankTemplates(templates, sheet);
    const best = ranked[0]?.template;
    setWorkbook(parsed);
    setActiveSheetName(sheet.name);
    setMatches(ranked);
    setSelectedTemplateId(best?.templateId ?? "");
    setMappings(best ? applyTemplate(best, sheet) : []);
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
    setMappings(best ? applyTemplate(best, sheet) : []);
  }

  function handleTemplateSelect(templateId: string) {
    if (!activeSheet) return;
    const template = templates.find((item) => item.templateId === templateId);
    if (!template) return;
    setSelectedTemplateId(templateId);
    setMappings(applyTemplate(template, activeSheet));
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

  function saveTemplate() {
    if (!workbook || !activeSheet) return;
    const template = createTemplateFromMappings({
      name: templateName,
      manufacturer,
      model,
      exportType,
      version,
      scope,
      fileType: workbook.fileType,
      sheet: activeSheet,
      sheetNames: workbook.sheetNames,
      mappings,
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
    setSelectedTemplateId(template.templateId);
    if (activeSheet) setMappings(applyTemplate(template, activeSheet));
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
            <CardDescription>Primero carga el archivo de datos. El JSON es solo para plantillas guardadas.</CardDescription>
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
              <span className="text-sm font-semibold">Archivo de datos XLS, XLSX o CSV</span>
              <span className="text-xs text-muted-foreground">Arrastra tu exportacion aqui o selecciona el archivo desde tu equipo.</span>
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
            {fileError ? (
              <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 size-4" />
                {fileError}
              </div>
            ) : null}
            {workbook ? (
              <div className="rounded-md border border-green-100 bg-green-50 p-3 text-sm text-green-700">
                Archivo cargado: <span className="font-semibold">{workbook.fileName}</span>
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

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Deteccion</CardTitle>
            <CardDescription>Hojas, fila de encabezados, firma y mejor coincidencia.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
                <CardTitle>Significado semantico corregible</CardTitle>
                <CardDescription>Las variables se clasifican por familia, lado electrico, entidad, fase o indice sin crear campos individuales.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={!selectedTemplate} onClick={() => selectedTemplate && downloadJson(`${selectedTemplate.templateId}.json`, selectedTemplate)}>
                  <Download className="size-4" />
                  Descargar plantilla
                </Button>
                <Button disabled={!mappings.length} onClick={() => setSaveOpen(true)}>
                  <Save className="size-4" />
                  Guardar como plantilla
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
                              <div className="font-semibold">Usada en</div>
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

      {saveOpen ? (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle>Guardar como plantilla</CardTitle>
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
