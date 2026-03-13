import { useRef, useEffect, useState } from 'react';

// ─── Palette ─────────────────────────────────────────────────────────────────
// Vibrant but cohesive — avoids the pure-primary "cartoon" look while being
// more interesting than flat desaturated tones.
const PALETTE = {
  total:       '#1e40af', // indigo-800
  http200:     '#166534', // green-800
  noHttp200:   '#991b1b', // red-800
  wellKnown:   '#155e75', // cyan-800
  nonWellKnown:'#475569', // slate-600
  validJson:   '#14532d', // green-900 (slightly darker to differentiate)
  invalidJson: '#92400e', // amber-800
};

const FLOW_OPACITY = 0.22;

import type { SmartSankeyMetrics } from '@/api/types';

// ─── Types ───────────────────────────────────────────────────────────────────
interface SankeyData {
  totalEndpoints:     number;
  http200:            number;
  wellKnownHttp200:   number;
  wellKnownValidJson: number;
}

interface SNode {
  id:      string;
  label:   string;
  value:   number;
  pctLabel: string;
  x: number; y: number; w: number; h: number;
  color: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const NODE_W   = 136;
const MIN_H    = 20;
// Space between siblings in one column — must be large enough for one text row
const COL_GAP  = 28;
// How tall the whole chart area is (nodes scale to this)
const CHART_H  = 300;
// Extra vertical padding above/below chart for column-header text
const HEADER_H = 22;
// Extra space below chart for node labels (one line of text)
const FOOTER_H = 32;

const SVG_H = HEADER_H + CHART_H + FOOTER_H;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString(); }
function pct(num: number, den: number) {
  return den ? `${Math.round((num / den) * 100)}%` : '0%';
}

/**
 * Cubic-bezier filled ribbon between two vertical edge-slices of source→dest.
 * (x0) is the right edge of source node; (x1) is the left edge of dest node.
 * y0..y1 are the slice extents on the SOURCE side.
 * y2..y3 are the slice extents on the DEST side.
 */
function ribbon(x0: number, y0: number, y1: number, x1: number, y2: number, y3: number): string {
  const mx = (x0 + x1) / 2;
  return [
    `M${x0} ${y0}`,
    `C${mx} ${y0} ${mx} ${y2} ${x1} ${y2}`,
    `L${x1} ${y3}`,
    `C${mx} ${y3} ${mx} ${y1} ${x0} ${y1}`,
    'Z',
  ].join(' ');
}

