import { render, screen } from "@testing-library/react";
import {
  MarkovFunnelChart,
  generateMockMarkovData,
  type MarkovFunnelData,
} from "../MarkovFunnelChart";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SIMPLE_DATA: MarkovFunnelData = {
  nodes: [
    { id: "organic", label: "Organic", trafficShare: 0.3 },
    { id: "social", label: "Social", trafficShare: 0.25 },
    { id: "retargeting", label: "Retargeting", trafficShare: 0.2 },
    { id: "converted", label: "Converted", trafficShare: 0.15 },
    { id: "null", label: "Churned", trafficShare: 0.1 },
  ],
  edges: [
    { from: "organic", to: "social", probability: 0.45 },
    { from: "organic", to: "null", probability: 0.55 },
    { from: "social", to: "retargeting", probability: 0.4 },
    { from: "social", to: "null", probability: 0.6 },
    { from: "retargeting", to: "converted", probability: 0.6 },
    { from: "retargeting", to: "null", probability: 0.4 },
  ],
};

// ── Tests: MarkovFunnelChart ──────────────────────────────────────────────────

describe("MarkovFunnelChart", () => {
  it("renders an SVG element", () => {
    render(<MarkovFunnelChart data={SIMPLE_DATA} />);
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("renders a node label for each node in the data", () => {
    render(<MarkovFunnelChart data={SIMPLE_DATA} />);
    for (const node of SIMPLE_DATA.nodes) {
      expect(screen.getByText(node.label)).toBeInTheDocument();
    }
  });

  it("renders column stage headers", () => {
    render(<MarkovFunnelChart data={SIMPLE_DATA} />);
    expect(screen.getByText("AWARENESS")).toBeInTheDocument();
    expect(screen.getByText("CONVERSION")).toBeInTheDocument();
  });

  it("renders the legend", () => {
    render(<MarkovFunnelChart data={SIMPLE_DATA} />);
    expect(screen.getByText(/Top-of-funnel/i)).toBeInTheDocument();
    // "Conversion" appears in both the column header and the legend — use getAllByText
    expect(screen.getAllByText(/Conversion/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Edge width/i)).toBeInTheDocument();
  });

  it("renders an accessible SVG with aria-label", () => {
    render(<MarkovFunnelChart data={SIMPLE_DATA} />);
    const svg = document.querySelector("svg");
    expect(svg).toHaveAttribute("aria-label");
    expect(svg).toHaveAttribute("role", "img");
  });

  it("shows an empty-state message when nodes array is empty", () => {
    const emptyData: MarkovFunnelData = { nodes: [], edges: [] };
    render(<MarkovFunnelChart data={emptyData} />);
    expect(
      screen.getByText(/No Markov chain data available/i)
    ).toBeInTheDocument();
  });

  it("renders edge probability labels as percentages", () => {
    render(<MarkovFunnelChart data={SIMPLE_DATA} />);
    // P(organic→social) = 0.45 → renders as "45%"
    const pctLabels = screen.getAllByText(/^\d+%$/);
    expect(pctLabels.length).toBeGreaterThan(0);
  });

  it("does not crash with self-loop edges (filtered out)", () => {
    const dataWithSelfLoop: MarkovFunnelData = {
      nodes: SIMPLE_DATA.nodes,
      edges: [
        ...SIMPLE_DATA.edges,
        { from: "organic", to: "organic", probability: 0.1 }, // self-loop
      ],
    };
    expect(() =>
      render(<MarkovFunnelChart data={dataWithSelfLoop} />)
    ).not.toThrow();
  });
});

// ── Tests: generateMockMarkovData ─────────────────────────────────────────────

describe("generateMockMarkovData", () => {
  const channels = ["Meta", "Google", "TikTok"];
  const result = generateMockMarkovData(channels);

  it("includes a node for each input channel", () => {
    for (const ch of channels) {
      const found = result.nodes.some(
        (n) => n.id === ch.toLowerCase().replace(/\s+/g, "_")
      );
      expect(found).toBe(true);
    }
  });

  it("always includes organic, retargeting, converted, and null nodes", () => {
    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain("organic");
    expect(ids).toContain("retargeting");
    expect(ids).toContain("converted");
    expect(ids).toContain("null");
  });

  it("all trafficShare values are between 0 and 1", () => {
    for (const node of result.nodes) {
      expect(node.trafficShare).toBeGreaterThan(0);
      expect(node.trafficShare).toBeLessThanOrEqual(1);
    }
  });

  it("all edge probabilities are between 0 and 1", () => {
    for (const edge of result.edges) {
      expect(edge.probability).toBeGreaterThan(0);
      expect(edge.probability).toBeLessThanOrEqual(1);
    }
  });

  it("generates edges with valid from/to node ids", () => {
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    for (const edge of result.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });
});
