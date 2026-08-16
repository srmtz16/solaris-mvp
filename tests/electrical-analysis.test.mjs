import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import {
  aggregateReadings,
  defaultFilters,
  detectAdaptivePatterns,
  filterReadings,
  importElectricalWorkbook,
} from "../lib/electrical-analysis.ts";

function workbookFromRows(rows, sheetName = "historical data") {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  return workbook;
}

function sampleRows(count = 30) {
  const rows = [
    ["Device name", "address", "datalog_sn"],
    ["CHNT_THREE", "36", "TEST-SN"],
    [],
    ["DataLog SN", "Time", "Three-phase current Ia(A)", "Three-phase current Ib(A)", "Three-phase current Ic(A)", "Combined active power(W)", "Convergence power factor", "Positive active total energy", "IsAgain"],
  ];
  for (let index = 0; index < count; index += 1) {
    rows.push(["TEST-SN", new Date(Date.UTC(2026, 7, 3, 0, index * 5)), 100 + index / 10, 101 + index / 10, 99 + index / 10, 30_000 + index * 10, .98, 1_000 + index, index === 4]);
  }
  return rows;
}

test("detecta encabezado desplazado, convierte W a kW y conserva retransmisiones", () => {
  const dataset = importElectricalWorkbook(workbookFromRows(sampleRows()), "growatt.xls");
  assert.equal(dataset.sheetName, "historical data");
  assert.equal(dataset.headerRow, 4);
  assert.equal(dataset.rowCount, 30);
  assert.equal(dataset.retransmissionCount, 1);
  assert.equal(dataset.intervalMinutes, 5);
  assert.deepEqual(
    dataset.columns.slice(0, 2).map(({ targetId, displayName, recognized }) => ({ targetId, displayName, recognized })),
    [
      { targetId: "serial_number", displayName: "Número de serie", recognized: true },
      { targetId: "timestamp", displayName: "Fecha y hora", recognized: true },
    ],
  );
  const power = dataset.readings.find((reading) => reading.family === "power");
  assert.equal(power?.value, 30);
  assert.equal(power?.rawValue, 30_000);
  assert.equal(power?.unit, "kW");
});

test("excluye IsAgain por defecto y agrega por intervalo", () => {
  const dataset = importElectricalWorkbook(workbookFromRows(sampleRows()), "growatt.xls");
  const filters = defaultFilters(dataset);
  const filtered = filterReadings(dataset.readings, filters);
  assert.ok(filtered.every((reading) => reading.quality === "valid"));
  assert.ok(filterReadings(dataset.readings, { ...filters, includeRetransmissions: true }).length > filtered.length);
  assert.ok(aggregateReadings(filtered, 15).length < filtered.length);
});

test("detecta huecos y retroceso de contador sin límites normativos", () => {
  const rows = sampleRows(36);
  rows.splice(18, 1);
  rows[28][7] = 900;
  const dataset = importElectricalWorkbook(workbookFromRows(rows), "growatt.xls");
  const patterns = detectAdaptivePatterns(filterReadings(dataset.readings, defaultFilters(dataset)), 5, "normal");
  assert.ok(patterns.some((pattern) => pattern.kind === "gap"));
  assert.ok(patterns.some((pattern) => pattern.kind === "counter_reset"));
});
