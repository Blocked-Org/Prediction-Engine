"use client";

import React, { useMemo } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MarkovNode {
  id: string;
  /** Display label for the node */
  label: string;
  /** 0–1 fraction of total traffic that reaches this node */
  trafficShare: number;
}

export interface MarkovEdge {
  from: string;
  to: string;
  /** Transition probability P(i→j) */
  probability: number;
}

export interface MarkovFunnelData {
  nodes: MarkovNode[];
  edges: MarkovEdge[];
}

interface MarkovFunnelChartProps {
  data: MarkovFunnelData;
  /** Canvas height in px (default: 340) */
  height?: number;
}

// ── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 120;
const NODE_H = 44;
const H_GAP = 160; // horizontal gap between columns
const V_GAP = 64;  // vertical gap between nodes in same column
const PAD_X = 60;
const PAD_Y = 40;

// Predefined column ordering for standard marketing funnel stages
const STAGE_ORDER: Record<string, number> = {
  start: 0,
  awareness: 0,
  organic: 0,
  social: 1,
  display: 1,
  search: 1,
  email: 2,
  retargeting: 2,
  consideration: 2,
  conversion: 3,
  converted: 3,
  null: 4,       // absorbed state – channel dropped
};

// Colour palette (indigo/emerald gradient, plus amber for absorbing state)
const NODE_COLOURS: Record<number, { fill: string; stroke: string; text: string }> = {
  0: { fill: "#e0e7ff", stroke: "#6366f1", text: "#3730a3" }, // indigo – top-of-funnel
  1: { fill: "#d1fae5", stroke: "#10b981", text: "#065f46" }, // emerald – mid-funnel
  2: { fill: "#fef3c7", stroke: "#f59e0b", text: "#92400e" }, // amber – lower-funnel
  3: { fill: "#f0fdf4", stroke: "#22c55e", text: "#166534" }, // green – conversion
  4: { fill: "#fee2e2", stroke: "#ef4444", text: "#991b1b" }, // red – null/absorbed
};

// ── Helper: resolve column for a node ────────────────────────────────────────
function resolveColumn(nodeId: string): number {
  const lower = nodeId.toLowerCase();
  for (const [key, col] of Object.entries(STAGE_ORDER)) {
    if (lower.includes(key)) return col;
  }
  return 1; // default: mid-funnel
}

