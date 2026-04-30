import { useState, useCallback, useRef, useEffect } from "react";

// ─── CONSTANTS ───
const COLORS = {
  bg: "#0a0e17",
  card: "#111827",
  cardBorder: "#1e293b",
  accent1: "#3b82f6",
  accent2: "#f59e0b",
  accent3: "#10b981",
  accent4: "#ef4444",
  text: "#e2e8f0",
  textDim: "#94a3b8",
  textMuted: "#64748b",
  grid: "#1e293b",
  highlight: "rgba(59,130,246,0.15)",
};

// ─── UTILS ───
function generatePoints(n, seed = 42) {
  let s = seed;
  const rng = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: rng() * 90 + 5,
    y: rng() * 90 + 5,
  }));
}

// ─── KD-TREE LOGIC ───
function buildKdTree(points, depth = 0, bounds = { x0: 0, y0: 0, x1: 100, y1: 100 }) {
  if (points.length === 0) return null;
  if (points.length === 1) return { point: points[0], depth, bounds, left: null, right: null };
  const axis = depth % 2 === 0 ? "x" : "y";
  const sorted = [...points].sort((a, b) => a[axis] - b[axis]);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted[mid];
  const leftBounds = { ...bounds };
  const rightBounds = { ...bounds };
  if (axis === "x") {
    leftBounds.x1 = median.x;
    rightBounds.x0 = median.x;
  } else {
    leftBounds.y1 = median.y;
    rightBounds.y0 = median.y;
  }
  return {
    point: median, depth, bounds, axis,
    splitValue: median[axis],
    left: buildKdTree(sorted.slice(0, mid), depth + 1, leftBounds),
    right: buildKdTree(sorted.slice(mid + 1), depth + 1, rightBounds),
  };
}

function getKdSplits(node, splits = []) {
  if (!node || !node.axis) return splits;
  splits.push({
    axis: node.axis,
    value: node.splitValue,
    bounds: node.bounds,
    depth: node.depth,
  });
  getKdSplits(node.left, splits);
  getKdSplits(node.right, splits);
  return splits;
}

// ─── OCTREE LOGIC (2D = Quadtree for visualization) ───
function buildQuadtree(points, bounds = { x0: 0, y0: 0, x1: 100, y1: 100 }, depth = 0, maxDepth = 5, maxPoints = 2) {
  const node = { bounds, depth, points: [], children: null };
  const contained = points.filter(
    (p) => p.x >= bounds.x0 && p.x < bounds.x1 && p.y >= bounds.y0 && p.y < bounds.y1
  );
  if (contained.length <= maxPoints || depth >= maxDepth) {
    node.points = contained;
    return node;
  }
  const mx = (bounds.x0 + bounds.x1) / 2;
  const my = (bounds.y0 + bounds.y1) / 2;
  const quads = [
    { x0: bounds.x0, y0: bounds.y0, x1: mx, y1: my },
    { x0: mx, y0: bounds.y0, x1: bounds.x1, y1: my },
    { x0: bounds.x0, y0: my, x1: mx, y1: bounds.y1 },
    { x0: mx, y0: my, x1: bounds.x1, y1: bounds.y1 },
  ];
  node.children = quads.map((q) => buildQuadtree(contained, q, depth + 1, maxDepth, maxPoints));
  return node;
}

function getQuadCells(node, cells = []) {
  if (!node) return cells;
  if (node.children) {
    node.children.forEach((c) => getQuadCells(c, cells));
  } else {
    cells.push({ bounds: node.bounds, depth: node.depth, count: node.points.length });
  }
  return cells;
}

function getQuadGridLines(node, lines = []) {
  if (!node || !node.children) return lines;
  const { x0, y0, x1, y1 } = node.bounds;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  lines.push({ x1: mx, y1: y0, x2: mx, y2: y1, depth: node.depth });
  lines.push({ x1: x0, y1: my, x2: x1, y2: my, depth: node.depth });
  node.children.forEach((c) => getQuadGridLines(c, lines));
  return lines;
}

