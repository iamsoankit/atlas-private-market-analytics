export const CSV_TEMPLATE = `company,sector,revenue,ebitda,enterprise_value,net_debt,source
Northstar Analytics,Enterprise software,120,30,240,45,Illustrative company filing
Harbor Medical,Healthcare services,85,12,144,28,Illustrative transaction note
Cedar Components,Industrial manufacturing,60,8,72,-5,Illustrative company filing`;

const HEADERS = [
  "company",
  "sector",
  "revenue",
  "ebitda",
  "enterprise_value",
  "net_debt",
  "source",
];
const MAX_BYTES = 1024 * 1024;
const MAX_ROWS = 200;
const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let state = "start";
  let line = 1;
  let rowLine = 1;
  const errors = [];
  const pushField = () => {
    row.push(field);
    field = "";
    state = "start";
  };
  const pushRow = () => {
    pushField();
    rows.push({ fields: row, line: rowLine });
    row = [];
    rowLine = line;
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (state === "quoted") {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          state = "afterQuote";
        }
      } else {
        field += char;
        if (char === "\n") line += 1;
        else if (char === "\r") {
          if (text[i + 1] === "\n") {
            field += "\n";
            i += 1;
          } else {
            errors.push(
              `Row ${rowLine}: bare carriage return; use CRLF line endings.`,
            );
          }
          line += 1;
        }
      }
      continue;
    }

    if (char === "\r" || char === "\n") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      else if (char === "\r")
        errors.push(
          `Row ${rowLine}: bare carriage return; use CRLF line endings.`,
        );
      pushRow();
      line += 1;
      rowLine = line;
      continue;
    }

    if (state === "afterQuote") {
      if (char === ",") pushField();
      else
        errors.push(
          `Row ${rowLine}: unexpected character after a closing quote.`,
        );
      if (char === ",") continue;
      state = "unquoted";
      field += char;
      continue;
    }
    if (char === ",") {
      pushField();
    } else if (char === '"') {
      if (state === "start") state = "quoted";
      else errors.push(`Row ${rowLine}: quote inside an unquoted field.`);
      if (state !== "quoted") field += char;
    } else {
      field += char;
      state = "unquoted";
    }
  }

  if (state === "quoted")
    errors.push(`Row ${rowLine}: unterminated quoted field.`);
  if (row.length || field.length || state !== "start") pushRow();
  return { rows, errors };
}

function stableId(company) {
  const normalized = company.trim().toLowerCase();
  const slug =
    normalized
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "company";
  let hash = 2166136261;
  for (const char of normalized) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `financial-${slug}-${(hash >>> 0).toString(36)}`;
}

