# SOLARIS Data Translator

El modulo opera como un motor progresivo de identificacion de variables para archivos CSV, XLS y XLSX. En el MVP todo vive en el repositorio: plantillas JSON oficiales, reglas parametrizadas, alias semanticos y una muestra anonimizada. No se guarda el archivo completo.

## Flujo de decision

1. Coincidencia exacta de plantilla validada.
2. Regla parametrizada validada.
3. Regla especifica de fabricante o modelo.
4. Alias semantico normalizado.
5. Inferencia por unidad, tipo de dato y comportamiento.
6. Respaldo de IA local deshabilitado en el MVP, sin envio de datos.
7. Confirmacion humana.

## Reglas parametrizadas

Cuando el usuario confirma una variable como `Vpv2(V)`, el boton `Guardar, actualizar y reconocer similares` genera una regla del tipo:

```json
{
  "sourcePattern": "^Vpv_?(\\d+)\\s*\\(V\\)$",
  "displayPattern": "Vpv{indice}(V)",
  "targetField": "mppt_voltage",
  "indexCaptureGroup": 1,
  "scope": "manufacturer"
}
```

Antes de aplicar, el usuario revisa una tabla de coincidencias. La regla exige indice numerico, asi que `VpvMax(V)`, `VpvAvg(V)` y `VpvTotal(V)` quedan fuera.

## Auditoria y deshacer

Cada aplicacion masiva registra encabezados afectados, valores anteriores, valores nuevos, alcance y fecha. El boton `Deshacer ultimo lote` revierte la ultima accion aplicada desde la auditoria local del MVP.

## IA como respaldo

`data-translator/ai/fallback.ts` expone un contrato para sugerencias de IA, pero en el MVP regresa `null` y razones locales. La IA no participa en coincidencias exactas, reglas, alias ni inferencias deterministicas, y ninguna regla de IA puede guardarse sin confirmacion humana.

## Agregar familias

1. Agrega el campo en `data-translator/ontology/fields.ts`.
2. Define prioridad en `data-translator/ontology/priorities.ts`.
3. Define usos en `data-translator/ontology/uses.ts`.
4. Agrega aliases en `data-translator/aliases/semantic-aliases.ts` si aplica.
5. Agrega reglas hermanas en `data-translator/rules/progressive-rules.ts` si pertenecen a una familia indexada.

## Prueba local Vpv1-Vpv20

Carga un CSV/XLSX con encabezados `Vpv1(V)` a `Vpv20(V)` y algunos distractores como `VpvMax(V)`. Confirma manualmente `Vpv2(V)` como `Voltaje MPPT`, indice 2, unidad V y conversion numerica. Pulsa `Guardar, actualizar y reconocer similares`, revisa el modal y aplica todas las coincidencias.