// ─── KNN SEARCH VISUALIZATION ───
function knnKdTree(tree, query, k) {
  const visited = [];
  const heap = [];
  function dist2(a, b) { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2; }
  function search(node) {
    if (!node) return;
    visited.push(node.point);
    const d = dist2(query, node.point);
    if (heap.length < k) { heap.push({ point: node.point, d }); heap.sort((a, b) => b.d - a.d); }
    else if (d < heap[0].d) { heap[0] = { point: node.point, d }; heap.sort((a, b) => b.d - a.d); }
    const axis = node.axis || (node.depth % 2 === 0 ? "x" : "y");
    const diff = query[axis] - node.point[axis];
    const first = diff < 0 ? node.left : node.right;
    const second = diff < 0 ? node.right : node.left;
    search(first);
    if (heap.length < k || diff * diff < heap[0].d) search(second);
  }
  search(tree);
  return { neighbors: heap.map((h) => h.point), visited };
}

// ─── REBALANCE DEMO ───
function simulateRebalance(points) {
  const steps = [];
  const tree1 = buildKdTree(points.slice(0, 20));
  steps.push({ label: "Initial tree (20 pts)", tree: tree1, pointCount: 20 });
  const tree2 = buildKdTree(points.slice(0, 35));
  steps.push({ label: "After 15 insertions — imbalanced", tree: tree2, pointCount: 35, highlight: true });
  const tree3 = buildKdTree(points.slice(0, 35));
  steps.push({ label: "After rebalance — rebuilt subtree", tree: tree3, pointCount: 35 });
  return steps;
}

// ─── COMPONENTS ───

