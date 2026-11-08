import { parseFinancialCSV } from "./analysis.js";

export const WORKSPACE_KEY = "atlas-analyst-workspace-v1";
export const columns = [
  "company",
  "sector",
  "revenue",
  "ebitda",
  "enterprise_value",
  "net_debt",
  "source",
];
export const emptyWorkspace = () => ({
  records: [],
  research: {},
  provenance: "",
  importedAt: "",
});
export const defaultAssumptions = (record) => ({
  growth: 8,
  exitMargin: Math.min(
    100,
    Math.max(5, (record.ebitda / record.revenue) * 100),
  ),
  exitMultiple: Math.min(
    40,
    Math.max(
      1,
      record.ebitda > 0 ? record.enterprise_value / record.ebitda : 10,
    ),
  ),
  years: 5,
  debtPaydown: 25,
});
export const defaultResearch = (record) => ({
  stage: "In review",
  thesis: "",
  risks: "",
  assumptions: defaultAssumptions(record),
});
export const decisions = ["In review", "Shortlisted", "Passed"];
const bounds = {
  growth: [-50, 100],
  exitMargin: [0.1, 100],
  exitMultiple: [1, 40],
  years: [1, 10],
  debtPaydown: [0, 100],
};

export function financialCSV(records) {
  return [
    columns,
    ...records.map((record) => columns.map((key) => record[key])),
  ]
    .map((row) =>
      row
        .map(
          (value) =>
            `"${(typeof value === "number" ? String(value) : String(value).replace(/^[=+@\-\t\r]/, "'$&")).replaceAll('"', '""')}"`,
        )
        .join(","),
    )
    .join("\r\n");
}

function rawCSV(records) {
  return [
    columns,
    ...records.map((record) => columns.map((key) => record[key])),
  ]
    .map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\r\n");
}

export function restoreWorkspace(storage) {
  try {
    const raw = storage.getItem(WORKSPACE_KEY);
    if (!raw) return { workspace: emptyWorkspace(), warning: "" };
    const saved = JSON.parse(raw);
    if (!saved || !Array.isArray(saved.records) || saved.records.length > 200)
      throw Error("Invalid workspace");
    if (!saved.records.length)
      return { workspace: emptyWorkspace(), warning: "" };
    const parsed = parseFinancialCSV(rawCSV(saved.records));
    if (parsed.errors.length) throw Error("Invalid records");
    const research = {};
    for (const record of parsed.records) {
      const candidate = saved.research?.[record.id];
      const fallback = defaultResearch(record);
      if (!candidate || typeof candidate !== "object") {
        research[record.id] = fallback;
        continue;
      }
      const assumptions = { ...fallback.assumptions };
      for (const [key, [min, max]] of Object.entries(bounds)) {
        const value = candidate.assumptions?.[key];
        if (
          Number.isFinite(value) &&
          value >= min &&
          value <= max &&
          (key !== "years" || Number.isInteger(value))
        )
          assumptions[key] = value;
      }
      research[record.id] = {
        stage: decisions.includes(candidate.stage)
          ? candidate.stage
          : fallback.stage,
        thesis:
          typeof candidate.thesis === "string"
            ? candidate.thesis.slice(0, 10000)
            : "",
        risks:
          typeof candidate.risks === "string"
            ? candidate.risks.slice(0, 10000)
            : "",
        assumptions,
      };
    }
    return {
      workspace: {
        records: parsed.records,
        research,
        provenance: String(saved.provenance || "Restored dataset").slice(
          0,
          200,
        ),
        importedAt:
          typeof saved.importedAt === "string" &&
          Number.isFinite(Date.parse(saved.importedAt))
            ? saved.importedAt
            : new Date().toISOString(),
      },
      warning: "",
    };
  } catch {
    return {
      workspace: emptyWorkspace(),
      warning:
        "The saved workspace could not be restored. Import your CSV again. Existing browser data has not been overwritten.",
    };
  }
}

export function downloadText(name, text, type = "text/plain;charset=utf-8;") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
