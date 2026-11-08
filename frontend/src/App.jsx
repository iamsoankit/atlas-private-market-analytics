import React, { useEffect, useId, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import Workbench from "./Workbench.jsx";
import { deals, segments, stages, readReviews, filterDeals } from "./data";

function Icon({ name, size = 20, ...props }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    deals: (
      <>
        <rect x="3" y="6" width="18" height="15" rx="2" />
        <path d="M8 6V3h8v3M3 12h18M10 12v3h4v-3" />
      </>
    ),
    chart: (
      <>
        <path d="M4 3v17h17M8 15v-4m5 4V6m5 9V9" />
      </>
    ),
    bookmark: <path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4Z" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    up: <path d="m5 16 6-6 4 4 5-9m-6 0h6v6" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    down: <path d="m8 10 4 4 4-4" />,
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .5-1.5 1-1.5 2M12 16v1" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.grid}
    </svg>
  );
}

function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={wide ? "detail-dialog" : "guide-dialog"}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-head">
        <span className="eyebrow">ATLAS INTELLIGENCE</span>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  );
}

function DealDetail({ deal, review, onSave, onClose }) {
  const [stage, setStage] = useState(review?.stage || "Discovered");
  const [notes, setNotes] = useState(review?.notes || "");
  return (
    <Modal title={deal.name} onClose={onClose} wide>
      <p className="muted">
        {deal.sector} <span className="dot-separator">·</span> {deal.region}
      </p>
      <div className="detail-metrics">
        <div>
          <small>Deal value</small>
          <strong>${deal.value}M</strong>
        </div>
        <div>
          <small>Data confidence</small>
          <strong>{deal.confidence}%</strong>
        </div>
        <div>
          <small>EBITDA margin</small>
          <strong>{deal.margin}%</strong>
        </div>
      </div>
      <div className="disclosure">
        <Icon name="shield" />
        <p>
          <strong>Illustrative opportunity</strong>
          <br />
          Sample data for exploring the workflow. Confidence scores are not
          investment recommendations.
        </p>
      </div>
      <h3>Investment brief</h3>
      <p className="brief">{deal.description}</p>
      <dl className="deal-facts">
        <div>
          <dt>Transaction</dt>
          <dd>{deal.type}</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>{deal.source}</dd>
        </div>
        <div>
          <dt>Verification</dt>
          <dd>
            {deal.confidence >= 95
              ? "Sample evidence verified"
              : "Further verification needed"}
          </dd>
        </div>
      </dl>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(deal.id, { stage, notes });
        }}
      >
        <label htmlFor="review-stage">Review stage</label>
        <select
          id="review-stage"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          {stages.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label htmlFor="review-notes">Your diligence notes</label>
        <textarea
          id="review-notes"
          rows="4"
          placeholder="What makes this interesting? What needs a closer look?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={5000}
        />
        <p className="storage-note">
          Saved in this browser only. No account or cloud sync.
        </p>
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            Save review <Icon name="check" size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

const navigation = [
  { title: "Workbench", icon: "chart" },
  { title: "Overview", icon: "grid" },
  { title: "Deal pipeline", icon: "deals" },
  { title: "Profit analytics", icon: "chart" },
  { title: "Shortlist", icon: "bookmark" },
];

export default function App() {
  const [page, setPage] = useState("Workbench");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All sectors");
  const [stage, setStage] = useState("All stages");
  const [reviews, setReviews] = useState(() => {
    try {
      return readReviews(window.localStorage);
    } catch {
      return {};
    }
  });
  const [selected, setSelected] = useState(null);
  const [guide, setGuide] = useState(false);
  const [notice, setNotice] = useState("");
  const shortlistCount = deals.filter(
    (d) => reviews[d.id]?.stage === "Shortlisted",
  ).length;
  const reviewedCount = deals.filter(
    (d) => reviews[d.id] && reviews[d.id].stage !== "Discovered",
  ).length;
  const visible = filterDeals(
    deals,
    { query, sector, stage, shortlist: page === "Shortlist" },
    reviews,
  );
  const activeDeals = deals.filter(
    (deal) => reviews[deal.id]?.stage !== "Passed",
  );
  const totalValue = deals.reduce((total, deal) => total + deal.value, 0);
  const navigate = (title) => {
    setPage(title);
    setQuery("");
    setSector("All sectors");
    setStage("All stages");
  };
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  function saveReview(id, review) {
    const next = { ...reviews, [id]: review };
    try {
      window.localStorage.setItem("atlas-deal-reviews", JSON.stringify(next));
    } catch {
      setNotice(
        "Browser storage is unavailable. Your review could not be saved.",
      );
      return;
    }
    setReviews(next);
    setSelected(null);
    setNotice("Review saved. Your pipeline is up to date.");
  }
  function exportDeals() {
    const rows = [
      [
        "Company",
        "Sector",
        "Deal type",
        "Value (USD millions)",
        "Confidence (%)",
        "Review stage",
        "Notes",
      ],
      ...visible.map((d) => [
        d.name,
        d.sector,
        d.type,
        d.value,
        d.confidence,
        reviews[d.id]?.stage || "Discovered",
        reviews[d.id]?.notes || "",
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value)
                .replace(/^[=+@\-\t\r]/, "'$&")
                .replaceAll('"', '""')}"`,
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "atlas-deal-pipeline.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${visible.length} opportunities.`);
  }
  const table = (
    <section className="panel deals-panel">
      <div className="section-header">
        <div>
          <h2>
            {page === "Shortlist"
              ? "Your investment shortlist"
              : page === "Deal pipeline"
                ? "Explore opportunities"
                : "Opportunities worth a closer look"}
          </h2>
          <p>
            {page === "Shortlist"
              ? "Your highest-conviction ideas, all in one place."
              : "Discover, evaluate, and move the right deals forward."}
          </p>
        </div>
        {page === "Overview" && (
          <button
            className="text-button"
            onClick={() => navigate("Deal pipeline")}
          >
            View pipeline <Icon name="arrow" size={16} />
          </button>
        )}
      </div>
      <div className="table-tools">
        <div className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Search opportunities"
            placeholder="Search companies or sectors…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select
            aria-label="Filter by sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          >
            <option>All sectors</option>
            {[...new Set(deals.map((d) => d.sector))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Filter by stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option>All stages</option>
            {stages.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Company / sector</th>
              <th>Transaction</th>
              <th>Deal value</th>
              <th>Confidence</th>
              <th>Stage</th>
              <th>
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((deal) => (
              <tr key={deal.id}>
                <td>
                  <div className="company-cell">
                    <span className={`company-mark ${deal.color}`}>
                      {deal.initials}
                    </span>
                    <div>
                      <button
                        className="company-name"
                        onClick={() => setSelected(deal)}
                      >
                        {deal.name}
                      </button>
                      <small>{deal.sector}</small>
                    </div>
                  </div>
                </td>
                <td className="transaction">{deal.type}</td>
                <td className="deal-value">${deal.value}M</td>
                <td>
                  <span
                    className={`confidence ${deal.confidence >= 95 ? "verified" : "needs-review"}`}
                  >
                    <span className="status-dot" />
                    {deal.confidence}%{" "}
                    <span className="confidence-label">
                      {deal.confidence >= 95 ? "Verified" : "Review"}
                    </span>
                  </span>
                </td>
                <td>
                  <span
                    className={`stage-label ${reviews[deal.id]?.stage === "Shortlisted" ? "shortlisted" : ""}`}
                  >
                    {reviews[deal.id]?.stage || "Discovered"}
                  </span>
                </td>
                <td>
                  <button
                    className="row-action"
                    aria-label={`Review ${deal.name}`}
                    onClick={() => setSelected(deal)}
                  >
                    <Icon name="arrow" size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && (
        <div className="empty-state">
          <Icon name={page === "Shortlist" ? "bookmark" : "search"} size={30} />
          <h3>
            {page === "Shortlist" && !shortlistCount
              ? "Your next great investment starts here."
              : "No matching opportunities"}
          </h3>
          <p>
            {page === "Shortlist" && !shortlistCount
              ? "Open a deal, review the brief, and set its stage to Shortlisted."
              : "Try another search or reset your filters."}
          </p>
          <button
            className="button secondary"
            onClick={() =>
              page === "Shortlist" && !shortlistCount
                ? navigate("Deal pipeline")
                : (setQuery(""),
                  setSector("All sectors"),
                  setStage("All stages"))
            }
          >
            {page === "Shortlist" && !shortlistCount
              ? "Explore the pipeline"
              : "Clear filters"}
            <Icon name="arrow" size={16} />
          </button>
        </div>
      )}
      <div className="table-footer">
        <span>
          Showing {visible.length} of{" "}
          {page === "Shortlist" ? shortlistCount : deals.length} opportunities
        </span>
        <span>USD · Illustrative dataset</span>
      </div>
    </section>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Overview");
          }}
        >
          <span className="brand-mark">
            a<span>.</span>
          </span>
          <span>
            atlas<span className="brand-sub">PRIVATE MARKET INTELLIGENCE</span>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">N</span>
          <div>
            Northstar Capital<small>Investment workspace</small>
          </div>
          <span className="workspace-badge">DEMO</span>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.title}
              className={page === item.title ? "nav-item active" : "nav-item"}
              onClick={() => navigate(item.title)}
              aria-current={page === item.title ? "page" : undefined}
            >
              <Icon name={item.icon} />
              {item.title}
              {item.title === "Shortlist" && (
                <span className="nav-count">{shortlistCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="guide-card">
            <span className="guide-symbol">✧</span>
            <h3>A clearer path to conviction.</h3>
            <p>From market signal to your next investment decision.</p>
            <button onClick={() => setGuide(true)}>
              Explore the workflow <Icon name="arrow" size={16} />
            </button>
          </div>
          <button className="help-link" onClick={() => setGuide(true)}>
            <Icon name="help" size={18} />
            Workspace guide
          </button>
          <div className="profile">
            <span className="avatar">NC</span>
            <div>
              Northstar team<small>Demo workspace</small>
            </div>
            <span className="profile-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-status">
              <span className="status-dot" />
              {page === "Workbench"
                ? "Analyst workspace"
                : "Sample deal explorer"}
            </span>
            <span className="topbar-divider" />
            <span className="topbar-monogram">NC</span>
          </div>
        </header>
        <main>
          <div hidden={page !== "Workbench"}>
            <Workbench />
          </div>
          {page !== "Workbench" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR EDGE IN PRIVATE MARKETS</div>
                  <h1>
                    {page === "Overview"
                      ? "See the opportunity. Make your move."
                      : page}
                  </h1>
                  <p>
                    {page === "Overview"
                      ? "Turn market intelligence into a focused investment pipeline."
                      : page === "Deal pipeline"
                        ? "One place to discover, assess, and progress your next investment."
                        : page === "Profit analytics"
                          ? "Look beyond the headline. Understand where value is created."
                          : "Less noise. More conviction. Focus on the opportunities you believe in."}
                  </p>
                </div>
                <button
                  className="button secondary export-button"
                  onClick={exportDeals}
                >
                  <Icon name="download" size={17} />
                  Export deals
                </button>
              </div>
              {page === "Overview" && (
                <section className="hero">
                  <div className="hero-copy">
                    <span className="hero-tag">
                      <span />
                      THE INVESTMENT WORKFLOW
                    </span>
                    <h2>
                      Good decisions start
                      <br />
                      with a clearer picture.
                    </h2>
                    <p>
                      Find the signal. Do the diligence.
                      <br />
                      Build a pipeline with purpose.
                    </p>
                    <button
                      className="button lime"
                      onClick={() => navigate("Workbench")}
                    >
                      Analyze your own data <Icon name="arrow" size={17} />
                    </button>
                  </div>
                  <div className="workflow-steps">
                    {[
                      {
                        num: "01",
                        title: "Discover",
                        text: "Surface opportunities across private markets.",
                        icon: "globe",
                      },
                      {
                        num: "02",
                        title: "Evaluate",
                        text: "Check confidence. Understand the economics.",
                        icon: "shield",
                      },
                      {
                        num: "03",
                        title: "Build conviction",
                        text: "Capture your thesis and curate your shortlist.",
                        icon: "bookmark",
                      },
                    ].map((step) => (
                      <div className="workflow-step" key={step.num}>
                        <div className="step-icon">
                          <Icon name={step.icon} size={21} />
                        </div>
                        <div>
                          <span className="step-number">{step.num}</span>
                          <h3>{step.title}</h3>
                          <p>{step.text}</p>
                        </div>
                        <Icon name="arrow" size={18} />
                      </div>
                    ))}
                  </div>
                  <div className="hero-orbit orbit-one" />
                  <div className="hero-orbit orbit-two" />
                </section>
              )}
              {page !== "Shortlist" && (
                <section className="metrics" aria-label="Workspace metrics">
                  {[
                    {
                      label: "Tracked deal value",
                      value: `$${totalValue}M`,
                      detail: "Across all opportunities",
                      icon: "deals",
                      accent: "Sample market coverage",
                    },
                    {
                      label: "Active opportunities",
                      value: String(activeDeals.length).padStart(2, "0"),
                      detail: `Across ${new Set(activeDeals.map((deal) => deal.sector)).size} sectors`,
                      icon: "globe",
                      accent: "A world of possibilities",
                    },
                    {
                      label: "High-confidence deals",
                      value: "03",
                      detail: "95%+ confidence score",
                      icon: "shield",
                      accent: "Evidence, not guesswork",
                    },
                    {
                      label: "Your shortlist",
                      value: String(shortlistCount).padStart(2, "0"),
                      detail: `${reviewedCount} of 6 opportunities reviewed`,
                      icon: "bookmark",
                      accent: "From discovery to conviction",
                    },
                  ].map((metric) => (
                    <div className="metric" key={metric.label}>
                      <div className="metric-title">
                        {metric.label}
                        <Icon name={metric.icon} size={18} />
                      </div>
                      <strong>{metric.value}</strong>
                      <span>{metric.detail}</span>
                      <div className="metric-foot">
                        <span className="tiny-dot" />
                        {metric.accent}
                      </div>
                    </div>
                  ))}
                </section>
              )}
              {(page === "Overview" || page === "Profit analytics") && (
                <div className="insight-grid">
                  <section className="panel chart-panel">
                    <div className="section-header">
                      <div>
                        <span className="eyebrow">PROFIT CUBE</span>
                        <h2>Where profitability takes shape</h2>
                        <p>EBITDA margin by customer segment</p>
                      </div>
                      <span className="subtle-tag">Sample portfolio</span>
                    </div>
                    <div className="chart-wrap">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={segments}
                          margin={{ top: 16, right: 15, left: -22, bottom: 0 }}
                          barSize={56}
                        >
                          <CartesianGrid
                            strokeDasharray="3 5"
                            vertical={false}
                            stroke="#e8ebe6"
                          />
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#747b74", fontSize: 11 }}
                            interval={0}
                            dy={10}
                          />
                          <YAxis
                            tickFormatter={(value) => `${value}%`}
                            domain={[0, 40]}
                            ticks={[0, 10, 20, 30, 40]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#879087", fontSize: 11 }}
                          />
                          <Tooltip
                            cursor={{ fill: "#f3f5ef" }}
                            formatter={(value) => [
                              `${value}%`,
                              "EBITDA margin",
                            ]}
                            contentStyle={{
                              borderRadius: 10,
                              border: "1px solid #e2e7dc",
                              fontSize: 12,
                            }}
                          />
                          <Bar
                            dataKey="margin"
                            radius={[5, 5, 0, 0]}
                            isAnimationActive={false}
                          >
                            {segments.map((s, i) => (
                              <Cell
                                key={s.name}
                                fill={["#294b3b", "#8da17b", "#d2deae"][i]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-caption">
                      <span className="chart-legend" />
                      Enterprise SaaS leads at <strong>34.5%</strong>
                      <span className="chart-caption-right">
                        3 segments analyzed
                      </span>
                    </div>
                  </section>
                  <section className="focus-panel">
                    <div className="focus-top">
                      <span className="eyebrow">THE BIG PICTURE</span>
                      <span className="focus-spark">✧</span>
                    </div>
                    <h2>
                      Follow the value.
                      <br />
                      Not just the volume.
                    </h2>
                    <p>
                      Enterprise SaaS combines the highest revenue with the
                      strongest margin in this sample portfolio.
                    </p>
                    <div className="focus-stat">
                      <strong>
                        34.5<span>%</span>
                      </strong>
                      <span>
                        Enterprise SaaS
                        <br />
                        EBITDA margin
                      </span>
                    </div>
                    <div className="focus-bottom">
                      <span>
                        <Icon name="up" size={16} />
                        15.1 pp ahead of DeepTech / AI
                      </span>
                      <button
                        onClick={() => {
                          navigate("Deal pipeline");
                          setSector("Enterprise SaaS");
                        }}
                        aria-label="Explore Enterprise SaaS deals"
                      >
                        <Icon name="arrow" size={20} />
                      </button>
                    </div>
                  </section>
                </div>
              )}
              {page === "Profit analytics" ? (
                <section className="panel segment-panel">
                  <div className="section-header">
                    <div>
                      <h2>The economics, side by side</h2>
                      <p>Illustrative segment revenue and calculated EBITDA.</p>
                    </div>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Customer segment</th>
                          <th>Revenue</th>
                          <th>EBITDA margin</th>
                          <th>Implied EBITDA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {segments.map((s) => (
                          <tr key={s.name}>
                            <td>
                              <strong>{s.name}</strong>
                            </td>
                            <td>${s.revenue.toLocaleString("en-US")}</td>
                            <td>{s.margin}%</td>
                            <td>
                              $
                              {Math.round(
                                (s.revenue * s.margin) / 100,
                              ).toLocaleString("en-US")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="analytics-note">
                    Segment analytics and deal valuations are separate sample
                    datasets; segment revenue is not deal value.
                  </p>
                </section>
              ) : (
                table
              )}
              <footer className="page-footer">
                <span>
                  <span className="footer-brand">atlas.</span> Clarity for your
                  next move.
                </span>
                <span>Demo workspace · Not investment advice</span>
              </footer>
            </>
          )}
        </main>
      </div>
      {selected && (
        <DealDetail
          key={selected.id}
          deal={selected}
          review={reviews[selected.id]}
          onSave={saveReview}
          onClose={() => setSelected(null)}
        />
      )}
      {guide && (
        <Modal title="A pipeline with purpose." onClose={() => setGuide(false)}>
          <p className="workbench-guide">
            <strong>Start in Workbench:</strong> import a financials CSV or try
            the sample, confirm validation, select a company, adjust return
            assumptions, then write and export a screening memo. Data and
            analysis stay in this browser. The other tabs are a separate sample
            deal explorer.
          </p>
          <p className="brief">
            Atlas helps you turn private-market opportunities into a deliberate
            investment shortlist.
          </p>
          <ol className="guide-steps">
            <li>
              <strong>Discover your next opportunity</strong>
              <p>
                Search the deal pipeline by company, sector, or transaction
                type. Filter to focus your research.
              </p>
            </li>
            <li>
              <strong>Evaluate the evidence</strong>
              <p>
                Open a company to review its brief, confidence score, and
                economics. Mark it In review and capture your diligence notes.
              </p>
            </li>
            <li>
              <strong>Build your shortlist</strong>
              <p>
                Set promising deals to Shortlisted, or mark them Passed. Export
                the filtered pipeline as a CSV whenever you need it.
              </p>
            </li>
          </ol>
          <div className="disclosure">
            <p>
              This is an interactive demo with illustrative data. Reviews stay
              in this browser. No live market feeds or account sync are
              connected.
            </p>
          </div>
          <button
            className="button primary"
            onClick={() => {
              setGuide(false);
              navigate("Deal pipeline");
            }}
          >
            Start exploring <Icon name="arrow" size={17} />
          </button>
        </Modal>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