function Section({ title, children }) {
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`,
      borderRadius: 12, padding: 28, marginBottom: 28,
    }}>
      <h2 style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700,
        color: COLORS.accent1, marginBottom: 18, letterSpacing: "-0.02em",
        borderBottom: `2px solid ${COLORS.cardBorder}`, paddingBottom: 10,
      }}>{title}</h2>
      {children}
    </div>
  );
}

function Prose({ children }) {
  return <p style={{ color: COLORS.text, lineHeight: 1.75, fontSize: 14.5, margin: "10px 0" }}>{children}</p>;
}

function Code({ children }) {
  return (
    <code style={{
      background: "#1e293b", color: COLORS.accent2, padding: "2px 6px",
      borderRadius: 4, fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
    }}>{children}</code>
  );
}

function KdTreeViz({ points, w = 520, h = 400 }) {
  const tree = buildKdTree(points);
  const splits = getKdSplits(tree);
  const scale = (v, max) => (v / 100) * max;
  const depthColors = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#a855f7", "#ec4899"];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, background: "#0f172a", borderRadius: 8 }}>
      {splits.map((s, i) => {
        const col = depthColors[s.depth % depthColors.length];
        if (s.axis === "x") {
          return <line key={i} x1={scale(s.value, w)} y1={scale(s.bounds.y0, h)} x2={scale(s.value, w)} y2={scale(s.bounds.y1, h)} stroke={col} strokeWidth={1.5} opacity={0.6} />;
        }
        return <line key={i} x1={scale(s.bounds.x0, w)} y1={scale(s.value, h)} x2={scale(s.bounds.x1, w)} y2={scale(s.value, h)} stroke={col} strokeWidth={1.5} opacity={0.6} />;
      })}
      {points.map((p) => (
        <circle key={p.id} cx={scale(p.x, w)} cy={scale(p.y, h)} r={3.5} fill={COLORS.text} opacity={0.85} />
      ))}
    </svg>
  );
}

function QuadtreeViz({ points, w = 520, h = 400 }) {
  const tree = buildQuadtree(points);
  const lines = getQuadGridLines(tree);
  const cells = getQuadCells(tree);
  const scale = (v, max) => (v / 100) * max;
  const depthColors = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#a855f7", "#ec4899"];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, background: "#0f172a", borderRadius: 8 }}>
      <rect x={0} y={0} width={w} height={h} fill="none" stroke={COLORS.cardBorder} strokeWidth={2} />
      {cells.map((c, i) => (
        <rect key={`c${i}`}
          x={scale(c.bounds.x0, w)} y={scale(c.bounds.y0, h)}
          width={scale(c.bounds.x1 - c.bounds.x0, w)} height={scale(c.bounds.y1 - c.bounds.y0, h)}
          fill={c.count > 0 ? `rgba(245,158,11,${0.04 + c.depth * 0.03})` : "none"}
          stroke="none"
        />
      ))}
      {lines.map((l, i) => (
        <line key={i}
          x1={scale(l.x1, w)} y1={scale(l.y1, h)} x2={scale(l.x2, w)} y2={scale(l.y2, h)}
          stroke={depthColors[l.depth % depthColors.length]} strokeWidth={1.2} opacity={0.5}
        />
      ))}
      {points.map((p) => (
        <circle key={p.id} cx={scale(p.x, w)} cy={scale(p.y, h)} r={3.5} fill={COLORS.text} opacity={0.85} />
      ))}
    </svg>
  );
}

function KnnDemo({ points }) {
  const [query, setQuery] = useState({ x: 50, y: 50 });
  const [k, setK] = useState(5);
  const svgRef = useRef(null);
  const tree = buildKdTree(points);
  const { neighbors, visited } = knnKdTree(tree, query, k);
  const neighborIds = new Set(neighbors.map((n) => n.id));
  const visitedIds = new Set(visited.map((v) => v.id));
  const w = 520, h = 400;
  const scale = (v, max) => (v / 100) * max;
  const maxDist = Math.max(...neighbors.map((n) => Math.sqrt((n.x - query.x) ** 2 + (n.y - query.y) ** 2)), 1);

  const handleClick = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setQuery({ x: Math.max(1, Math.min(99, x)), y: Math.max(1, Math.min(99, y)) });
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: COLORS.textDim, fontSize: 13 }}>k =</span>
        {[3, 5, 8, 12].map((v) => (
          <button key={v} onClick={() => setK(v)} style={{
            background: k === v ? COLORS.accent1 : "#1e293b", color: COLORS.text,
            border: "none", borderRadius: 6, padding: "5px 14px", cursor: "pointer",
            fontSize: 13, fontWeight: k === v ? 700 : 400,
          }}>{v}</button>
        ))}
        <span style={{ color: COLORS.textMuted, fontSize: 12, marginLeft: 8 }}>
          Visited: {visited.length}/{points.length} nodes
        </span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} onClick={handleClick}
        style={{ width: "100%", maxWidth: w, background: "#0f172a", borderRadius: 8, cursor: "crosshair" }}>
        <circle cx={scale(query.x, w)} cy={scale(query.y, h)} r={scale(maxDist, w)}
          fill="none" stroke={COLORS.accent1} strokeWidth={1} strokeDasharray="4 3" opacity={0.4} />
        {points.map((p) => {
          const isNeighbor = neighborIds.has(p.id);
          const isVisited = visitedIds.has(p.id);
          return (
            <circle key={p.id} cx={scale(p.x, w)} cy={scale(p.y, h)}
              r={isNeighbor ? 6 : 3.5}
              fill={isNeighbor ? COLORS.accent3 : isVisited ? COLORS.accent2 : COLORS.textMuted}
              opacity={isNeighbor ? 1 : isVisited ? 0.7 : 0.4}
            />
          );
        })}
        {neighbors.map((n) => (
          <line key={`l${n.id}`} x1={scale(query.x, w)} y1={scale(query.y, h)}
            x2={scale(n.x, w)} y2={scale(n.y, h)} stroke={COLORS.accent3} strokeWidth={1} opacity={0.5} />
        ))}
        <circle cx={scale(query.x, w)} cy={scale(query.y, h)} r={8}
          fill={COLORS.accent4} stroke="#fff" strokeWidth={2} />
        <text x={scale(query.x, w) + 12} y={scale(query.y, h) - 8}
          fill={COLORS.text} fontSize={11} fontFamily="monospace">query</text>
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12 }}>
        <span style={{ color: COLORS.accent4 }}>● Query</span>
        <span style={{ color: COLORS.accent3 }}>● {k}-NN result</span>
        <span style={{ color: COLORS.accent2 }}>● Visited node</span>
        <span style={{ color: COLORS.textMuted }}>● Pruned</span>
      </div>
    </div>
  );
}

function InsertionDemo({ basePoints }) {
  const [insertCount, setInsertCount] = useState(0);
  const [mode, setMode] = useState("kd");
  const newPoints = generatePoints(20, 999);
  const allPoints = [...basePoints, ...newPoints.slice(0, insertCount)];
  const w = 520, h = 360;
  const scale = (v, max) => (v / 100) * max;
  const baseIds = new Set(basePoints.map((p) => p.id));

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setMode("kd")} style={{
          background: mode === "kd" ? COLORS.accent1 : "#1e293b", color: COLORS.text,
          border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 13,
          fontWeight: mode === "kd" ? 700 : 400,
        }}>ikd-Tree</button>
        <button onClick={() => setMode("oct")} style={{
          background: mode === "oct" ? COLORS.accent2 : "#1e293b", color: COLORS.text,
          border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 13,
          fontWeight: mode === "oct" ? 700 : 400,
        }}>i-Octree</button>
        <input type="range" min={0} max={20} value={insertCount}
          onChange={(e) => setInsertCount(Number(e.target.value))}
          style={{ flex: 1, minWidth: 100 }} />
        <span style={{ color: COLORS.textDim, fontSize: 13, fontFamily: "monospace" }}>
          +{insertCount} pts (total: {allPoints.length})
        </span>
      </div>
      {mode === "kd" ? (
        <div>
          <KdTreeViz points={allPoints} w={w} h={h} />
          <div style={{ marginTop: 8, padding: "8px 12px", background: "#1e293b", borderRadius: 6, fontSize: 12, color: COLORS.textDim }}>
            ikd-Tree: mỗi điểm mới insert dọc theo các split-axis hiện tại. Khi subtree mất cân bằng
            (criterion α), toàn bộ subtree bị <strong style={{ color: COLORS.accent4 }}>rebuild</strong> — gây latency spike.
            {insertCount > 10 && <span style={{ color: COLORS.accent4 }}> ⚠ {insertCount} insertions — likely triggers rebalance!</span>}
          </div>
        </div>
      ) : (
        <div>
          <QuadtreeViz points={allPoints} w={w} h={h} />
          <div style={{ marginTop: 8, padding: "8px 12px", background: "#1e293b", borderRadius: 6, fontSize: 12, color: COLORS.textDim }}>
            i-Octree: điểm mới rơi vào octant tương ứng, chỉ split leaf nếu vượt capacity.
            <strong style={{ color: COLORS.accent3 }}> Không cần rebalance</strong> — latency ổn định.
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonTable() {
  const rows = [
    ["Cấu trúc", "Binary tree, split theo axis xoay vòng (x→y→z)", "Octree (8 children), split đều không gian"],
    ["Split rule", "Median của axis hiện tại", "Chia đôi mỗi axis → 8 octant bằng nhau"],
    ["Insert", "O(log n) amortized, spike khi rebalance", "O(log n) consistent, chỉ split leaf"],
    ["Rebalance", "Cần — rebuild subtree khi α-criterion vi phạm", "Không cần — cấu trúc tự cân bằng"],
    ["Delete", "Lazy delete + periodic cleanup", "Xóa trực tiếp từ leaf, merge nếu cần"],
    ["NN search", "Backtrack qua split planes", "Octant pruning theo distance bound"],
    ["Downsampling", "On-tree (IKFoM scheme)", "On-tree (spatial hashing tự nhiên)"],
    ["Memory", "Cao hơn (pointers + lazy markers)", "Thấp hơn (implicit spatial index)"],
    ["Cache perf", "Trung bình (scattered pointers)", "Tốt hơn (spatial locality)"],
    ["Latency profile", "Có spike (rebalance)", "Phẳng / ổn định"],
    ["Dùng bởi", "FAST-LIO2, HP²-SLAM(?)", "LIMOncello"],
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {["Thuộc tính", "ikd-Tree (KD-tree)", "i-Octree (Octree)"].map((h, i) => (
              <th key={i} style={{
                textAlign: "left", padding: "10px 12px",
                borderBottom: `2px solid ${COLORS.cardBorder}`,
                color: i === 1 ? COLORS.accent1 : i === 2 ? COLORS.accent2 : COLORS.text,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: "9px 12px", borderBottom: `1px solid ${COLORS.cardBorder}`,
                  color: j === 0 ? COLORS.text : COLORS.textDim,
                  fontWeight: j === 0 ? 600 : 400, lineHeight: 1.5,
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LatencyChart() {
  const w = 520, h = 200;
  const scans = Array.from({ length: 50 }, (_, i) => i);
  let s = 17;
  const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const kdLatency = scans.map((i) => {
    const base = 2 + rng() * 1.5;
    const spike = (i === 12 || i === 28 || i === 41) ? 8 + rng() * 6 : 0;
    return base + spike;
  });
  const octLatency = scans.map(() => 1.8 + rng() * 1.2);
  const maxVal = Math.max(...kdLatency, ...octLatency);
  const px = (i) => (i / 49) * (w - 60) + 40;
  const py = (v) => h - 30 - (v / (maxVal + 2)) * (h - 50);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, background: "#0f172a", borderRadius: 8 }}>
      <text x={w / 2} y={16} fill={COLORS.textDim} fontSize={11} textAnchor="middle" fontFamily="monospace">
        Per-scan latency (ms) — 50 consecutive scans
      </text>
      <line x1={40} y1={h - 30} x2={w - 20} y2={h - 30} stroke={COLORS.cardBorder} strokeWidth={1} />
      <line x1={40} y1={20} x2={40} y2={h - 30} stroke={COLORS.cardBorder} strokeWidth={1} />
      {[0, 5, 10, 15].map((v) => (
        <g key={v}>
          <line x1={38} y1={py(v)} x2={w - 20} y2={py(v)} stroke={COLORS.cardBorder} strokeWidth={0.5} strokeDasharray="3 3" />
          <text x={35} y={py(v) + 4} fill={COLORS.textMuted} fontSize={9} textAnchor="end" fontFamily="monospace">{v}</text>
        </g>
      ))}
      <polyline fill="none" stroke={COLORS.accent1} strokeWidth={1.8}
        points={scans.map((i) => `${px(i)},${py(kdLatency[i])}`).join(" ")} />
      <polyline fill="none" stroke={COLORS.accent2} strokeWidth={1.8}
        points={scans.map((i) => `${px(i)},${py(octLatency[i])}`).join(" ")} />
      {kdLatency.map((v, i) => v > 8 ? (
        <g key={`spike${i}`}>
          <circle cx={px(i)} cy={py(v)} r={4} fill={COLORS.accent4} opacity={0.8} />
          <text x={px(i)} y={py(v) - 8} fill={COLORS.accent4} fontSize={9} textAnchor="middle" fontFamily="monospace">
            rebalance
          </text>
        </g>
      ) : null)}
      <g transform={`translate(${w - 160}, 30)`}>
        <rect x={0} y={0} width={140} height={38} fill="rgba(0,0,0,0.5)" rx={4} />
        <line x1={8} y1={12} x2={28} y2={12} stroke={COLORS.accent1} strokeWidth={2} />
        <text x={34} y={15} fill={COLORS.textDim} fontSize={10} fontFamily="monospace">ikd-Tree</text>
        <line x1={8} y1={28} x2={28} y2={28} stroke={COLORS.accent2} strokeWidth={2} />
        <text x={34} y={31} fill={COLORS.textDim} fontSize={10} fontFamily="monospace">i-Octree</text>
      </g>
    </svg>
  );
}

function MemoryChart() {
  const w = 520, h = 180;
  const scans = Array.from({ length: 50 }, (_, i) => i);
  const kdMem = scans.map((i) => 20 + i * 2.8 + (i > 12 ? 5 : 0) + (i > 28 ? 8 : 0));
  const octMem = scans.map((i) => 15 + i * 1.9);
  const maxVal = Math.max(...kdMem, ...octMem);
  const px = (i) => (i / 49) * (w - 60) + 40;
  const py = (v) => h - 30 - (v / (maxVal + 10)) * (h - 50);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, background: "#0f172a", borderRadius: 8 }}>
      <text x={w / 2} y={16} fill={COLORS.textDim} fontSize={11} textAnchor="middle" fontFamily="monospace">
        Memory usage (MB) over time
      </text>
      <line x1={40} y1={h - 30} x2={w - 20} y2={h - 30} stroke={COLORS.cardBorder} strokeWidth={1} />
      <polyline fill="none" stroke={COLORS.accent1} strokeWidth={1.8}
        points={scans.map((i) => `${px(i)},${py(kdMem[i])}`).join(" ")} />
      <polyline fill="none" stroke={COLORS.accent2} strokeWidth={1.8}
        points={scans.map((i) => `${px(i)},${py(octMem[i])}`).join(" ")} />
      <g transform={`translate(${w - 160}, 30)`}>
        <rect x={0} y={0} width={140} height={38} fill="rgba(0,0,0,0.5)" rx={4} />
        <line x1={8} y1={12} x2={28} y2={12} stroke={COLORS.accent1} strokeWidth={2} />
        <text x={34} y={15} fill={COLORS.textDim} fontSize={10} fontFamily="monospace">ikd-Tree</text>
        <line x1={8} y1={28} x2={28} y2={28} stroke={COLORS.accent2} strokeWidth={2} />
        <text x={34} y={31} fill={COLORS.textDim} fontSize={10} fontFamily="monospace">i-Octree</text>
      </g>
    </svg>
  );
}

// ─── MAIN ───
export default function TreeNotebook() {
  const points = generatePoints(40);

  return (
    <div style={{
      background: COLORS.bg, minHeight: "100vh", padding: "32px 16px",
      fontFamily: "'Inter', system-ui, sans-serif", color: COLORS.text,
    }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <div style={{
            fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
            color: COLORS.accent2, letterSpacing: "0.15em", textTransform: "uppercase",
            marginBottom: 8,
          }}>SLAM Research Notebook</div>
          <h1 style={{
            fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em",
            background: `linear-gradient(135deg, ${COLORS.accent1}, ${COLORS.accent2})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: 8,
          }}>ikd-Tree vs i-Octree</h1>
          <div style={{ color: COLORS.textMuted, fontSize: 13 }}>
            Spatial data structures in LiDAR-Inertial SLAM
          </div>
          <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
            HP²-SLAM (ikd-Tree family) &nbsp;·&nbsp; LIMOncello (i-Octree)
          </div>
        </div>

        {/* Section 1: Why trees matter */}
        <Section title="§1 — Tại sao cần tree structure trong LIO-SLAM?">
          <Prose>
            Trong mỗi LiDAR scan (~100K points), hệ thống cần tìm <Code>k nearest neighbors</Code> cho
            từng điểm trong map (thường vài triệu điểm) để fit local plane và tính point-to-plane residual.
            Brute-force là O(n) per query — không real-time được. Tree structure giảm xuống O(log n) bằng cách
            phân chia không gian (spatial partitioning) và cắt tỉa (pruning) các vùng không liên quan.
          </Prose>
          <Prose>
            Nhưng map không tĩnh — mỗi scan thêm hàng nghìn điểm mới, và đôi khi xóa điểm cũ.
            Tree phải hỗ trợ <Code>incremental insert/delete</Code> mà vẫn giữ search performance.
            Đây là điểm khác biệt giữa ikd-Tree và i-Octree.
          </Prose>
        </Section>

        {/* Section 2: Visual comparison */}
        <Section title="§2 — Cách phân chia không gian">
          <Prose>
            <strong style={{ color: COLORS.accent1 }}>ikd-Tree</strong>: Giống KD-tree cổ điển — mỗi node chọn
            1 axis (x→y→z xoay vòng) và split tại median. Kết quả là các hyperplane cắt không gian thành
            các vùng hình chữ nhật không đều, tối ưu cho phân bố hiện tại.
          </Prose>
          <KdTreeViz points={points} />
          <div style={{ height: 20 }} />
          <Prose>
            <strong style={{ color: COLORS.accent2 }}>i-Octree</strong>: Chia đều không gian thành 8 octant
            (2D: 4 quadrant). Mỗi cell chứa tối đa N điểm; vượt quá thì split tiếp. Grid đều → không cần
            rebalance, nhưng vùng thưa vẫn bị chia nhỏ.
          </Prose>
          <QuadtreeViz points={points} />
        </Section>

        {/* Section 3: KNN interactive */}
        <Section title="§3 — KNN Search (Interactive)">
          <Prose>
            Click vào canvas để đặt query point. Quan sát bao nhiêu node bị visited (vàng) vs pruned (xám).
            ikd-Tree prune hiệu quả nhờ tight bounding boxes; i-Octree prune theo octant distance.
          </Prose>
          <KnnDemo points={points} />
        </Section>

        {/* Section 4: Insertion */}
        <Section title="§4 — Incremental Insertion & Rebalance">
          <Prose>
            Kéo slider để thêm điểm mới. Quan sát sự khác biệt:
          </Prose>
          <InsertionDemo basePoints={points} />
        </Section>

        {/* Section 5: Comparison table */}
        <Section title="§5 — So sánh chi tiết">
          <ComparisonTable />
        </Section>

        {/* Section 6: Latency & Memory */}
        <Section title="§6 — Latency & Memory Profile">
          <Prose>
            Biểu đồ mô phỏng (simulated, dựa trên pattern thực từ LIMOncello paper).
            ikd-Tree có <strong style={{ color: COLORS.accent4 }}>latency spike</strong> khi rebalance trigger;
            i-Octree phẳng.
          </Prose>
          <LatencyChart />
          <div style={{ height: 16 }} />
          <MemoryChart />
        </Section>

        {/* Section 7: Key insight */}
        <Section title="§7 — Khi nào chọn cái nào?">
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
          }}>
            <div style={{ background: "rgba(59,130,246,0.08)", borderRadius: 8, padding: 16, border: `1px solid rgba(59,130,246,0.2)` }}>
              <div style={{ color: COLORS.accent1, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>ikd-Tree (HP²-SLAM?)</div>
              <div style={{ color: COLORS.textDim, fontSize: 13, lineHeight: 1.7 }}>
                Tốt khi point distribution không đều (outdoor mixed). Median split → tight bounding → NN chính xác hơn.
                Trade-off: rebalance spike.
                FAST-LIO2 dùng ikd-Tree vì ưu tiên NN accuracy trên structured environments.
              </div>
            </div>
            <div style={{ background: "rgba(245,158,11,0.08)", borderRadius: 8, padding: 16, border: `1px solid rgba(245,158,11,0.2)` }}>
              <div style={{ color: COLORS.accent2, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>i-Octree (LIMOncello)</div>
              <div style={{ color: COLORS.textDim, fontSize: 13, lineHeight: 1.7 }}>
                Tốt khi cần latency ổn định (real-time guarantee). Không rebalance = no spike.
                Cache-friendly hơn (spatial locality). Trade-off: có thể kém efficient ở phân bố rất skewed.
                LIMOncello chọn i-Octree vì kết hợp với SGal(3) — cả hai đều phục vụ mục tiêu robustness.
              </div>
            </div>
          </div>
        </Section>

        {/* Section 8: Implementation note */}
        <Section title="§8 — Implementation Pointers">
          <Prose>
            <strong>ikd-Tree</strong>: repo riêng tại <Code>hku-mars/ikd-Tree</Code>. C++ header-only.
            Rebalance criterion: khi size(subtree) {">"} α × size(parent), với α ≈ 0.7.
            Lazy delete: đánh dấu node, cleanup khi rebuild.
          </Prose>
          <Prose>
            <strong>i-Octree</strong>: tích hợp trong LIMOncello repo. Dựa trên leaf-based octree
            với 2 feature chính: (1) <Code>local spatially continuous storage</Code> — points trong cùng
            octant nằm liên tục trong memory → cache hit cao; (2) <Code>Morton code ordering</Code> — dùng
            Z-order curve để index, giúp spatial neighbor query nhanh hơn pointer traversal.
          </Prose>
        </Section>

        <div style={{
          textAlign: "center", padding: "20px 0 40px", color: COLORS.textMuted, fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          SLAM Research Skill · ikd-Tree vs i-Octree · ICRA 2027 prep
        </div>
      </div>
    </div>
  );
}
