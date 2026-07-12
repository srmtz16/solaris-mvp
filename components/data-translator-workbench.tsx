"use client";

import { useMemo, useState } from "react";
import { Download, FileJson, FileUp, Library, Save, ShieldCheck, Upload } from "lucide-react";
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
  targetFields,
  transformOptions,
} from "@/lib/data-translator";
import { cn } from "@/lib/utils";
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

  async function handleFile(file: File) {
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

  function updateMapping(index: number, patch: Partial<ManualMappingDraft>) {
    setMappings((current) => current.map((mapping, mappingIndex) => (mappingIndex === index ? { ...mapping, ...patch } : mapping)));
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
            <CardDescription>XLS, XLSX o CSV. No se guarda el archivo completo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
              <FileUp className="size-8 text-blue-600" />
              <span className="text-sm font-medium">Subir archivo</span>
              <span className="text-xs text-muted-foreground">Se analizan hojas y encabezados localmente en el navegador.</span>
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
              <Upload className="size-4" />
              Cargar plantilla JSON
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void loadTemplateFile(file);
                }}
              />
            </label>
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
                <CardTitle>Asignaciones corregibles</CardTitle>
                <CardDescription>La plantilla con mayor coincidencia se aplica automaticamente y puede corregirse manualmente.</CardDescription>
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
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Encabezado fuente</th>
                    <th className="px-3 py-2 text-left">Normalizado</th>
                    <th className="px-3 py-2 text-left">Campo SOLARIS</th>
                    <th className="px-3 py-2 text-left">Unidad</th>
                    <th className="px-3 py-2 text-left">Transform</th>
                    <th className="px-3 py-2 text-left">Req.</th>
                    <th className="px-3 py-2 text-left">Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping, index) => (
                    <tr key={mapping.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{mapping.sourceHeader}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{mapping.normalizedSourceHeader}</td>
                      <td className="px-3 py-2">
                        <select
                          value={mapping.targetField}
                          onChange={(event) => updateMapping(index, { targetField: event.target.value })}
                          className="h-8 w-full rounded-md border border-border bg-card px-2"
                        >
                          {targetFields.map((field) => (
                            <option key={field} value={field}>
                              {field}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <input
                            value={mapping.sourceUnit}
                            onChange={(event) => updateMapping(index, { sourceUnit: event.target.value })}
                            className="h-8 w-20 rounded-md border border-border bg-card px-2"
                            placeholder="Origen"
                          />
                          <input
                            value={mapping.targetUnit}
                            onChange={(event) => updateMapping(index, { targetUnit: event.target.value })}
                            className="h-8 w-20 rounded-md border border-border bg-card px-2"
                            placeholder="Destino"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={mapping.transform}
                          onChange={(event) => updateMapping(index, { transform: event.target.value })}
                          className="h-8 rounded-md border border-border bg-card px-2"
                        >
                          {transformOptions.map((transform) => (
                            <option key={transform} value={transform}>
                              {transform}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={mapping.required}
                          onChange={(event) => updateMapping(index, { required: event.target.checked })}
                          className="size-4"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono">{Math.round(mapping.confidence * 100)}%</td>
                    </tr>
                  ))}
                  {!mappings.length ? (
                    <tr>
                      <td className="px-3 py-8 text-center text-muted-foreground" colSpan={7}>
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