export function parseFinancialCSV(input) {
  const errors = [];
  const warnings = [];
  if (typeof input !== "string") {
    return { records: [], errors: ["CSV input must be text."], warnings };
  }
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES) {
    return {
      records: [],
      errors: ["CSV exceeds the 1 MB size limit."],
      warnings,
    };
  }
  const parsed = parseRows(text);
  errors.push(...parsed.errors);
  const rows = parsed.rows;
  if (
    !rows.length ||
    (rows.length === 1 && rows[0].fields.every((value) => !value.trim()))
  ) {
    return {
      records: [],
      errors: [...errors, "Header row: CSV is empty."],
      warnings,
    };
  }

  const header = rows[0].fields.map((value) => value.trim().toLowerCase());
  const seen = new Set();
  header.forEach((name) => {
    if (seen.has(name))
      errors.push(`Header row: duplicate column “${name || "(blank)"}”.`);
    seen.add(name);
    if (!HEADERS.includes(name))
      errors.push(`Header row: unknown column “${name || "(blank)"}”.`);
  });
  HEADERS.filter((name) => !seen.has(name)).forEach((name) => {
    errors.push(`Header row: missing required column “${name}”.`);
  });

  const records = [];
  const companies = new Set();
  const indexes = Object.fromEntries(
    HEADERS.map((name) => [name, header.indexOf(name)]),
  );
  const dataRows = rows.slice(1);
  if (!dataRows.length)
    errors.push("CSV must contain at least one company row after the header.");
  if (dataRows.length > MAX_ROWS)
    errors.push(`CSV exceeds the ${MAX_ROWS} data-row limit.`);

  dataRows.forEach(({ fields, line }, rowIndex) => {
    const label = `Row ${line || rowIndex + 2}`;
    if (fields.length !== header.length) {
      errors.push(
        `${label}: expected ${header.length} fields but found ${fields.length}.`,
      );
      return;
    }
    fields.forEach((value) => {
      if (/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
        errors.push(`${label}: control characters are not allowed.`);
      }
    });
    const get = (name) => fields[indexes[name]]?.trim() ?? "";
    for (const name of ["company", "sector", "source"]) {
      if (!get(name)) errors.push(`${label}: ${name} is required.`);
    }
    const numeric = {};
    for (const name of ["revenue", "ebitda", "enterprise_value", "net_debt"]) {
      const value = get(name);
      if (
        !value ||
        !NUMBER_PATTERN.test(value) ||
        !Number.isFinite(Number(value))
      ) {
        errors.push(`${label}: ${name} must be a valid finite number.`);
      } else {
        numeric[name] = Number(value);
      }
    }
    if (numeric.revenue !== undefined && numeric.revenue <= 0) {
      errors.push(`${label}: revenue must be greater than zero.`);
    }
    if (
      numeric.enterprise_value !== undefined &&
      numeric.enterprise_value <= 0
    ) {
      errors.push(`${label}: enterprise_value must be greater than zero.`);
    }
    const normalizedCompany = get("company").toLowerCase();
    if (normalizedCompany) {
      if (companies.has(normalizedCompany))
        errors.push(`${label}: duplicate company “${get("company")}”.`);
      companies.add(normalizedCompany);
    }
    if (
      ["revenue", "ebitda", "enterprise_value", "net_debt"].some(
        (name) => numeric[name] === undefined,
      ) ||
      !get("company") ||
      !get("sector") ||
      !get("source")
    )
      return;

    const record = {
      id: stableId(get("company")),
      company: get("company"),
      sector: get("sector"),
      revenue: numeric.revenue,
      ebitda: numeric.ebitda,
      enterprise_value: numeric.enterprise_value,
      net_debt: numeric.net_debt,
      source: get("source"),
    };
    if (record.ebitda <= 0)
      warnings.push(
        `${label}: EBITDA is nonpositive; EBITDA-based multiples and returns may not be meaningful.`,
      );
    if (record.ebitda > record.revenue)
      warnings.push(`${label}: EBITDA exceeds revenue; verify the inputs.`);
    if (record.enterprise_value - record.net_debt < 0)
      warnings.push(`${label}: implied equity value is negative.`);
    records.push(record);
  });

  return { records: errors.length ? [] : records, errors, warnings };
}

export function calculateMetrics(record) {
  const {
    revenue,
    ebitda,
    enterprise_value: enterpriseValue,
    net_debt: netDebt,
  } = record;
  return {
    margin: (ebitda / revenue) * 100,
    evRevenue: enterpriseValue / revenue,
    evEbitda: ebitda > 0 ? enterpriseValue / ebitda : null,
    netLeverage: ebitda > 0 ? netDebt / ebitda : null,
    equityValue: enterpriseValue - netDebt,
  };
}

function validAssumptions(assumptions) {
  if (!assumptions || typeof assumptions !== "object") return false;
  const { growth, exitMargin, exitMultiple, years, debtPaydown } = assumptions;
  return (
    Number.isFinite(growth) &&
    growth >= -50 &&
    growth <= 100 &&
    Number.isFinite(exitMargin) &&
    exitMargin > 0 &&
    exitMargin <= 100 &&
    Number.isFinite(exitMultiple) &&
    exitMultiple >= 1 &&
    exitMultiple <= 40 &&
    Number.isInteger(years) &&
    years >= 1 &&
    years <= 10 &&
    Number.isFinite(debtPaydown) &&
    debtPaydown >= 0 &&
    debtPaydown <= 100
  );
}

