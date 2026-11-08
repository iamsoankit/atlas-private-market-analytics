import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateMetrics,
  createMemo,
  CSV_TEMPLATE,
  modelReturns,
  parseFinancialCSV,
} from "./analysis.js";

const HEADER = "company,sector,revenue,ebitda,enterprise_value,net_debt,source";
const row = (
  company = "Acme",
  values = [100, 20, 150, 30],
  source = "Filing",
) =>
  `${company},Software,${values[0]},${values[1]},${values[2]},${values[3]},${source}`;
const assumptions = {
  growth: 10,
  exitMargin: 25,
  exitMultiple: 10,
  years: 5,
  debtPaydown: 25,
};

test("template has the required headers, three rows, and parseable illustrative data", () => {
  assert.equal(CSV_TEMPLATE.split("\n").length, 4);
  assert.deepEqual(parseFinancialCSV(CSV_TEMPLATE).errors, []);
  assert.equal(parseFinancialCSV(CSV_TEMPLATE).records.length, 3);
});

test("parses BOM, CRLF, quoted commas and newlines, and escaped quotes", () => {
  const csv = `\uFEFF${HEADER}\r\n"Acme, Inc.","Software\r\nAnalytics",100,20,150,30,"Source says ""filed"""`;
  const result = parseFinancialCSV(csv);
  assert.deepEqual(result.errors, []);
  assert.equal(result.records[0].company, "Acme, Inc.");
  assert.equal(result.records[0].sector, "Software\r\nAnalytics");
  assert.equal(result.records[0].source, 'Source says "filed"');
  assert.match(result.records[0].id, /^financial-acme-inc-/);
});

test("identifiers are stable and unique across normalized company names", () => {
  const first = parseFinancialCSV(`${HEADER}\n${row("Café Group")}`).records[0];
  const again = parseFinancialCSV(`${HEADER}\n${row("Café Group")}`).records[0];
  const other = parseFinancialCSV(`${HEADER}\n${row("Cafe Group")}`).records[0];
  assert.equal(first.id, again.id);
  assert.notEqual(first.id, other.id);
});

test("reports duplicate, missing, and unknown headers", () => {
  const result = parseFinancialCSV(
    "company,company,sector,revenue,ebitda,enterprise_value,net_debt,extra\n",
  );
  assert.ok(result.errors.some((error) => error.includes("duplicate column")));
  assert.ok(result.errors.some((error) => error.includes("unknown column")));
  assert.ok(
    result.errors.some((error) =>
      error.includes("missing required column “source”"),
    ),
  );
});

test("rejects inconsistent, malformed, and unterminated CSV rows", () => {
  for (const csv of [
    `${HEADER}\n${row()}\nshort,row`,
    `${HEADER}\n${row()}\n\n${row("Next")}`,
    `${HEADER}\n${row().replace("Acme", '"Acme"oops')}`,
    `${HEADER}\n"unterminated,Software,100,20,150,30,Filing`,
    `${HEADER}\n${row().replace("Acme", 'Ac"me')}`,
  ]) {
    const result = parseFinancialCSV(csv);
    assert.ok(result.errors.length > 0, csv);
    assert.deepEqual(result.records, []);
    assert.match(result.errors[0], /Row|Header/);
  }
});

test("rejects invalid required fields, numerics, control characters, and duplicates atomically", () => {
  const invalid = `${HEADER}\n${row("Acme", [0, "", -1, "nope"])}\n${row("acme")}`;
  const result = parseFinancialCSV(invalid);
  assert.ok(
    result.errors.some((error) =>
      error.includes("revenue must be greater than zero"),
    ),
  );
  assert.ok(
    result.errors.some((error) =>
      error.includes("ebitda must be a valid finite number"),
    ),
  );
  assert.ok(
    result.errors.some((error) =>
      error.includes("enterprise_value must be greater than zero"),
    ),
  );
  assert.ok(result.errors.some((error) => error.includes("duplicate company")));
  assert.deepEqual(result.records, []);
  assert.ok(
    parseFinancialCSV(`${HEADER}\n${row("Acme\u0001Corp")}`).errors.some(
      (error) => error.includes("control characters"),
    ),
  );
  assert.ok(
    parseFinancialCSV(`${HEADER}\n${row("Acme\tCorp")}`).errors.some((error) =>
      error.includes("control characters"),
    ),
  );
  assert.ok(
    parseFinancialCSV(`${HEADER}\n,Software,100,20,150,30,Filing`).errors.some(
      (error) => error.includes("company is required"),
    ),
  );
});

test("enforces the 1 MB and 200 data-row limits", () => {
  assert.match(
    parseFinancialCSV(
      `${HEADER}\n${row("Large", [100, 20, 150, 30], "x".repeat(1024 * 1024))}`,
    ).errors[0],
    /1 MB/,
  );
  const tooMany = `${HEADER}\n${Array.from({ length: 201 }, (_, index) => row(`Company ${index}`)).join("\n")}`;
  assert.ok(
    parseFinancialCSV(tooMany).errors.some((error) =>
      error.includes("200 data-row limit"),
    ),
  );
});

