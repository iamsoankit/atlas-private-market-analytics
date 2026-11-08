# Atlas — Private Market Analytics

Atlas is a local-first financial-screening and investment-research demo. The website is branded **Atlas · Private Market Intelligence**; this repository is **`atlas-private-market-analytics`**.

**[Open the live website](https://commercial-analytics-accelerator.vercel.app)** · **[GitHub repository](https://github.com/iamsoankit/atlas-private-market-analytics)**

The existing Commercial Analytics Vercel address is intentionally retained. It serves the Atlas interface; a repository rename does not require a new website.

## What works today

The default **Workbench** follows **import financials → compare companies → test assumptions → write and export a screening memo**. A separate illustrative deal explorer follows **discover → evaluate → shortlist**.

- **Workbench:** validated CSV imports, editable company financials, comparisons, return assumptions, sensitivity analysis, thesis and risk notes, investment decisions, financial CSV and plain-text memo exports.
- **Overview:** sample deal coverage, segment profitability, and an introduction to the deal-review workflow.
- **Deal pipeline:** search by company, sector, or transaction type; combine sector and review-stage filters.
- **Deal review:** open a company, read its illustrative brief and evidence context, capture notes, and choose Discovered, In review, Shortlisted, or Passed.
- **Shortlist:** revisit shortlisted sample deals.
- **Profit analytics:** compare sample segment revenue, EBITDA margin, and calculated EBITDA.
- **Pipeline export:** download the currently filtered sample deals, including saved review stages and notes, as CSV.

Imported Workbench companies and sample deals are separate datasets. Workbench decisions do not populate the sample explorer's Shortlist.

## Run locally

Use a maintained Node.js LTS release (Node.js 22+ recommended) and npm. Run the commands from the cloned repository:

```sh
git clone https://github.com/iamsoankit/atlas-private-market-analytics.git
cd atlas-private-market-analytics/frontend
npm ci
npm run dev
```

Open **http://127.0.0.1:4173**. The Vite configuration uses a strict port: stop the process occupying it or explicitly choose another port if startup fails.

No backend, database, environment variables, API keys, or paid data subscriptions are needed for the frontend. Uploaded financials are parsed in the browser, not sent to an analysis service. The interface loads Google Fonts when available and falls back to local fonts otherwise.

### Test and build

From `frontend/`:

```sh
npm test
npm run build
npm run preview
```

Tests use Node's built-in test runner and cover CSV validation, financial calculations, memo generation, filtering, exports and stored-data restoration. `npm run build` generates `frontend/dist/`; `npm run preview` serves that build locally at **http://127.0.0.1:4173**. Stop the dev server first because both commands use the same strict port. Preview is a local build check, not a production server.

The root lockfile is not a frontend installation entry point. Run npm commands in `frontend/`. Managed Preview uses port **5173**, with setup and run commands in `.hoplite/settings.json`.

## Repository map and architecture

| Path | Responsibility |
| --- | --- |
| `frontend/src/App.jsx` | Navigation, sample deal explorer, reviews and workspace guide |
| `frontend/src/Workbench.jsx` | CSV import, company analysis, assumptions and memo UI |
| `frontend/src/analysis.js` | CSV validation, financial metrics, return model and memo generation |
| `frontend/src/workspace.js` | Workbench persistence, defaults and exports |
| `frontend/src/data.js` | Illustrative deal/segment records and review filtering |
| `frontend/src/*.test.js` | Unit tests for model, import/export and persistence behavior |
| `frontend/src/index.css`, `workbench.css` | Responsive application styling |
| `frontend/vite.config.js` | React/Vite development and local preview configuration |
| `.hoplite/settings.json` | Managed workspace dependency installation and preview startup |
| `vercel.json` | Existing frontend/backend service routing declaration |
| `backend/` | Separate FastAPI mock endpoints and experimental Python CSV pipeline; not called by the UI |
| `database/schema.sql` | Empty placeholder; no active schema or migration |

The running UI uses **React 18, Vite 5, Recharts and CSS**, with Tailwind/PostCSS tooling configured. There is no Flask integration. The Python code is not the engine behind the Workbench: its calculations run in JavaScript in the browser.

### Backend status

`backend/main.py` contains static `/api/health` and `/api/analytics` responses. The health response's “Live Pipeline Active” label is mock text, not evidence of live ingestion. `backend/intelligence_pipeline.py` is a separate pandas/NumPy CSV transformation prototype; running the file directly only prints a module-loaded message. Its input format differs from the Workbench template. Neither module supplies data to the current UI.

`backend/requirements.txt` and `database/schema.sql` are currently empty. They do not provide a reproducible backend installation or database setup. Do not treat the scaffold as an operational ingestion, ownership-network, AI extraction, or server-storage service. Those would require separate implementation, dependency setup and verification.

## Deployment and repository naming

The live site remains **https://commercial-analytics-accelerator.vercel.app**. Keep the existing Vercel project and domain; do not create a replacement site just to match the repository name.

For the frontend build, the relevant directory is `frontend/`, installation is `npm ci`, build is `npm run build`, and output is `dist/` relative to that directory. The repository also retains its existing multi-service `vercel.json`; the backend route is not required by the current interface. Hosted project settings and Git integration are managed in Vercel, not by the README.

Changes should go through a feature branch and reviewed pull request into `main`. After merging, confirm that the existing Vercel project's production deployment uses the new `main` commit and check the unchanged public URL. After a repository rename, check the project's Git connection if deployment stops triggering. Do not assume a successful local build proves production updated.

Generated `dist/` and dependency `node_modules/` directories are ignored for new files, but this repository inherited tracked copies. Treat source files and `frontend/package-lock.json` as authoritative and rebuild; do not rely on the checked-in bundle as the current site. Removing the inherited artifacts is separate repository cleanup.

## Demo data and boundaries

This is a **portfolio/demo project**, not a live market-data platform, investment recommendation, credit rating, or production underwriting system. The fictional Northstar Capital workspace label is presentation only, not a logged-in organization. There is no affiliation with or endorsement by BlackRock, S&P Global, Preqin, or any other financial firm.

Sample companies, valuations, confidence scores, investment briefs and “Verified” labels are illustrative, not independently verified evidence. Segment analytics and sample deal valuations are separate datasets. Sample explorer records live in `frontend/src/data.js`; Workbench template records live in `frontend/src/analysis.js`.

There is no authentication, live market feed, document extraction, cloud sync, team sharing, database connection, or AI/API integration in the frontend. Backend scaffolding does not change those boundaries.

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

### Storage, exports and recovery

Sample deal reviews use `atlas-deal-reviews`; imported Workbench data uses `atlas-analyst-workspace-v1`. Both are browser local-storage keys, not server tables. Saved work belongs to the same browser profile and origin: localhost, a preview deployment and the production domain do not share it. Private browsing, blocked storage, clearing site data or deleting a browser profile can prevent persistence or remove saved work.

Export before replacing a dataset or clearing browser data. **Export financials** includes financial records, not a complete backup of thesis notes, decisions or model assumptions; use memo exports to retain the written analysis and assumptions for each company. There is no full-workspace backup/import feature. Clearing the imported workspace does not clear the separate sample-deal reviews.

For manual verification, try the sample data, confirm the import, change a return assumption, write a thesis, download a memo and reload on the same origin. Separately shortlist a sample deal and check the Shortlist tab. Verify desktop and narrow/mobile layouts when changing the UI.