// ── Helper: cubic bezier path between two rectangles ─────────────────────────
function cubicPath(
  x1: number, y1: number, // source centre-right
  x2: number, y2: number  // target centre-left
): string {
  const cp = (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * MarkovFunnelChart
 *
 * A pure SVG, zero-dependency component that visualises a Markov Chain
 * transition matrix as a directed funnel graph.
 *
 * Nodes are arranged in columns by funnel stage (awareness → consideration →
 * conversion). Edges are drawn as cubic Bézier curves whose stroke-width and
 * opacity encode the transition probability P(i→j).
 *
 * Fully reactive — re-renders whenever `data` changes (state-driven).
 */
export function MarkovFunnelChart({ data, height = 340 }: MarkovFunnelChartProps) {
  const { nodes, edges } = data;

  // ── Layout computation ──────────────────────────────────────────────────
  const { nodePositions, svgWidth, svgHeight } = useMemo(() => {
    // Group nodes by column
    const cols: Map<number, MarkovNode[]> = new Map();
    for (const node of nodes) {
      const col = resolveColumn(node.id);
      if (!cols.has(col)) cols.set(col, []);
      cols.get(col)!.push(node);
    }

    const numCols = Math.max(...Array.from(cols.keys())) + 1;
    const maxPerCol = Math.max(...Array.from(cols.values()).map((c) => c.length));

    const totalW = PAD_X * 2 + numCols * NODE_W + (numCols - 1) * H_GAP;
    const totalH = Math.max(
      height,
      PAD_Y * 2 + maxPerCol * NODE_H + (maxPerCol - 1) * V_GAP
    );

    const positions: Record<string, { x: number; y: number; col: number }> = {};

    for (const [colIdx, colNodes] of Array.from(cols.entries())) {
      const colX = PAD_X + colIdx * (NODE_W + H_GAP);
      const colTotalH = colNodes.length * NODE_H + (colNodes.length - 1) * V_GAP;
      const colStartY = (totalH - colTotalH) / 2;
      colNodes.forEach((node, i) => {
        positions[node.id] = {
          x: colX,
          y: colStartY + i * (NODE_H + V_GAP),
          col: colIdx,
        };
      });
    }

    return {
      nodePositions: positions,
      svgWidth: totalW,
      svgHeight: totalH,
    };
  }, [nodes, height]);

  // ── Edge rendering ──────────────────────────────────────────────────────
  const renderedEdges = useMemo(() => {
    return edges
      .filter(
        (e) =>
          nodePositions[e.from] &&
          nodePositions[e.to] &&
          e.from !== e.to &&
          e.probability > 0.01
      )
      .map((edge, i) => {
        const src = nodePositions[edge.from];
        const dst = nodePositions[edge.to];
        const x1 = src.x + NODE_W;
        const y1 = src.y + NODE_H / 2;
        const x2 = dst.x;
        const y2 = dst.y + NODE_H / 2;

        const strokeW = Math.max(1, edge.probability * 10);
        const opacity = 0.25 + edge.probability * 0.65;
        const col = NODE_COLOURS[src.col] ?? NODE_COLOURS[1];

        return (
          <g key={`edge-${i}`}>
            <path
              d={cubicPath(x1, y1, x2, y2)}
              fill="none"
              stroke={col.stroke}
              strokeWidth={strokeW}
              strokeOpacity={opacity}
              strokeLinecap="round"
            />
            {/* Probability label at midpoint */}
            <text
              x={(x1 + x2) / 2}
              y={(y1 + y2) / 2 - 6}
              textAnchor="middle"
              fontSize={10}
              fill="#64748b"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {(edge.probability * 100).toFixed(0)}%
            </text>
          </g>
        );
      });
  }, [edges, nodePositions]);

  // ── Node rendering ──────────────────────────────────────────────────────
  const renderedNodes = useMemo(() => {
    return nodes.map((node) => {
      const pos = nodePositions[node.id];
      if (!pos) return null;
      const colours = NODE_COLOURS[pos.col] ?? NODE_COLOURS[1];
      const barW = Math.max(4, node.trafficShare * NODE_W * 0.9);

      return (
        <g key={`node-${node.id}`} className="group">
          {/* Node rectangle */}
          <rect
            x={pos.x}
            y={pos.y}
            width={NODE_W}
            height={NODE_H}
            rx={8}
            ry={8}
            fill={colours.fill}
            stroke={colours.stroke}
            strokeWidth={1.5}
          />
          {/* Traffic-share bar at bottom of node */}
          <rect
            x={pos.x + (NODE_W - barW) / 2}
            y={pos.y + NODE_H - 6}
            width={barW}
            height={4}
            rx={2}
            fill={colours.stroke}
            opacity={0.6}
          />
          {/* Node label */}
          <text
            x={pos.x + NODE_W / 2}
            y={pos.y + NODE_H / 2 - 4}
            textAnchor="middle"
            fontSize={12}
            fontWeight={600}
            fill={colours.text}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {node.label}
          </text>
          {/* Traffic share sub-label */}
          <text
            x={pos.x + NODE_W / 2}
            y={pos.y + NODE_H / 2 + 10}
            textAnchor="middle"
            fontSize={9}
            fill={colours.text}
            opacity={0.75}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {(node.trafficShare * 100).toFixed(1)}% traffic
          </text>
        </g>
      );
    });
  }, [nodes, nodePositions]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No Markov chain data available.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Markov funnel transition diagram"
        role="img"
      >
        {/* Arrow-head marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Stage column headers */}
        {["Awareness", "Consideration", "Lower-Funnel", "Conversion"].map(
          (label, i) => (
            <text
              key={`header-${i}`}
              x={PAD_X + i * (NODE_W + H_GAP) + NODE_W / 2}
              y={PAD_Y / 2}
              textAnchor="middle"
              fontSize={10}
              fill="#94a3b8"
              fontWeight={500}
              letterSpacing="0.05em"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {label.toUpperCase()}
            </text>
          )
        )}

        {/* Edges (drawn first so nodes sit on top) */}
        {renderedEdges}

        {/* Nodes */}
        {renderedNodes}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(NODE_COLOURS)
          .slice(0, 4)
          .map(([col, c]) => {
            const labels = ["Top-of-funnel", "Mid-funnel", "Lower-funnel", "Conversion"];
            return (
              <span key={col} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-sm border"
                  style={{ backgroundColor: c.fill, borderColor: c.stroke }}
                />
                {labels[Number(col)]}
              </span>
            );
          })}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-5 rounded-full bg-slate-400 opacity-60" />
          Edge width ∝ P(i→j)
        </span>
      </div>
    </div>
  );
}
