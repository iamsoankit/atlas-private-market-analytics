export const deals = [
  {
    id: "nexus",
    name: "Nexus Data Systems",
    initials: "ND",
    sector: "Enterprise SaaS",
    type: "M&A acquisition",
    value: 78,
    confidence: 99,
    region: "North America",
    color: "purple",
    description:
      "Enterprise data infrastructure and analytics software. Review recurring revenue quality and customer concentration before progressing.",
    source: "Sample acquisition disclosure",
    margin: 34.5,
  },
  {
    id: "aura",
    name: "Aura Health Solutions",
    initials: "AH",
    sector: "Healthcare",
    type: "Series C growth",
    value: 34,
    confidence: 82,
    region: "Europe",
    color: "pink",
    description:
      "Digital health platform raising growth capital. Disclosure ambiguity needs further diligence; validate the ownership structure and reported valuation.",
    source: "Sample funding announcement",
    margin: 22.8,
  },
  {
    id: "vanguard",
    name: "Vanguard Logistics",
    initials: "VL",
    sector: "Logistics",
    type: "Corporate buyout",
    value: 110,
    confidence: 95,
    region: "North America",
    color: "orange",
    description:
      "Technology-enabled logistics operator. Assess operational efficiency, debt exposure and the durability of long-term customer contracts.",
    source: "Sample buyout disclosure",
    margin: 18.6,
  },
  {
    id: "meridian",
    name: "Meridian Financial",
    initials: "MF",
    sector: "Mid-Market FinTech",
    type: "Growth equity",
    value: 52,
    confidence: 97,
    region: "Europe",
    color: "blue",
    description:
      "Payments infrastructure for mid-market businesses. Evaluate regulatory exposure and the expansion of transaction-based revenue.",
    source: "Sample investor announcement",
    margin: 28.1,
  },
  {
    id: "helix",
    name: "Helix AI",
    initials: "HA",
    sector: "DeepTech / AI",
    type: "Series B",
    value: 45,
    confidence: 88,
    region: "Asia Pacific",
    color: "green",
    description:
      "Applied AI tooling for enterprise teams. Validate compute costs, retention and defensibility of the underlying technology.",
    source: "Sample funding announcement",
    margin: 19.4,
  },
  {
    id: "terra",
    name: "Terra Energy",
    initials: "TE",
    sector: "Clean Energy",
    type: "Growth equity",
    value: 26,
    confidence: 91,
    region: "Europe",
    color: "yellow",
    description:
      "Distributed renewable energy services. Review project economics, capital requirements and the contracted revenue backlog.",
    source: "Sample investment disclosure",
    margin: 24.2,
  },
];
export const segments = [
  { name: "Enterprise SaaS", revenue: 620000, margin: 34.5 },
  { name: "Mid-Market FinTech", revenue: 410000, margin: 28.1 },
  { name: "DeepTech / AI", revenue: 290000, margin: 19.4 },
];
export const stages = ["Discovered", "In review", "Shortlisted", "Passed"];

export function readReviews(storage) {
  try {
    const value = JSON.parse(storage.getItem("atlas-deal-reviews") || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([id, review]) =>
          deals.some((deal) => deal.id === id) &&
          review &&
          stages.includes(review.stage) &&
          typeof review.notes === "string",
      ),
    );
  } catch {
    return {};
  }
}

export function filterDeals(
  items,
  {
    query = "",
    sector = "All sectors",
    stage = "All stages",
    shortlist = false,
  },
  reviews,
) {
  return items.filter((deal) => {
    const status = reviews[deal.id]?.stage || "Discovered";
    return (
      `${deal.name} ${deal.sector} ${deal.type}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (sector === "All sectors" || deal.sector === sector) &&
      (stage === "All stages" || status === stage) &&
      (!shortlist || status === "Shortlisted")
    );
  });
}