export function modelReturns(record, assumptions) {
  if (
    !validAssumptions(assumptions) ||
    !record ||
    ![
      record.revenue,
      record.ebitda,
      record.enterprise_value,
      record.net_debt,
    ].every(Number.isFinite) ||
    record.revenue <= 0
  )
    return null;
  const entryEquity = record.enterprise_value - record.net_debt;
  const exitRevenue =
    record.revenue * (1 + assumptions.growth / 100) ** assumptions.years;
  const exitEbitda = (exitRevenue * assumptions.exitMargin) / 100;
  if (
    entryEquity <= 0 ||
    !Number.isFinite(entryEquity) ||
    exitEbitda <= 0 ||
    !Number.isFinite(exitRevenue) ||
    !Number.isFinite(exitEbitda)
  )
    return null;
  const exitEV = exitEbitda * assumptions.exitMultiple;
  const remainingDebt =
    record.net_debt >= 0
      ? record.net_debt * (1 - assumptions.debtPaydown / 100)
      : record.net_debt;
  const exitEquity = Math.max(0, exitEV - remainingDebt);
  const moic = exitEquity / entryEquity;
  if (![exitEV, remainingDebt, exitEquity, moic].every(Number.isFinite))
    return null;
  const irr = (moic ** (1 / assumptions.years) - 1) * 100;
  if (!Number.isFinite(irr)) return null;
  return {
    exitRevenue,
    exitEbitda,
    exitEV,
    exitEquity,
    entryEquity,
    remainingDebt,
    moic,
    irr,
  };
}

function money(value) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}m`;
}

function percent(value) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

export function createMemo(record, assumptions, review = {}) {
  const metrics = calculateMetrics(record);
  const modeled = modelReturns(record, assumptions);
  const lines = [
    `Investment screening memo — ${record.company}`,
    `Sector: ${record.sector}`,
    "All monetary values are USD millions.",
    `Memo status: ${review.thesis?.trim() && review.risks?.trim() ? "Analyst-written screening draft; not an investment recommendation." : "Incomplete draft — add an investment thesis and risks."}`,
    "",
    "Sourced inputs",
    `Source: ${record.source}`,
    `Revenue: ${money(record.revenue)} | EBITDA: ${money(record.ebitda)} | Enterprise value: ${money(record.enterprise_value)} | Net debt: ${money(record.net_debt)}`,
    "",
    "Entry metrics",
    `EBITDA margin: ${percent(metrics.margin)} | EV / revenue: ${metrics.evRevenue.toFixed(2)}x | EV / EBITDA: ${metrics.evEbitda === null ? "Not meaningful (EBITDA is nonpositive)" : `${metrics.evEbitda.toFixed(2)}x`}`,
    `Net leverage: ${metrics.netLeverage === null ? "Not meaningful (EBITDA is nonpositive)" : `${metrics.netLeverage.toFixed(2)}x`} | Implied equity value: ${money(metrics.equityValue)}`,
    "",
    "Modeled returns",
  ];
  if (validAssumptions(assumptions)) {
    lines.push(
      `Assumptions: revenue growth ${percent(assumptions.growth)} annually; exit EBITDA margin ${percent(assumptions.exitMargin)}; exit EV / EBITDA ${assumptions.exitMultiple}x; ${assumptions.years} years; debt paydown ${percent(assumptions.debtPaydown)}.`,
    );
  } else {
    lines.push(
      "Assumptions: Invalid or incomplete; no return estimate is available.",
    );
  }
  if (!modeled) {
    lines.push(
      "Not meaningful: assumptions are invalid, entry equity is nonpositive, or terminal EBITDA is nonpositive.",
    );
  } else {
    lines.push(
      `Exit revenue: ${money(modeled.exitRevenue)} | Exit EBITDA: ${money(modeled.exitEbitda)} | Exit EV: ${money(modeled.exitEV)} | Remaining debt: ${money(modeled.remainingDebt)} | Exit equity: ${money(modeled.exitEquity)}.`,
    );
    lines.push(
      `Entry equity: ${money(modeled.entryEquity)} | MOIC: ${modeled.moic.toFixed(2)}x | IRR: ${percent(modeled.irr)}.`,
    );
  }
  lines.push(
    "",
    "Limitations",
    "Simplified unlevered operating projection and equity bridge; excludes taxes, interest, fees, interim distributions, capex and working capital. Debt paydown is an assumption, not a cash-flow result. Uploaded data is user-provided and has not been independently verified.",
    "",
    `Review stage: ${review.stage?.trim() || "Not provided."}`,
    `Thesis: ${review.thesis?.trim() || "Not provided."}`,
    `Risks: ${review.risks?.trim() || "Not provided."}`,
  );
  return lines.join("\n");
}
