import React, { useEffect, useRef, useState } from "react";
import {
  CSV_TEMPLATE,
  parseFinancialCSV,
  calculateMetrics,
  modelReturns,
  createMemo,
} from "./analysis.js";
import {
  WORKSPACE_KEY,
  emptyWorkspace,
  defaultResearch,
  decisions,
  restoreWorkspace,
  financialCSV,
  downloadText,
  columns,
} from "./workspace.js";
import "./workbench.css";

const money = (value) =>
  Number.isFinite(value)
    ? `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}m`
    : "N/M";
const number = (value, suffix = "") =>
  Number.isFinite(value) ? `${value.toFixed(1)}${suffix}` : "N/M";
const inputSettings = [
  {
    key: "growth",
    label: "Annual revenue growth",
    min: -50,
    max: 100,
    step: 0.5,
    suffix: "%",
  },
  {
    key: "exitMargin",
    label: "Exit EBITDA margin",
    min: 0.1,
    max: 100,
    step: 0.1,
    suffix: "%",
  },
  {
    key: "exitMultiple",
    label: "Exit EV / EBITDA",
    min: 1,
    max: 40,
    step: 0.1,
    suffix: "×",
  },
  {
    key: "years",
    label: "Holding period",
    min: 1,
    max: 10,
    step: 1,
    suffix: "years",
  },
  {
    key: "debtPaydown",
    label: "Net debt repaid at exit",
    min: 0,
    max: 100,
    step: 1,
    suffix: "%",
  },
];

