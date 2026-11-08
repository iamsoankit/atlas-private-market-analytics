import test from "node:test";
import assert from "node:assert/strict";
import {
  restoreWorkspace,
  WORKSPACE_KEY,
  financialCSV,
  defaultResearch,
} from "./workspace.js";
import { CSV_TEMPLATE, parseFinancialCSV } from "./analysis.js";

const storage = (value) => ({
  getItem: (key) => (key === WORKSPACE_KEY ? value : null),
});

test("a new workspace is empty and malformed saved data is reported", () => {
  assert.deepEqual(restoreWorkspace(storage(null)).workspace.records, []);
  assert.ok(restoreWorkspace(storage("{broken")).warning);
  assert.ok(restoreWorkspace(storage('{"records":[{}]}')).warning);
});

test("saved financial records and analysis survive restoring", () => {
  const { records, errors } = parseFinancialCSV(CSV_TEMPLATE);
  assert.deepEqual(errors, []);
  const research = Object.fromEntries(
    records.map((r) => [
      r.id,
      {
        ...defaultResearch(r),
        stage: "Shortlisted",
        thesis: "Pricing power",
        risks: "Retention",
        assumptions: {
          growth: 10,
          exitMargin: 20,
          exitMultiple: 12,
          years: 5,
          debtPaydown: 30,
        },
      },
    ]),
  );
  const saved = {
    records,
    research,
    provenance: "FY2025 disclosures.csv",
    importedAt: "2026-11-08T12:00:00.000Z",
  };
  const restored = restoreWorkspace(storage(JSON.stringify(saved)));
  assert.equal(restored.warning, "");
  assert.deepEqual(restored.workspace, saved);
});

test("restore rejects invalid financials but repairs invalid case fields", () => {
  const { records } = parseFinancialCSV(CSV_TEMPLATE);
  const id = records[0].id;
  const saved = {
    records,
    research: {
      [id]: {
        stage: "Invented",
        thesis: 123,
        risks: "Diligence",
        assumptions: { growth: Infinity, years: 1.5, exitMargin: -5 },
      },
    },
  };
  const restored = restoreWorkspace(storage(JSON.stringify(saved)));
  assert.equal(restored.warning, "");
  assert.equal(restored.workspace.research[id].stage, "In review");
  assert.equal(restored.workspace.research[id].thesis, "");
  assert.equal(restored.workspace.research[id].assumptions.years, 5);
  assert.ok(restored.workspace.research[id].assumptions.exitMargin > 0);
  assert.ok(
    restoreWorkspace(
      storage(JSON.stringify({ records: [{ ...records[0], revenue: 0 }] })),
    ).warning,
  );
});

test("financial CSV preserves negative numerical inputs and neutralizes textual formulas", () => {
  const { records } = parseFinancialCSV(CSV_TEMPLATE);
  const record = {
    ...records[0],
    ebitda: -5,
    net_debt: -10,
    source: "=SUM(1,2)",
  };
  const csv = financialCSV([record]);
  const result = parseFinancialCSV(csv);
  assert.deepEqual(result.errors, []);
  assert.equal(result.records[0].ebitda, -5);
  assert.equal(result.records[0].net_debt, -10);
  assert.equal(result.records[0].source, "'=SUM(1,2)");
});

test("all accepted note lengths can be restored after a successful save", () => {
  const header =
    "company,sector,revenue,ebitda,enterprise_value,net_debt,source";
  const csv = [
    header,
    ...Array.from(
      { length: 101 },
      (_, i) => `Company ${i},Software,100,20,200,40,Synthetic FY2025`,
    ),
  ].join("\n");
  const { records, errors } = parseFinancialCSV(csv);
  assert.deepEqual(errors, []);
  const research = Object.fromEntries(
    records.map((record) => [
      record.id,
      {
        ...defaultResearch(record),
        thesis: "x".repeat(10000),
        risks: "y".repeat(10000),
      },
    ]),
  );
  const serialized = JSON.stringify({ records, research });
  assert.ok(serialized.length > 2000000);
  const restored = restoreWorkspace(storage(serialized));
  assert.equal(restored.warning, "");
  assert.equal(restored.workspace.records.length, 101);
  assert.equal(
    restored.workspace.research[records[100].id].thesis.length,
    10000,
  );
});
