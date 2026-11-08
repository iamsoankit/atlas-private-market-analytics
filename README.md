# Atlas · Private Market Intelligence

An interactive investment workspace with a clear goal: **discover opportunities → evaluate evidence → build an investment shortlist**.

## Run locally

Requires Node.js 20.19+ or 22+ and npm.

```sh
cd frontend
npm ci
npm run dev
```

Open the address printed by Vite (port 4173 by default). Managed Preview uses port 5173 through `.hoplite/settings.json`, which also installs dependencies from the correct directory.

```sh
cd frontend
npm test
npm run build
```

## The workflow

- **Overview:** sample deal coverage, profitability by segment, and an introduction to the investment workflow.
- **Deal pipeline:** search by company, sector, or transaction type; combine sector and review-stage filters.
- **Deal review:** open a company, read its investment brief and evidence context, capture diligence notes, and choose Discovered, In review, Shortlisted, or Passed.
- **Shortlist:** revisit shortlisted opportunities. Reviews persist across reloads in this browser using local storage.
- **Profit analytics:** compare sample segment revenue, EBITDA margin, and calculated EBITDA.
- **Export:** download the currently filtered deal list, including saved review stages and notes, as CSV.

## Data and scope

This is a **demo**, not a live market-data platform or investment recommendation. Companies, valuations, confidence scores, and investment briefs are illustrative. Segment analytics and deal valuations are separate sample datasets. Sample records live in `frontend/src/data.js`.

Reviews are saved under `atlas-deal-reviews` in browser local storage. There is no authentication, shared team state, or cloud sync. Clearing browser data removes reviews. Do not enter confidential investment information into a shared browser.

The existing FastAPI backend and Python intelligence pipeline remain available in `backend/`, but the demo UI does not call them. Live ingestion, verified source documents, and server-backed review storage would be separate integration work.

## Analyst workbench · upload to investment memo

The default Workbench is a separate, working financial-screening workspace. It does not blend user data with the illustrative deal explorer.

1. Download the CSV template, fill it with public/synthetic data, or choose **Try sample data**.
2. Upload a `.csv` (UTF-8, at most 1 MB / 200 companies). Inspect row-level errors, warnings and the preview before confirming. Import is atomic: invalid files never partially replace your data. A confirmed new dataset replaces the previous dataset and its analysis.
3. Compare company revenue, EBITDA margin, EV/EBITDA and net leverage; search, sort, filter decisions, and select a company.
4. Adjust annual revenue growth, exit margin, exit EV/EBITDA, hold period, and assumed debt paydown. The model updates equity MOIC, annualized IRR and a growth/multiple sensitivity table immediately. Source financials can also be edited.
5. Write a thesis and risks, set the investment decision, preview the screening memo, and download it as plain text. The memo includes inputs, source, assumptions, outputs and limitations. Export current financials as CSV for reuse.

Required columns: `company,sector,revenue,ebitda,enterprise_value,net_debt,source`. Monetary amounts are **USD millions**, not raw dollars. Use plain numbers without currency symbols or thousands separators and quote text containing commas. Negative EBITDA and negative net debt (net cash) are supported. Source should identify a disclosure and reporting period; the app does not authenticate that source or extract PDF/Excel files.

### Model conventions

- Entry equity = enterprise value − net debt.
- Exit revenue = revenue × (1 + annual growth)^holding years.
- Exit EBITDA = exit revenue × assumed exit margin.
- Exit enterprise value = exit EBITDA × assumed exit EV/EBITDA.
- Remaining positive net debt = entry net debt × (1 − assumed paydown). Entry net cash is held constant.
- Exit equity = max(0, exit enterprise value − remaining net debt).
- MOIC = exit equity / entry equity; IRR = (MOIC^(1/years) − 1) × 100, with no interim distributions.

This is a **simplified equity-return bridge**, not a complete LBO, DCF, underwriting model or credit rating. Debt paydown is an independent assumption, not cash-flow-derived. Taxes, interest, fees, capex, working capital, dilution and interim distributions are excluded. Nonpositive current EBITDA gives N/M earnings multiples and net leverage; nonpositive entry equity gives N/M modeled returns. Sensitivities are not forecasts. Meaningful comparisons require consistent financial definitions and reporting periods.

### Local data handling

CSV parsing, modeling and memo creation run client-side, without AI API keys or a backend. Confirmed data and analysis autosave to `atlas-analyst-workspace-v1` in local storage. They persist across reloads on the same browser/origin but are not encrypted, shared or synced. Storage failures are surfaced; use exports before closing the tab. Clearing the imported workspace removes its records, assumptions, decisions and notes from the app. Browser/profile deletion removes saved work. Do not use confidential employer or customer data on a shared device.

Financial CSV exports are spreadsheet-safe: text starting with formula-like characters is prefixed with an apostrophe. Numeric negatives remain numeric. Reimporting such text preserves the protective apostrophe, so a company name beginning with one of those characters will not round-trip unchanged. Memo text is exported verbatim, not as spreadsheet formulas.