function Scenario({ record, research, onChange }) {
  const { assumptions } = research;
  const model = modelReturns(record, assumptions);
  const metrics = calculateMetrics(record);
  const qualityFlags = [
    record.ebitda <= 0 &&
      "Current EBITDA is nonpositive. Earnings multiples and net leverage are not meaningful.",
    record.ebitda > record.revenue &&
      "EBITDA exceeds revenue. Check accounting definitions and input units.",
    metrics.equityValue <= 0 &&
      "Entry equity is nonpositive. Equity MOIC and IRR are not meaningful.",
  ].filter(Boolean);
  const [tab, setTab] = useState("Model");
  const [edit, setEdit] = useState(false);
  const [memo, setMemo] = useState(false);
  const [financials, setFinancials] = useState(() =>
    Object.fromEntries(
      columns
        .filter((key) => !["company", "sector"].includes(key))
        .map((key) => [key, record[key]]),
    ),
  );
  const [editError, setEditError] = useState("");
  const memoRef = useRef(null);
  const memoText = createMemo(record, assumptions, research);
  const patch = (patch) => onChange({ ...research, ...patch });
  const sensitivity = [-2, 0, 2].map((deltaMultiple) =>
    [-5, 0, 5].map((deltaGrowth) => {
      const next = {
        ...assumptions,
        growth: assumptions.growth + deltaGrowth,
        exitMultiple: assumptions.exitMultiple + deltaMultiple,
      };
      return modelReturns(record, next);
    }),
  );
  useEffect(() => {
    if (memo) memoRef.current.showModal();
  }, [memo]);
  function saveFinancials(event) {
    event.preventDefault();
    const changed = { ...record, ...financials };
    const csv = [columns, columns.map((key) => changed[key])]
      .map((row) =>
        row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const parsed = parseFinancialCSV(csv);
    if (parsed.errors.length) {
      setEditError(parsed.errors.join(" "));
      return;
    }
    onChange(research, parsed.records[0]);
    setEdit(false);
    setEditError("");
  }
  return (
    <section
      className="analysis-detail panel"
      aria-label={`Analysis of ${record.company}`}
    >
      <div className="analysis-title">
        <div>
          <span className="eyebrow">COMPANY UNDER REVIEW</span>
          <h2>{record.company}</h2>
          <p>
            {record.sector} · {money(record.enterprise_value)} enterprise value
          </p>
        </div>
        <select
          aria-label="Investment decision"
          value={research.stage}
          onChange={(e) => patch({ stage: e.target.value })}
        >
          {decisions.map((stage) => (
            <option key={stage}>{stage}</option>
          ))}
        </select>
      </div>
      <div className="source-line">
        <span className="source-dot" />
        Source: <strong>{record.source}</strong>
        <span className="source-disclaimer">
          User-supplied · Not independently verified
        </span>
      </div>
      {qualityFlags.length > 0 && (
        <div className="validation-warnings" role="status">
          <strong>Financial data flags</strong>
          <ul>
            {qualityFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="analysis-kpis">
        {[
          ["EBITDA margin", number(metrics.margin, "%")],
          ["EV / EBITDA", number(metrics.evEbitda, "×")],
          ["Net debt / EBITDA", number(metrics.netLeverage, "×")],
          ["Entry equity value", money(metrics.equityValue)],
        ].map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="analysis-tabs" role="tablist" aria-label="Analysis view">
        {["Model", "Investment memo"].map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`tab-${name === "Model" ? "model" : "memo"}`}
            aria-controls="analysis-tabpanel"
            aria-selected={tab === name}
            tabIndex={tab === name ? 0 : -1}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? "Model"
                    : e.key === "End"
                      ? "Investment memo"
                      : tab === "Model"
                        ? "Investment memo"
                        : "Model";
                setTab(next);
                e.currentTarget.parentNode
                  .querySelector(`#tab-${next === "Model" ? "model" : "memo"}`)
                  ?.focus();
              }
            }}
            onClick={() => setTab(name)}
          >
            {name === "Model"
              ? "01  Returns & sensitivity"
              : "02  Thesis & decision"}
          </button>
        ))}
      </div>
      <div
        id="analysis-tabpanel"
        role="tabpanel"
        aria-labelledby={`tab-${tab === "Model" ? "model" : "memo"}`}
      >
        {tab === "Model" ? (
          <>
            <div className="model-heading">
              <div>
                <h3>What would have to be true?</h3>
                <p>Change the assumptions. Watch the equity outcome change.</p>
              </div>
              <button
                className="text-button"
                onClick={() =>
                  patch({ assumptions: defaultResearch(record).assumptions })
                }
              >
                Reset assumptions
              </button>
            </div>
            <div className="model-layout">
              <div className="assumption-controls">
                {inputSettings.map((setting) => (
                  <label className="assumption" key={setting.key}>
                    <span>
                      {setting.label}
                      <strong>
                        {number(
                          assumptions[setting.key],
                          setting.suffix === "years"
                            ? " years"
                            : setting.suffix,
                        )}
                      </strong>
                    </span>
                    <input
                      type="range"
                      aria-label={setting.label}
                      min={setting.min}
                      max={setting.max}
                      step={setting.step}
                      value={assumptions[setting.key]}
                      onChange={(e) =>
                        patch({
                          assumptions: {
                            ...assumptions,
                            [setting.key]: Number(e.target.value),
                          },
                        })
                      }
                    />
                    <span className="range-ends">
                      <span>
                        {setting.min}
                        {setting.suffix === "years" ? " yr" : setting.suffix}
                      </span>
                      <span>
                        {setting.max}
                        {setting.suffix === "years" ? " yr" : setting.suffix}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="model-outcome">
                <span className="eyebrow">ILLUSTRATIVE EQUITY RETURNS</span>
                <div className="return-pair">
                  <div>
                    <strong data-testid="modeled-irr">
                      {number(model?.irr, "%")}
                    </strong>
                    <span>Annualized IRR</span>
                  </div>
                  <div>
                    <strong data-testid="modeled-moic">
                      {number(model?.moic, "×")}
                    </strong>
                    <span>Equity MOIC</span>
                  </div>
                </div>
                {model ? (
                  <dl>
                    <div>
                      <dt>Exit revenue</dt>
                      <dd>{money(model.exitRevenue)}</dd>
                    </div>
                    <div>
                      <dt>Exit EBITDA</dt>
                      <dd>{money(model.exitEbitda)}</dd>
                    </div>
                    <div>
                      <dt>Exit enterprise value</dt>
                      <dd>{money(model.exitEV)}</dd>
                    </div>
                    <div>
                      <dt>Less: remaining net debt</dt>
                      <dd>{money(model.remainingDebt)}</dd>
                    </div>
                    <div>
                      <dt>Exit equity (floor at zero)</dt>
                      <dd>{money(model.exitEquity)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="model-warning" role="status">
                    Not meaningful: the entry equity must be positive and the
                    exit assumptions must produce positive EBITDA.
                  </p>
                )}
                <p className="model-fineprint">
                  No interim distributions. Debt paydown is an assumption, not a
                  cash-flow forecast. Net cash is held constant.
                </p>
              </div>
            </div>
            <div className="sensitivity">
              <div className="model-heading">
                <div>
                  <h3>How fragile is the return?</h3>
                  <p>Equity IRR · exit multiple versus annual revenue growth</p>
                </div>
              </div>
              <div className="table-scroll">
                <table aria-label="IRR sensitivity table">
                  <thead>
                    <tr>
                      <th>Exit EV / EBITDA ↓</th>
                      {[-5, 0, 5].map((g) => (
                        <th key={g}>
                          {number(assumptions.growth + g, "%")} growth
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivity.map((row, i) => (
                      <tr key={i}>
                        <th scope="row">
                          {number(
                            assumptions.exitMultiple + [-2, 0, 2][i],
                            "×",
                          )}
                        </th>
                        {row.map((result, j) => (
                          <td
                            key={j}
                            className={`${i === 1 && j === 1 ? "base-case " : ""}${result && result.irr < 0 ? "negative-return" : ""}`}
                          >
                            {number(result?.irr, "%")}
                            {i === 1 && j === 1 && <small>Current case</small>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="model-fineprint">
                Other assumptions held constant. N/M means not meaningful or
                outside supported model bounds. This is a sensitivity table, not
                a prediction.
              </p>
            </div>
            <details className="methodology">
              <summary>Methodology & limitations</summary>
              <div>
                <p>
                  Revenue at exit = current revenue × (1 + growth rate)
                  <sup>holding years</sup>. Exit EBITDA = exit revenue × exit
                  margin. Exit enterprise value = exit EBITDA × exit multiple.
                </p>
                <p>
                  Entry equity = enterprise value − net debt. Exit equity =
                  max(0, exit enterprise value − remaining net debt). MOIC =
                  exit equity / entry equity. IRR = (MOIC<sup>1 / years</sup> −
                  1) × 100. Negative EBITDA makes current earnings multiples and
                  leverage N/M.
                </p>
                <p>
                  This is a simplified equity bridge, not a complete LBO or DCF.
                  It excludes interest, taxes, fees, capex, working capital,
                  dilution and interim distributions. It does not establish
                  debt-service capacity or investment suitability. Negative net
                  debt represents net cash.
                </p>
                <p>
                  Companies are comparable only when their reporting periods,
                  accounting definitions and business models are comparable. No
                  automated credit rating, source verification or recommendation
                  is provided.
                </p>
              </div>
            </details>
            <button
              className="button primary continue-memo"
              onClick={() => setTab("Investment memo")}
            >
              Write the investment case →
            </button>
          </>
        ) : (
          <div className="memo-editor">
            <h3>Numbers inform the decision. Your judgment makes it.</h3>
            <p>
              Write the thesis, identify what could go wrong, and export a
              traceable screening memo.
            </p>
            <label htmlFor="investment-thesis">Investment thesis</label>
            <textarea
              id="investment-thesis"
              rows="5"
              maxLength={10000}
              value={research.thesis}
              onChange={(e) => patch({ thesis: e.target.value })}
              placeholder="Why this company? Where would growth or operating improvement come from? What evidence supports your view?"
            />
            <label htmlFor="investment-risks">
              Risks & open diligence questions
            </label>
            <textarea
              id="investment-risks"
              rows="5"
              maxLength={10000}
              value={research.risks}
              onChange={(e) => patch({ risks: e.target.value })}
              placeholder="Customer concentration, EBITDA adjustments, refinancing risk… What must you verify before proceeding?"
            />
            <div className="memo-ready">
              <span>
                {research.thesis.trim() && research.risks.trim()
                  ? "Thesis and risks captured. Ready for a screening discussion."
                  : "Draft memo: add both a thesis and risks before treating it as complete."}
              </span>
              <button className="button primary" onClick={() => setMemo(true)}>
                Preview & export memo →
              </button>
            </div>
          </div>
        )}
      </div>
      <details
        className="financial-editor"
        open={edit}
        onToggle={(e) => setEdit(e.currentTarget.open)}
      >
        <summary>Edit source financials</summary>
        <p>
          All amounts in USD millions. Changes update metrics, scenarios and the
          memo immediately. Source data is not verified.
        </p>
        <form onSubmit={saveFinancials}>
          <div className="financial-fields">
            {columns
              .filter((key) => !["company", "sector"].includes(key))
              .map((key) => (
                <label key={key} htmlFor={`financial-${key}`}>
                  {
                    {
                      revenue: "Revenue",
                      ebitda: "EBITDA",
                      enterprise_value: "Enterprise value",
                      net_debt: "Net debt",
                      source: "Source / reporting period",
                    }[key]
                  }
                  <input
                    id={`financial-${key}`}
                    type={key === "source" ? "text" : "number"}
                    step="any"
                    required
                    maxLength={key === "source" ? 300 : undefined}
                    value={financials[key]}
                    onChange={(e) =>
                      setFinancials({ ...financials, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
          </div>
          {editError && (
            <p className="validation-error" role="alert">
              {editError}
            </p>
          )}
          <button className="button secondary" type="submit">
            Apply financial changes
          </button>
        </form>
      </details>
      {memo && (
        <dialog
          ref={memoRef}
          className="memo-dialog"
          aria-labelledby="memo-title"
          onCancel={() => setMemo(false)}
        >
          <div className="memo-dialog-head">
            <h2 id="memo-title">Investment screening memo</h2>
            <button className="button secondary" onClick={() => setMemo(false)}>
              Close
            </button>
          </div>
          <p>
            Review this draft before sharing. It includes your inputs,
            assumptions and model limitations.
          </p>
          <pre>{memoText}</pre>
          <button
            className="button primary"
            onClick={() =>
              downloadText(
                `${record.company.replace(/[^a-z0-9]/gi, "-").slice(0, 70)}-screening-memo.txt`,
                memoText,
              )
            }
          >
            Download memo (.txt)
          </button>
        </dialog>
      )}
    </section>
  );
}

export default function Workbench() {
  const [loaded] = useState(() => {
    try {
      return restoreWorkspace(window.localStorage);
    } catch {
      return {
        workspace: emptyWorkspace(),
        warning:
          "Browser storage is unavailable. Work will only remain in this tab.",
      };
    }
  });
  const [workspace, setWorkspace] = useState(loaded.workspace);
  const [storageStatus, setStorageStatus] = useState(loaded.warning);
  const [changed, setChanged] = useState(false);
  const [pending, setPending] = useState(null);
  const [fileError, setFileError] = useState("");
  const [selectedId, setSelectedId] = useState(workspace.records[0]?.id || "");
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState("All decisions");
  const [sort, setSort] = useState("company");
  const [dragging, setDragging] = useState(false);
  const [clear, setClear] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => {
    if (!changed) return;
    try {
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
      setStorageStatus("Saved in this browser");
    } catch {
      setStorageStatus(
        "Not saved: browser storage is unavailable or full. Keep this tab open and download your memos and financials.",
      );
    }
  }, [workspace, changed]);
  const updateWorkspace = (next) => {
    setChanged(true);
    setWorkspace(next);
  };
  const selected = workspace.records.find((r) => r.id === selectedId);
  const hasWrittenCase = workspace.records.some(
    (record) =>
      workspace.research[record.id]?.thesis.trim() &&
      workspace.research[record.id]?.risks.trim(),
  );
  const visible = workspace.records
    .filter(
      (r) =>
        `${r.company} ${r.sector}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (decision === "All decisions" ||
          (workspace.research[r.id]?.stage || "In review") === decision),
    )
    .sort((a, b) =>
      sort === "company"
        ? a.company.localeCompare(b.company)
        : (calculateMetrics(a)[sort] ?? Infinity) -
          (calculateMetrics(b)[sort] ?? Infinity),
    );
  function preview(text, filename) {
    const result = parseFinancialCSV(text);
    setPending({ ...result, filename });
    setFileError("");
  }
  async function upload(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError(
        "Choose a CSV file. PDF and Excel workbooks are not supported; export your sheet as CSV first.",
      );
      setPending(null);
      return;
    }
    if (file.size > 1000000) {
      setFileError("File is too large. Maximum size is 1 MB.");
      setPending(null);
      return;
    }
    try {
      preview(await file.text(), file.name);
    } catch {
      setFileError(
        "This file could not be read. Try exporting it as UTF-8 CSV.",
      );
    }
  }
  function confirmImport() {
    if (!pending || pending.errors.length || !pending.records.length) return;
    updateWorkspace({
      records: pending.records,
      research: Object.fromEntries(
        pending.records.map((r) => [r.id, defaultResearch(r)]),
      ),
      provenance: pending.filename,
      importedAt: new Date().toISOString(),
    });
    setSelectedId(pending.records[0].id);
    setSearch("");
    setDecision("All decisions");
    setPending(null);
    setClear(false);
  }
  return (
    <div className="workbench">
      <div className="workbench-heading">
        <div>
          <span className="eyebrow">
            FROM RAW FINANCIALS TO INVESTMENT JUDGMENT
          </span>
          <h1>Your analyst workbench.</h1>
          <p>
            Bring the data. Challenge the assumptions. Build your investment
            case.
          </p>
        </div>
        <span className="local-badge">
          ◉ Local-first · No uploads to a server
        </span>
      </div>
      <div className="workbench-progress" aria-label="Analyst workflow">
        <span className={workspace.records.length ? "complete" : "current"}>
          <b>01</b>Import & validate
        </span>
        <i>→</i>
        <span
          className={
            hasWrittenCase
              ? "complete"
              : workspace.records.length
                ? "current"
                : ""
          }
        >
          <b>02</b>Compare & model
        </span>
        <i>→</i>
        <span className={hasWrittenCase ? "current" : ""}>
          <b>03</b>Decide & export
        </span>
      </div>
      <section className="import-panel panel">
        <div
          className={`upload-zone ${dragging ? "is-dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length !== 1) {
              setFileError("Import one CSV file at a time.");
              return;
            }
            upload(e.dataTransfer.files[0]);
          }}
        >
          <span className="upload-symbol" aria-hidden="true">
            ↥
          </span>
          <div>
            <h2>
              {workspace.records.length
                ? "Bring in a new dataset"
                : "Start with a company financials CSV"}
            </h2>
            <p>
              Drop a CSV here, or choose a file. Up to 200 companies · 1 MB ·
              USD millions.
            </p>
            <div className="upload-actions">
              <button
                className="button primary"
                onClick={() => fileRef.current.click()}
              >
                Choose CSV
              </button>
              <button
                className="button secondary"
                onClick={() =>
                  preview(CSV_TEMPLATE, "Illustrative sample dataset")
                }
              >
                Try sample data
              </button>
              <button
                className="text-button"
                onClick={() =>
                  downloadText(
                    "atlas-financials-template.csv",
                    CSV_TEMPLATE,
                    "text/csv;charset=utf-8;",
                  )
                }
              >
                Download CSV template ↗
              </button>
            </div>
          </div>
          <input
            ref={fileRef}
            id="financial-csv"
            type="file"
            accept=".csv,text/csv"
            aria-label="Upload company financials CSV"
            onChange={(e) => {
              upload(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </div>
        <details className="csv-requirements">
          <summary>CSV format & data handling</summary>
          <p>
            Required columns: <code>{columns.join(", ")}</code>. Use plain
            numbers without currency symbols or thousands separators. Monetary
            inputs must all be USD millions and use comparable reporting
            periods. Net debt = debt minus cash; it may be negative. Quote text
            containing commas.
          </p>
          <p>
            Source should identify the disclosure and reporting period (for
            example, “Company FY2025 annual report, p. 42”). Atlas validates
            structure and arithmetic, not the truth of a source. It does not
            fetch links or extract PDFs.
          </p>
          <p>
            Files are processed in this browser, not sent to a server. Confirmed
            data and analysis are saved in browser local storage, not encrypted.
            Use public or synthetic data on shared devices. Clearing browser
            data deletes the workspace.
          </p>
        </details>
        {fileError && (
          <p className="validation-error" role="alert">
            {fileError}
          </p>
        )}
        {pending && (
          <div className="import-preview" aria-live="polite">
            <div className="import-preview-heading">
              <h3>
                {pending.errors.length
                  ? "Fix these issues before importing"
                  : `${pending.records.length} companies ready to import`}
              </h3>
              <button className="text-button" onClick={() => setPending(null)}>
                Dismiss preview
              </button>
            </div>
            <p className="import-filename">{pending.filename}</p>
            {pending.errors.length > 0 ? (
              <ul className="validation-errors" role="alert">
                {pending.errors.slice(0, 20).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
                {pending.errors.length > 20 && (
                  <li>…and {pending.errors.length - 20} more issues.</li>
                )}
              </ul>
            ) : (
              <>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Revenue</th>
                        <th>EBITDA</th>
                        <th>Enterprise value</th>
                        <th>Net debt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.records.slice(0, 5).map((r) => (
                        <tr key={r.id}>
                          <td>{r.company}</td>
                          <td>{money(r.revenue)}</td>
                          <td>{money(r.ebitda)}</td>
                          <td>{money(r.enterprise_value)}</td>
                          <td>{money(r.net_debt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pending.records.length > 5 && (
                  <p>
                    Previewing the first 5 of {pending.records.length}{" "}
                    companies.
                  </p>
                )}
              </>
            )}
            {pending.warnings.length > 0 && (
              <div className="validation-warnings">
                <strong>Review flags — not a verification result</strong>
                <ul>
                  {pending.warnings.slice(0, 20).map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {!pending.errors.length && (
              <div className="import-confirm">
                <p>
                  {workspace.records.length
                    ? "This replaces your current dataset and all its saved scenarios, theses and decisions. Download your existing memos first."
                    : "All amounts are USD millions. Confirm only if the units and sources are correct."}
                </p>
                <button className="button primary" onClick={confirmImport}>
                  {workspace.records.length
                    ? "Replace workspace & import"
                    : "Confirm import & analyze"}{" "}
                  →
                </button>
              </div>
            )}
          </div>
        )}
      </section>
      {!workspace.records.length ? (
        <section className="workbench-empty">
          <div>
            <span>01 / DATA DISCIPLINE</span>
            <h3>Start with the evidence.</h3>
            <p>
              Import comparable financials with a source for every company.
              Catch invalid values before they reach the model.
            </p>
          </div>
          <div>
            <span>02 / PRIVATE-MARKET ECONOMICS</span>
            <h3>Understand the equity bridge.</h3>
            <p>
              Compare enterprise multiples and leverage. Stress growth, exit
              margins and multiples against a holding period.
            </p>
          </div>
          <div>
            <span>03 / INVESTMENT JUDGMENT</span>
            <h3>Make your reasoning visible.</h3>
            <p>
              Capture the thesis and unanswered questions. Export a memo that
              includes assumptions, outputs and limitations.
            </p>
          </div>
        </section>
      ) : (
        <>
          <div className="workspace-data-status">
            <div>
              <strong>{workspace.records.length} companies</strong>
              <span>
                {workspace.provenance} ·{" "}
                {new Date(workspace.importedAt).toLocaleDateString("en-US")}
              </span>
            </div>
            <span
              role="status"
              className={
                storageStatus.startsWith("Not saved") ? "save-error" : ""
              }
            >
              {storageStatus || "Stored locally in this browser"}
            </span>
          </div>
          <section className="panel comparison-panel">
            <div className="section-header">
              <div>
                <h2>Compare the opportunity set</h2>
                <p>
                  Same units, different economics. Select a company to
                  pressure-test the case.
                </p>
              </div>
              <button
                className="text-button"
                title="Spreadsheet-safe export: formula-like text receives a protective apostrophe."
                onClick={() =>
                  downloadText(
                    "atlas-workspace-financials.csv",
                    financialCSV(workspace.records),
                    "text/csv;charset=utf-8;",
                  )
                }
              >
                Export financials ↗
              </button>
            </div>
            <div className="comparison-tools">
              <input
                aria-label="Search imported companies"
                placeholder="Find a company or sector…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label="Filter investment decisions"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
              >
                <option>All decisions</option>
                {decisions.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              <select
                aria-label="Sort financial comparison"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="company">Company A–Z</option>
                <option value="evEbitda">EV / EBITDA ↑</option>
                <option value="netLeverage">Leverage ↑</option>
              </select>
            </div>
            <div className="table-scroll">
              <table aria-label="Company financial comparison">
                <thead>
                  <tr>
                    <th>Company / sector</th>
                    <th>Revenue</th>
                    <th>EBITDA margin</th>
                    <th>EV / EBITDA</th>
                    <th>Net leverage</th>
                    <th>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const m = calculateMetrics(r);
                    return (
                      <tr
                        key={r.id}
                        className={
                          selectedId === r.id ? "selected-company" : ""
                        }
                      >
                        <td>
                          <button
                            className="company-name"
                            aria-pressed={selectedId === r.id}
                            onClick={() => setSelectedId(r.id)}
                          >
                            {r.company}
                          </button>
                          <small className="comparison-sector">
                            {r.sector}
                          </small>
                        </td>
                        <td>{money(r.revenue)}</td>
                        <td>{number(m.margin, "%")}</td>
                        <td>{number(m.evEbitda, "×")}</td>
                        <td>{number(m.netLeverage, "×")}</td>
                        <td>
                          <span
                            className={`stage-label ${workspace.research[r.id]?.stage === "Shortlisted" ? "shortlisted" : ""}`}
                          >
                            {workspace.research[r.id]?.stage || "In review"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!visible.length && (
              <div className="empty-state">
                <h3>No companies match these filters.</h3>
                <button
                  className="button secondary"
                  onClick={() => {
                    setSearch("");
                    setDecision("All decisions");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
            <p className="comparison-note">
              {visible.length} of {workspace.records.length} companies ·
              Multiples are not credit ratings. N/M = not meaningful. Source
              periods are user-supplied.
            </p>
          </section>
          {selected && (
            <Scenario
              key={`${workspace.importedAt}-${selected.id}`}
              record={selected}
              research={
                workspace.research[selected.id] || defaultResearch(selected)
              }
              onChange={(research, changedRecord) =>
                updateWorkspace({
                  ...workspace,
                  records: changedRecord
                    ? workspace.records.map((r) =>
                        r.id === selected.id ? changedRecord : r,
                      )
                    : workspace.records,
                  research: { ...workspace.research, [selected.id]: research },
                })
              }
            />
          )}
          <div className="clear-workspace">
            <span>
              Sample deal explorer and this uploaded workspace are separate
              datasets.
            </span>
            {clear ? (
              <div>
                <strong>
                  Delete all imported data and analysis from this browser?
                </strong>
                <button
                  className="button danger"
                  onClick={() => {
                    updateWorkspace(emptyWorkspace());
                    setSelectedId("");
                    setClear(false);
                  }}
                >
                  Yes, clear workspace
                </button>
                <button
                  className="button secondary"
                  onClick={() => setClear(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button className="text-button" onClick={() => setClear(true)}>
                Clear imported workspace
              </button>
            )}
          </div>
        </>
      )}
      {loaded.warning && !changed && (
        <p className="validation-error" role="alert">
          {loaded.warning}
        </p>
      )}
      <footer className="workbench-footer">
        Built for transparent screening, not automated investment advice. No
        affiliation with any asset manager, ratings agency or data provider.
      </footer>
    </div>
  );
}