// ─── Layout ──────────────────────────────────────────────────────────────────
function buildLayout(data: SankeyData, availW: number) {
  const { totalEndpoints, http200, wellKnownHttp200, wellKnownValidJson } = data;
  const noHttp200       = totalEndpoints - http200;
  const nonWellKnown    = http200 - wellKnownHttp200;
  const wellKnownNoJson = wellKnownHttp200 - wellKnownValidJson;

  // Scale a value to a pixel height based on total — but cap columns at CHART_H
  // minus the gap between siblings so the pair always fits.
  const scaleH = (v: number) =>
    Math.max(MIN_H, Math.round((v / totalEndpoints) * (CHART_H - COL_GAP)));

  const h: Record<string, number> = {
    total:    CHART_H,  // single node → fills full chart height
    http200:  scaleH(http200),
    noH200:   scaleH(noHttp200),
    wk:       scaleH(wellKnownHttp200),
    nonWK:    scaleH(nonWellKnown),
    validJ:   scaleH(wellKnownValidJson),
    invalidJ: scaleH(wellKnownNoJson),
  };

  // Column x positions — evenly space 4 columns across availW
  const GAP_W = Math.max(80, (availW - NODE_W * 4) / 3);
  const cx = (col: number) => col * (NODE_W + GAP_W);

  // Vertically centre a pair of sibling nodes
  const centreTop = (hA: number, hB: number) =>
    HEADER_H + (CHART_H - hA - COL_GAP - hB) / 2;

  // Column 0: single node (total)
  const y_total = HEADER_H + 0;   // fills full CHART_H, no centring needed

  // Column 1
  const y1 = centreTop(h.http200, h.noH200);

  // Column 2
  const y2 = centreTop(h.wk, h.nonWK);

  // Column 3
  const y3 = centreTop(h.validJ, h.invalidJ);

  const nodes: SNode[] = [
    { id: 'total',       label: 'Total Indexed',  value: totalEndpoints,    pctLabel: '100%',                              x: cx(0), y: y_total,                   w: NODE_W, h: h.total,    color: PALETTE.total },
    { id: 'http200',     label: 'HTTP 200',        value: http200,           pctLabel: pct(http200, totalEndpoints),        x: cx(1), y: y1,                         w: NODE_W, h: h.http200,  color: PALETTE.http200 },
    { id: 'noHttp200',   label: 'No HTTP 200',     value: noHttp200,         pctLabel: pct(noHttp200, totalEndpoints),      x: cx(1), y: y1 + h.http200 + COL_GAP,   w: NODE_W, h: h.noH200,   color: PALETTE.noHttp200 },
    { id: 'wellKnown',   label: 'Well-Known URI',  value: wellKnownHttp200,  pctLabel: pct(wellKnownHttp200, http200),      x: cx(2), y: y2,                         w: NODE_W, h: h.wk,       color: PALETTE.wellKnown },
    { id: 'nonWellKnown',label: 'Other Endpoints', value: nonWellKnown,      pctLabel: pct(nonWellKnown, http200),          x: cx(2), y: y2 + h.wk + COL_GAP,        w: NODE_W, h: h.nonWK,    color: PALETTE.nonWellKnown },
    { id: 'validJson',   label: 'Valid JSON',      value: wellKnownValidJson,pctLabel: pct(wellKnownValidJson, wellKnownHttp200), x: cx(3), y: y3,                  w: NODE_W, h: h.validJ,   color: PALETTE.validJson },
    { id: 'invalidJson', label: 'No Valid JSON',   value: wellKnownNoJson,   pctLabel: pct(wellKnownNoJson, wellKnownHttp200),   x: cx(3), y: y3 + h.validJ + COL_GAP, w: NODE_W, h: h.invalidJ, color: PALETTE.invalidJson },
  ];

  const byId = (id: string) => nodes.find((n) => n.id === id)!;
  const N = {
    total:  byId('total'),
    h200:   byId('http200'),
    noH200: byId('noHttp200'),
    wk:     byId('wellKnown'),
    nonWK:  byId('nonWellKnown'),
    validJ: byId('validJson'),
    invalidJ: byId('invalidJson'),
  };

  // ── Flows: KEY FIX ──────────────────────────────────────────────────────────
  // The source-side slice of each ribbon must be PROPORTIONAL to the source
  // node's own height — NOT globally scaled from totalEndpoints.
  // This ensures slices always add up to exactly the source node's height.

  const srcX = (n: SNode) => n.x + n.w;

  // Source: total → [http200, noHttp200]
  // total is split proportionally: http200 / totalEndpoints * total.h
  const total_http200_h  = N.total.h * (http200 / totalEndpoints);
  const total_noH200_h   = N.total.h * (noHttp200 / totalEndpoints);

  // Source: http200 → [wellKnown, nonWellKnown]
  // http200.h is split proportionally by wellKnownHttp200 / http200
  const h200_wk_h    = N.h200.h * (wellKnownHttp200 / http200);
  const h200_nonWK_h = N.h200.h * (nonWellKnown / http200);

  // Source: wellKnown → [validJson, invalidJson]
  // wk.h is split proportionally by wellKnownValidJson / wellKnownHttp200
  // NOTE: invalidJson is 67/52838 ≈ 0.13% — a tiny sliver at the bottom of wk.
  const wk_validJ_h   = N.wk.h * (wellKnownValidJson / wellKnownHttp200);
  const wk_invalidJ_h = N.wk.h * (wellKnownNoJson / wellKnownHttp200);
  // Enforce minimum visual source slice of 3px so the ribbon is always visible
  const wk_invalidJ_h_vis = Math.max(wk_invalidJ_h, 3);

  const flows = [
    // total → http200
    ribbon(srcX(N.total), N.total.y,                           N.total.y + total_http200_h,
           N.h200.x,      N.h200.y,                            N.h200.y + N.h200.h),
    // total → noHttp200
    ribbon(srcX(N.total), N.total.y + total_http200_h,         N.total.y + total_http200_h + total_noH200_h,
           N.noH200.x,    N.noH200.y,                          N.noH200.y + N.noH200.h),
    // http200 → wellKnown
    ribbon(srcX(N.h200), N.h200.y,                             N.h200.y + h200_wk_h,
           N.wk.x,        N.wk.y,                              N.wk.y + N.wk.h),
    // http200 → nonWellKnown
    ribbon(srcX(N.h200), N.h200.y + h200_wk_h,                 N.h200.y + h200_wk_h + h200_nonWK_h,
           N.nonWK.x,     N.nonWK.y,                           N.nonWK.y + N.nonWK.h),
    // wellKnown → validJson
    ribbon(srcX(N.wk),  N.wk.y,                                N.wk.y + wk_validJ_h,
           N.validJ.x,   N.validJ.y,                           N.validJ.y + N.validJ.h),
    // wellKnown → invalidJson (thin ribbon from bottom edge of wk node)
    ribbon(srcX(N.wk),  N.wk.y + N.wk.h - wk_invalidJ_h_vis,   N.wk.y + N.wk.h,
           N.invalidJ.x, N.invalidJ.y,                          N.invalidJ.y + N.invalidJ.h),
  ] as const;

  const flowColors = [
    PALETTE.http200, PALETTE.noHttp200,
    PALETTE.wellKnown, PALETTE.nonWellKnown,
    PALETTE.validJson, PALETTE.invalidJson,
  ];

  return { nodes, flows, flowColors, totalSvgW: cx(3) + NODE_W };
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props { 
  metrics?: SmartSankeyMetrics;
}

const COL_HEADERS = ['All Endpoints', 'HTTP Response', 'Well-Known URI', 'JSON Validity'];

export function SmartSankeyChart({ metrics }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availW, setAvailW] = useState(760);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Map API metrics
  const data: SankeyData = {
    totalEndpoints: metrics?.total_indexed || 0,
    http200: metrics?.http200 || 0,
    wellKnownHttp200: metrics?.well_known || 0,
    wellKnownValidJson: metrics?.valid_json || 0,
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setAvailW(Math.max(480, el.clientWidth - 48))
    );
    ro.observe(el);
    setAvailW(Math.max(480, el.clientWidth - 48));
    return () => ro.disconnect();
  }, []);

  const { nodes, flows, flowColors, totalSvgW } = buildLayout(data, availW);

  return (
    <div
      ref={containerRef}
      className="rounded-md bg-white mb-6"
      style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-gray-lighter)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold text-lg text-navy-900">SMART-on-FHIR Endpoint Flow</h3>
      </div>
      <p className="text-sm text-neutral-500 mb-4">
        How total indexed endpoints flow through HTTP response success, well-known URI support, and valid JSON.
      </p>

      {/* Chart */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${totalSvgW} ${SVG_H}`}
          width="100%"
          style={{ minWidth: 480, display: 'block', overflow: 'visible' }}
          aria-label="SMART-on-FHIR endpoint Sankey diagram"
        >
          {/* Column header labels */}
          {nodes
            .filter((_n, i) => [0, 1, 3, 5].includes(i)) // one per column (top node)
            .map((n, i) => (
              <text
                key={`hdr-${i}`}
                x={n.x + NODE_W / 2}
                y={HEADER_H - 6}
                textAnchor="middle"
                dominantBaseline="auto"
                fill="#94a3b8"
                fontSize={9.5}
                fontWeight={700}
                letterSpacing={0.8}
                fontFamily="'Source Sans 3', sans-serif"
                style={{ textTransform: 'uppercase' }}
              >
                {COL_HEADERS[i]}
              </text>
            ))}

          {/* Flows — behind nodes */}
          {flows.map((path, i) => (
            <path
              key={`flow-${i}`}
              d={path}
              fill={flowColors[i]}
              fillOpacity={FLOW_OPACITY}
              stroke={flowColors[i]}
              strokeOpacity={0.06}
              strokeWidth={0.5}
            />
          ))}

          {/* Nodes */}
          {nodes.map((n) => {
            const isHovered = hoveredId === n.id;
            const cx = n.x + n.w / 2;

            return (
              <g
                key={n.id}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: 'default' }}
              >
                {/* Node rect */}
                <rect
                  x={n.x} y={n.y} width={n.w} height={n.h}
                  rx={3}
                  fill={n.color}
                  fillOpacity={isHovered ? 1 : 0.9}
                  stroke={n.color}
                  strokeWidth={isHovered ? 2 : 0}
                  style={{ transition: 'fill-opacity 120ms, stroke-width 120ms' }}
                />

                {/* Value + pct inside the node.
                    invalidJson is too small for two lines → single combined line.
                    All other nodes: stacked value / pct (pct always non-bold). */}
                {n.id === 'invalidJson' ? (
                  <text
                    x={cx} y={n.y + n.h / 2}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="white" fillOpacity={0.9}
                    fontSize={9} fontWeight={700}
                    fontFamily="'Source Sans 3', sans-serif"
                  >
                    {fmt(n.value)} · {n.pctLabel}
                  </text>
                ) : (
                  <>
                    <text
                      x={cx}
                      y={n.y + n.h / 2 - (n.h >= 50 ? 8 : 6)}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="white" fillOpacity={0.95}
                      fontSize={n.h >= 50 ? 12 : 9.5} fontWeight={700}
                      fontFamily="'Source Sans 3', sans-serif"
                    >
                      {fmt(n.value)}
                    </text>
                    <text
                      x={cx}
                      y={n.y + n.h / 2 + (n.h >= 50 ? 8 : 6)}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="white" fillOpacity={0.65}
                      fontSize={n.h >= 50 ? 10 : 9}
                      fontFamily="'Source Sans 3', sans-serif"
                    >
                      {n.pctLabel}
                    </text>
                  </>
                )}

                {/* Label below node — always shown */}
                <text
                  x={cx}
                  y={n.y + n.h + 8}
                  textAnchor="middle" dominantBaseline="hanging"
                  fill="#334155"
                  fontSize={10} fontWeight={700}
                  fontFamily="'Source Sans 3', sans-serif"
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