test("returns warnings for nonpositive EBITDA, EBITDA above sales, and negative equity", () => {
  const result = parseFinancialCSV(
    `${HEADER}\n${row("Loss", [100, 0, 20, 30])}\n${row("Outlier", [100, 120, 50, 80])}`,
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.records.length, 2);
  assert.ok(
    result.warnings.some((warning) =>
      warning.includes("EBITDA is nonpositive"),
    ),
  );
  assert.ok(
    result.warnings.some((warning) =>
      warning.includes("EBITDA exceeds revenue"),
    ),
  );
  assert.ok(
    result.warnings.some((warning) =>
      warning.includes("implied equity value is negative"),
    ),
  );
});

test("calculates operating and entry metrics", () => {
  const record = parseFinancialCSV(`${HEADER}\n${row()}`).records[0];
  assert.deepEqual(calculateMetrics(record), {
    margin: 20,
    evRevenue: 1.5,
    evEbitda: 7.5,
    netLeverage: 1.5,
    equityValue: 120,
  });
  assert.equal(calculateMetrics({ ...record, ebitda: 0 }).evEbitda, null);
});

test("models returns with annual growth, paydown and percent IRR", () => {
  const record = parseFinancialCSV(`${HEADER}\n${row()}`).records[0];
  const result = modelReturns(record, assumptions);
  assert.ok(Math.abs(result.exitRevenue - 161.051) < 1e-9);
  assert.ok(Math.abs(result.exitEbitda - 40.26275) < 1e-9);
  assert.ok(Math.abs(result.exitEV - 402.6275) < 1e-9);
  assert.equal(result.remainingDebt, 22.5);
  assert.equal(result.entryEquity, 120);
  assert.ok(result.moic > 0);
  assert.ok(result.irr > 0);
  assert.ok(result.irr > 1, "IRR is expressed as a percentage, not a decimal");
});

test("holds net cash constant, floors exit equity at zero, and supports a full loss", () => {
  const cashRecord = {
    revenue: 100,
    ebitda: 10,
    enterprise_value: 120,
    net_debt: -20,
  };
  assert.equal(
    modelReturns(cashRecord, { ...assumptions, debtPaydown: 100 })
      .remainingDebt,
    -20,
  );
  const loss = modelReturns(
    { revenue: 100, ebitda: 10, enterprise_value: 110, net_debt: 10 },
    {
      ...assumptions,
      growth: -50,
      exitMargin: 1,
      exitMultiple: 1,
    },
  );
  assert.equal(loss.exitEquity, 0);
  assert.equal(loss.moic, 0);
  assert.equal(loss.irr, -100);
});

test("returns null for invalid assumptions, nonpositive entry equity, or terminal EBITDA", () => {
  const record = {
    revenue: 100,
    ebitda: 20,
    enterprise_value: 150,
    net_debt: 30,
  };
  for (const invalid of [
    { ...assumptions, growth: -51 },
    { ...assumptions, growth: 101 },
    { ...assumptions, exitMargin: 0 },
    { ...assumptions, exitMargin: 101 },
    { ...assumptions, exitMultiple: 0 },
    { ...assumptions, exitMultiple: 41 },
    { ...assumptions, years: 1.5 },
    { ...assumptions, years: 11 },
    { ...assumptions, debtPaydown: -1 },
    { ...assumptions, debtPaydown: 101 },
  ])
    assert.equal(modelReturns(record, invalid), null);
  assert.equal(
    modelReturns({ ...record, enterprise_value: 30 }, assumptions),
    null,
  );
  assert.equal(
    modelReturns(
      { ...record, revenue: Number.MAX_VALUE },
      { ...assumptions, growth: 100, years: 10 },
    ),
    null,
  );
});

test("memo includes sources, assumptions, returns, thesis, risks, and limitations", () => {
  const record = parseFinancialCSV(`${HEADER}\n${row()}`).records[0];
  const memo = createMemo(record, assumptions, {
    stage: "In review",
    thesis: "Recurring revenue",
    risks: "Customer concentration",
  });
  for (const phrase of [
    "Source: Filing",
    "All monetary values are USD millions",
    "EV / EBITDA",
    "Assumptions:",
    "MOIC:",
    "IRR:",
    "Review stage: In review",
    "Recurring revenue",
    "Customer concentration",
    "taxes, interest, fees",
    "not a cash-flow result",
    "not been independently verified",
  ]) {
    assert.ok(memo.includes(phrase), phrase);
  }
  const notMeaningful = createMemo(record, { ...assumptions, years: 99 });
  assert.ok(notMeaningful.includes("Not meaningful:"));
  assert.ok(!notMeaningful.includes("MOIC:"));
});

test("a header-only CSV cannot be confirmed as an empty import", () => {
  const parsed = parseFinancialCSV(
    "company,sector,revenue,ebitda,enterprise_value,net_debt,source",
  );
  assert.ok(
    parsed.errors.some((error) => error.includes("at least one company")),
  );
  assert.deepEqual(parsed.records, []);
});

test("an N/M memo retains assumptions and explicitly marks incomplete reasoning", () => {
  const record = {
    ...parseFinancialCSV(CSV_TEMPLATE).records[0],
    net_debt: 1000,
  };
  const memo = createMemo(
    record,
    { growth: 10, exitMargin: 20, exitMultiple: 10, years: 5, debtPaydown: 25 },
    { stage: "In review" },
  );
  assert.match(memo, /Incomplete draft/);
  assert.match(memo, /Assumptions: revenue growth 10%/);
  assert.match(memo, /Not meaningful/);
});
