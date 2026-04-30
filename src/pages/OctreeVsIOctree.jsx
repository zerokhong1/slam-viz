import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  bg: "#080c14",
  card: "#0f1724",
  border: "#1a2538",
  blue: "#4a9eff",
  amber: "#ffb347",
  green: "#4ade80",
  red: "#f87171",
  purple: "#c084fc",
  cyan: "#22d3ee",
  text: "#e0e7ef",
  dim: "#8899ad",
  muted: "#4a5568",
  memGood: "#166534",
  memBad: "#7f1d1d",
};

// Seeded RNG
function rng(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function genPoints(n, seed = 42) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => ({ id: i, x: r() * 92 + 4, y: r() * 92 + 4 }));
}

// ─── QUADTREE BUILD ───
function buildQuad(points, bounds, depth = 0, maxD = 5, maxP = 3) {
  const [x0, y0, x1, y1] = bounds;
  const inside = points.filter(p => p.x >= x0 && p.x < x1 && p.y >= y0 && p.y < y1);
  const node = { bounds, depth, pts: [], children: null, id: Math.random() };
  if (inside.length <= maxP || depth >= maxD) {
    node.pts = inside;
    return node;
  }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  node.children = [
    buildQuad(inside, [x0, y0, mx, my], depth + 1, maxD, maxP),
    buildQuad(inside, [mx, y0, x1, my], depth + 1, maxD, maxP),
    buildQuad(inside, [x0, my, mx, y1], depth + 1, maxD, maxP),
    buildQuad(inside, [mx, my, x1, y1], depth + 1, maxD, maxP),
  ];
  return node;
}

function getLines(node, lines = []) {
  if (!node?.children) return lines;
  const [x0, y0, x1, y1] = node.bounds;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  lines.push({ dir: "v", pos: mx, s: y0, e: y1, d: node.depth });
  lines.push({ dir: "h", pos: my, s: x0, e: x1, d: node.depth });
  node.children.forEach(c => getLines(c, lines));
  return lines;
}

function getLeaves(node, leaves = []) {
  if (!node) return leaves;
  if (!node.children) { leaves.push(node); return leaves; }
  node.children.forEach(c => getLeaves(c, leaves));
  return leaves;
}

// ─── COMPONENTS ───

function SectionTitle({ num, children }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16, marginTop: num > 1 ? 48 : 0 }}>
      <span style={{
        fontFamily: "'Courier New', monospace", fontSize: 13, color: C.amber,
        background: "rgba(255,179,71,0.1)", padding: "3px 10px", borderRadius: 4, fontWeight: 700,
      }}>§{num}</span>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-0.02em", margin: 0 }}>
        {children}
      </h2>
    </div>
  );
}

function P({ children }) {
  return <p style={{ color: C.dim, lineHeight: 1.8, fontSize: 14, margin: "8px 0" }}>{children}</p>;
}

function Hl({ color = C.amber, children }) {
  return <strong style={{ color }}>{children}</strong>;
}

function Cd({ children }) {
  return <code style={{ background: "#1a2538", color: C.cyan, padding: "1px 6px", borderRadius: 3, fontSize: 12.5 }}>{children}</code>;
}

// ─── MEMORY VIZ ───
function MemoryViz({ mode }) {
  const isOctree = mode === "i-octree";
  const w = 500, h = 100;

  const blocks = isOctree
    ? [
        { label: "Leaf A", items: ["A₁","A₂","A₃"], x: 20, color: C.blue },
        { label: "Leaf B", items: ["B₁","B₂"], x: 180, color: C.green },
        { label: "Leaf C", items: ["C₁","C₂","C₃","C₄"], x: 290, color: C.purple },
      ]
    : [
        { label: "", items: ["A₁","B₂","C₃","A₂","C₁","B₁","C₄","A₃","C₂"], x: 20, color: null },
      ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w }}>
      <text x={10} y={14} fill={C.dim} fontSize={10} fontFamily="monospace">
        Memory address →
      </text>

      {isOctree ? (
        blocks.map((blk, bi) => (
          <g key={bi}>
            <text x={blk.x + blk.items.length * 24} y={38} fill={blk.color} fontSize={9} fontFamily="monospace" textAnchor="middle">
              {blk.label}
            </text>
            {blk.items.map((item, i) => (
              <g key={i}>
                <rect x={blk.x + i * 48} y={46} width={44} height={30} rx={3}
                  fill={blk.color} fillOpacity={0.15} stroke={blk.color} strokeWidth={1.2} />
                <text x={blk.x + i * 48 + 22} y={65} fill={blk.color} fontSize={11}
                  fontFamily="monospace" textAnchor="middle" fontWeight={600}>{item}</text>
              </g>
            ))}
            {bi < blocks.length - 1 && (
              <line x1={blk.x + blk.items.length * 48 + 6} y1={61}
                x2={blocks[bi + 1].x - 6} y2={61}
                stroke={C.muted} strokeWidth={1} strokeDasharray="3 3" />
            )}
          </g>
        ))
      ) : (
        blocks[0].items.map((item, i) => {
          const col = item.startsWith("A") ? C.blue : item.startsWith("B") ? C.green : C.purple;
          return (
            <g key={i}>
              <rect x={20 + i * 50} y={46} width={46} height={30} rx={3}
                fill={col} fillOpacity={0.12} stroke={col} strokeWidth={1}
                strokeDasharray={i > 0 && blocks[0].items[i][0] !== blocks[0].items[i - 1][0] ? "3 2" : "0"} />
              <text x={20 + i * 50 + 23} y={65} fill={col} fontSize={11}
                fontFamily="monospace" textAnchor="middle" fontWeight={600}>{item}</text>
            </g>
          );
        })
      )}

      <text x={w / 2} y={92} fill={isOctree ? C.green : C.red} fontSize={10} fontFamily="monospace" textAnchor="middle">
        {isOctree ? "✓ Contiguous per leaf → cache hits" : "✗ Scattered across memory → cache misses"}
      </text>
    </svg>
  );
}

// ─── TREE STRUCTURE VIZ ───
function QuadViz({ points, lines, w = 480, h = 360, highlight = null, newPts = [], label = "" }) {
  const s = (v, max) => (v / 100) * max;
  const dc = [C.blue, C.amber, C.green, C.red, C.purple, C.cyan];

  return (
    <div>
      {label && <div style={{ color: C.dim, fontSize: 11, fontFamily: "monospace", marginBottom: 6 }}>{label}</div>}
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, background: "#0a1020", borderRadius: 8 }}>
        <rect x={0} y={0} width={w} height={h} fill="none" stroke={C.border} strokeWidth={1.5} />

        {highlight && (
          <rect x={s(highlight[0], w)} y={s(highlight[1], h)}
            width={s(highlight[2] - highlight[0], w)} height={s(highlight[3] - highlight[1], h)}
            fill={C.amber} fillOpacity={0.06} stroke={C.amber} strokeWidth={1.5} strokeDasharray="6 3" />
        )}

        {lines.map((l, i) => {
          const col = dc[l.d % dc.length];
          return l.dir === "v"
            ? <line key={i} x1={s(l.pos, w)} y1={s(l.s, h)} x2={s(l.pos, w)} y2={s(l.e, h)} stroke={col} strokeWidth={1} opacity={0.5} />
            : <line key={i} x1={s(l.s, w)} y1={s(l.pos, h)} x2={s(l.e, w)} y2={s(l.pos, h)} stroke={col} strokeWidth={1} opacity={0.5} />;
        })}

        {points.map(p => (
          <circle key={p.id} cx={s(p.x, w)} cy={s(p.y, h)} r={3.5} fill={C.text} opacity={0.7} />
        ))}

        {newPts.map((p, i) => (
          <g key={`new${i}`}>
            <circle cx={s(p.x, w)} cy={s(p.y, h)} r={5} fill={C.green} opacity={0.9} />
            <circle cx={s(p.x, w)} cy={s(p.y, h)} r={9} fill="none" stroke={C.green} strokeWidth={1} opacity={0.4} />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── INSERT COMPARISON ───
function InsertComparison() {
  const [step, setStep] = useState(0);
  const basePts = genPoints(25, 42);
  const newPts = genPoints(8, 777);
  const steps = [
    { n: 0, label: "Initial: 25 points", desc: "Cả hai cây giống nhau ở trạng thái ban đầu." },
    { n: 3, label: "+3 points", desc: "Octree thường: rebuild toàn bộ. i-Octree: chỉ update leaf bị ảnh hưởng." },
    { n: 6, label: "+6 points", desc: "Octree thường: rebuild lần nữa. i-Octree: split thêm 1-2 leaf, phần còn lại giữ nguyên." },
    { n: 8, label: "+8 points", desc: "Octree thường: rebuild lần thứ 3. i-Octree: vẫn incremental, không rebuild." },
  ];
  const cur = steps[step];
  const allPts = [...basePts, ...newPts.slice(0, cur.n)];
  const added = newPts.slice(0, cur.n);

  const tree = buildQuad(allPts.map(p => [p.x, p.y]), [0, 0, 100, 100], 0, 5, 3);
  const lines = getLines(tree);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {steps.map((s, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            background: step === i ? C.blue : "#1a2538", color: C.text, border: "none",
            borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12,
            fontWeight: step === i ? 700 : 400, fontFamily: "monospace",
          }}>{s.label}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ color: C.red, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 6 }}>
            Octree thường — REBUILD toàn bộ
          </div>
          <div style={{
            background: "rgba(248,113,113,0.06)", border: `1px solid rgba(248,113,113,0.2)`,
            borderRadius: 8, padding: 12,
          }}>
            <QuadViz points={allPts} lines={lines} w={400} h={300} newPts={added} />
            {cur.n > 0 && (
              <div style={{ color: C.red, fontSize: 11, marginTop: 6, fontFamily: "monospace" }}>
                ⚠ Phá cây cũ → sort lại toàn bộ {allPts.length} điểm → build mới
              </div>
            )}
          </div>
        </div>

        <div>
          <div style={{ color: C.green, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 6 }}>
            i-Octree — CHỈ update leaf bị ảnh hưởng
          </div>
          <div style={{
            background: "rgba(74,222,128,0.06)", border: `1px solid rgba(74,222,128,0.2)`,
            borderRadius: 8, padding: 12,
          }}>
            <QuadViz points={allPts} lines={lines} w={400} h={300} newPts={added} />
            {cur.n > 0 && (
              <div style={{ color: C.green, fontSize: 11, marginTop: 6, fontFamily: "monospace" }}>
                ✓ Điểm mới đi thẳng xuống leaf → split nếu cần → xong
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 12, padding: "10px 14px", background: "#111d2e", borderRadius: 6,
        color: C.dim, fontSize: 13, lineHeight: 1.6,
      }}>
        {cur.desc}
      </div>
    </div>
  );
}

// ─── DELETE COMPARISON ───
function DeleteComparison() {
  const pts = genPoints(30, 42);
  const deleteBox = [55, 0, 100, 50];
  const remaining = pts.filter(p => !(p.x >= 55 && p.x < 100 && p.y >= 0 && p.y < 50));
  const deleted = pts.filter(p => p.x >= 55 && p.x < 100 && p.y >= 0 && p.y < 50);

  const treeFull = buildQuad(pts.map(p => [p.x, p.y]), [0, 0, 100, 100], 0, 5, 3);
  const treeAfter = buildQuad(remaining.map(p => [p.x, p.y]), [0, 0, 100, 100], 0, 5, 3);
  const linesFull = getLines(treeFull);
  const linesAfter = getLines(treeAfter);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div>
        <div style={{ color: C.red, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 6 }}>
          Octree thường — duyệt từng điểm, xóa, rebuild
        </div>
        <div style={{ background: "rgba(248,113,113,0.06)", border: `1px solid rgba(248,113,113,0.2)`, borderRadius: 8, padding: 12 }}>
          <QuadViz points={pts} lines={linesFull} w={400} h={300} highlight={deleteBox} />
          <div style={{ color: C.red, fontSize: 11, marginTop: 6, fontFamily: "monospace" }}>
            1. Duyệt tất cả {pts.length} điểm → tìm {deleted.length} điểm trong box
            <br />2. Xóa từng điểm → cây hỏng → rebuild toàn bộ
          </div>
        </div>
      </div>
      <div>
        <div style={{ color: C.green, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 6 }}>
          i-Octree — box-wise delete, xóa cả octant
        </div>
        <div style={{ background: "rgba(74,222,128,0.06)", border: `1px solid rgba(74,222,128,0.2)`, borderRadius: 8, padding: 12 }}>
          <QuadViz points={remaining} lines={linesAfter} w={400} h={300} highlight={deleteBox} />
          <div style={{ color: C.green, fontSize: 11, marginTop: 6, fontFamily: "monospace" }}>
            1. Octant nằm trong box → xóa cả octant (O(1))
            <br />2. Octant giao box → chỉ duyệt leaf đó
            <br />3. Giải phóng memory segment → không ảnh hưởng cây còn lại
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DOWNSAMPLE VIZ ───
function DownsampleViz() {
  const r = rng(42);
  const cluster = Array.from({ length: 8 }, (_, i) => ({
    id: i, x: 30 + r() * 15, y: 40 + r() * 15,
  }));
  const newPt = { id: 99, x: 35, y: 47 };
  const w = 300, h = 220;
  const s = (v, max) => (v / 100) * max;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div>
        <div style={{ color: C.red, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 6 }}>
          Octree thường — insert rồi downsample riêng
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, background: "#0a1020", borderRadius: 8 }}>
          <rect x={s(20, w)} y={s(30, h)} width={s(30, w)} height={s(30, h)} fill="none" stroke={C.muted} strokeWidth={1} />
          {cluster.map(p => (
            <circle key={p.id} cx={s(p.x, w)} cy={s(p.y, h)} r={4} fill={C.text} opacity={0.6} />
          ))}
          <circle cx={s(newPt.x, w)} cy={s(newPt.y, h)} r={5} fill={C.amber} />
          <circle cx={s(newPt.x, w)} cy={s(newPt.y, h)} r={10} fill="none" stroke={C.amber} strokeWidth={1} opacity={0.5} />
          <text x={s(50, w)} y={s(75, h)} fill={C.dim} fontSize={10} fontFamily="monospace">
            1. Insert tất cả
          </text>
          <text x={s(50, w)} y={s(82, h)} fill={C.dim} fontSize={10} fontFamily="monospace">
            2. Chạy voxel filter riêng
          </text>
          <text x={s(50, w)} y={s(89, h)} fill={C.red} fontSize={10} fontFamily="monospace">
            3. Rebuild cây sau filter
          </text>
        </svg>
      </div>
      <div>
        <div style={{ color: C.green, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 6 }}>
          i-Octree — reject ngay khi insert
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, background: "#0a1020", borderRadius: 8 }}>
          <rect x={s(20, w)} y={s(30, h)} width={s(30, w)} height={s(30, h)} fill="none" stroke={C.muted} strokeWidth={1} />
          {cluster.map(p => (
            <circle key={p.id} cx={s(p.x, w)} cy={s(p.y, h)} r={4} fill={C.text} opacity={0.6} />
          ))}
          <circle cx={s(newPt.x, w)} cy={s(newPt.y, h)} r={5} fill={C.red} opacity={0.6} />
          <line x1={s(newPt.x, w) - 5} y1={s(newPt.y, h) - 5} x2={s(newPt.x, w) + 5} y2={s(newPt.y, h) + 5} stroke={C.red} strokeWidth={2} />
          <line x1={s(newPt.x, w) + 5} y1={s(newPt.y, h) - 5} x2={s(newPt.x, w) - 5} y2={s(newPt.y, h) + 5} stroke={C.red} strokeWidth={2} />
          <text x={s(50, w)} y={s(75, h)} fill={C.dim} fontSize={10} fontFamily="monospace">
            1. Điểm mới đến leaf
          </text>
          <text x={s(50, w)} y={s(82, h)} fill={C.dim} fontSize={10} fontFamily="monospace">
            {"2. extent < 2·emin & full?"}
          </text>
          <text x={s(50, w)} y={s(89, h)} fill={C.green} fontSize={10} fontFamily="monospace">
            3. → REJECT. Không insert.
          </text>
        </svg>
      </div>
    </div>
  );
}

// ─── MORTON CODE VIZ ───
function MortonViz() {
  const grid = 4;
  const w = 260, h = 260;
  const cs = w / grid;

  function morton(x, y) {
    let code = 0;
    for (let i = 0; i < 4; i++) {
      code |= ((x >> i) & 1) << (2 * i);
      code |= ((y >> i) & 1) << (2 * i + 1);
    }
    return code;
  }

  const cells = [];
  for (let y = 0; y < grid; y++)
    for (let x = 0; x < grid; x++)
      cells.push({ x, y, m: morton(x, y) });
  cells.sort((a, b) => a.m - b.m);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, background: "#0a1020", borderRadius: 8 }}>
      {Array.from({ length: grid + 1 }, (_, i) => (
        <g key={i}>
          <line x1={0} y1={i * cs} x2={w} y2={i * cs} stroke={C.border} strokeWidth={1} />
          <line x1={i * cs} y1={0} x2={i * cs} y2={h} stroke={C.border} strokeWidth={1} />
        </g>
      ))}
      {cells.map((c, i) => {
        if (i < cells.length - 1) {
          const next = cells[i + 1];
          return (
            <line key={`l${i}`}
              x1={c.x * cs + cs / 2} y1={c.y * cs + cs / 2}
              x2={next.x * cs + cs / 2} y2={next.y * cs + cs / 2}
              stroke={C.amber} strokeWidth={1.5} opacity={0.5} />
          );
        }
        return null;
      })}
      {cells.map((c, i) => (
        <g key={`c${i}`}>
          <circle cx={c.x * cs + cs / 2} cy={c.y * cs + cs / 2} r={12}
            fill={C.amber} fillOpacity={0.15} stroke={C.amber} strokeWidth={1} />
          <text x={c.x * cs + cs / 2} y={c.y * cs + cs / 2 + 4}
            fill={C.amber} fontSize={11} fontFamily="monospace" textAnchor="middle" fontWeight={700}>
            {c.m}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── COMPARISON TABLE ───
function CompTable() {
  const rows = [
    ["Insert", "Rebuild toàn bộ cây", "Đi xuống leaf, thêm/split", "O(n log n)", "O(log n)"],
    ["Delete", "Tìm + xóa + rebuild", "Box-wise: xóa cả octant", "O(n log n)", "O(k)"],
    ["Downsample", "Bước riêng sau insert", "Tích hợp trong insert", "2 passes", "1 pass"],
    ["Memory layout", "Points rải rác (scattered)", "Continuous per leaf", "Cache miss", "Cache hit"],
    ["Indexing", "Pointer-based traversal", "Morton code", "Chậm", "Nhanh"],
    ["Rebalance", "Cần (hoặc chấp nhận degraded)", "Không cần", "O(n log n)", "—"],
    ["Code phức tạp", "Đơn giản", "Phức tạp hơn (memory mgmt)", "Thấp", "Trung bình"],
  ];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr>
            {["", "Octree thường", "i-Octree", "Cost cũ", "Cost mới"].map((h, i) => (
              <th key={i} style={{
                textAlign: "left", padding: "8px 10px",
                borderBottom: `2px solid ${C.border}`,
                color: i === 1 ? C.red : i === 2 ? C.green : i >= 3 ? C.dim : C.text,
                fontFamily: "monospace", fontSize: 11, fontWeight: 600,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: "7px 10px", borderBottom: `1px solid ${C.border}`,
                  color: j === 0 ? C.text : j === 3 ? C.red : j === 4 ? C.green : C.dim,
                  fontWeight: j === 0 ? 600 : 400, fontFamily: j >= 3 ? "monospace" : "inherit",
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ─── MAIN ───
export default function OctreeVsIOctree() {
  const pts = genPoints(30, 42);
  const tree = buildQuad(pts.map(p => [p.x, p.y]), [0, 0, 100, 100], 0, 5, 3);
  const lines = getLines(tree);

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", padding: "32px 16px",
      fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text,
    }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: C.amber, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
            SLAM Research
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: C.text, margin: "0 0 8px" }}>
            Octree vs i-Octree
          </h1>
          <div style={{ color: C.muted, fontSize: 13 }}>
            Zhu et al. "i-Octree: A Fast, Lightweight, and Dynamic Octree" (2024)
          </div>
        </div>

        {/* §1 — Same structure */}
        <SectionTitle num={1}>Cùng cấu trúc cây — khác cách vận hành</SectionTitle>
        <P>
          Octree thường và i-Octree <Hl color={C.text}>có cùng cấu trúc hình học</Hl>: chia không gian thành 8 octant, mỗi octant chứa tối đa <Cd>b</Cd> điểm, vượt quá thì split. Kết quả phân chia không gian <Hl color={C.text}>giống hệt nhau</Hl> trên cùng tập điểm.
        </P>
        <P>
          Khác biệt nằm ở <Hl>4 thao tác runtime</Hl>: cách insert điểm mới, cách xóa điểm, cách downsample, và cách lưu dữ liệu trong memory. Octree thường là <Hl color={C.red}>static</Hl> — mỗi thay đổi phải rebuild. i-Octree là <Hl color={C.green}>incremental</Hl> — chỉ update phần bị ảnh hưởng.
        </P>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginTop: 16 }}>
          <QuadViz points={pts} lines={lines} label="Cùng 30 điểm → cùng cấu trúc quadtree (2D projection)" />
        </div>

        {/* §2 — Insert */}
        <SectionTitle num={2}>Insert — Rebuild vs Incremental</SectionTitle>
        <P>
          <Hl color={C.red}>Octree thường</Hl>: Nhận điểm mới → phá cây cũ → sort lại tất cả điểm (cũ + mới) → build cây mới từ đầu. Chi phí: <Cd>O(n log n)</Cd> mỗi scan. Với map 2 triệu điểm, rebuild mất hàng chục ms.
        </P>
        <P>
          <Hl color={C.green}>i-Octree</Hl>: Điểm mới đi theo Morton code xuống đúng leaf. Nếu leaf chưa đầy → thêm vào, cấp phát lại đoạn memory liên tục. Nếu leaf đầy → split leaf đó thành 8 con. <Hl color={C.green}>Phần còn lại của cây không bị đụng tới.</Hl> Chi phí: <Cd>O(log n)</Cd> per point.
        </P>
        <P>
          Nếu điểm mới nằm ngoài root → mở rộng root bằng cách tạo root mới lớn hơn, root cũ thành 1 con. Quá trình này có thể lặp vài lần nhưng vẫn O(1).
        </P>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginTop: 16 }}>
          <InsertComparison />
        </div>

        {/* §3 — Memory layout */}
        <SectionTitle num={3}>Memory Layout — Scattered vs Continuous</SectionTitle>
        <P>
          Đây là đóng góp kỹ thuật quan trọng nhất của i-Octree, và cũng là lý do nó nhanh hơn ikd-Tree.
        </P>
        <P>
          <Hl color={C.red}>Octree thường</Hl>: Mỗi điểm là 1 object riêng, nằm ở vị trí tùy ý trong heap memory. Khi duyệt 20 điểm trong 1 leaf, CPU phải nhảy 20 địa chỉ khác nhau → mỗi lần nhảy có thể gây <Hl color={C.red}>cache miss</Hl> (CPU phải chờ RAM ~100ns thay vì ~1ns từ cache).
        </P>
        <P>
          <Hl color={C.green}>i-Octree</Hl>: Khi leaf được tạo hoặc update, i-Octree <Hl color={C.green}>cấp phát 1 đoạn memory liên tục</Hl> (contiguous segment) cho tất cả điểm trong leaf đó. CPU load 1 cache line (64 bytes) → được ~5 điểm cùng lúc.
        </P>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.red, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 8 }}>
              Octree thường — points rải rác trong memory
            </div>
            <MemoryViz mode="octree" />
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <div style={{ color: C.green, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 8 }}>
              i-Octree — contiguous per leaf
            </div>
            <MemoryViz mode="i-octree" />
          </div>
        </div>

        <P>
          Hệ quả: khi i-Octree split 1 leaf, nó phải <Cd>reallocate</Cd> — cấp phát segment mới cho mỗi leaf con, copy điểm sang. Overhead nhỏ, nhưng đổi lại mọi thao tác search sau đó nhanh hơn vì data locality tốt.
        </P>

        {/* §4 — Morton code */}
        <SectionTitle num={4}>Morton Code — Implicit Spatial Index</SectionTitle>
        <P>
          Octree thường dùng pointer để liên kết parent → 8 children. Mỗi lần đi xuống 1 level = 1 pointer dereference = có thể cache miss.
        </P>
        <P>
          i-Octree đánh index 8 octant con bằng <Hl>Morton code</Hl>: interleave bits tọa độ tương đối. Biết tọa độ điểm → biết ngay octant index trong O(1), không cần duyệt 8 con.
        </P>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 16 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ color: C.amber, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 8 }}>
              Z-order curve (2D, grid 4×4)
            </div>
            <MortonViz />
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ color: C.text, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 12 }}>
              Morton code cho octant (3D)
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: C.dim, lineHeight: 2 }}>
              <div>Tọa độ so với tâm cha:</div>
              <div style={{ color: C.blue }}>  x {">"} center? → bit 0</div>
              <div style={{ color: C.green }}>  y {">"} center? → bit 1</div>
              <div style={{ color: C.purple }}>  z {">"} center? → bit 2</div>
              <div style={{ marginTop: 8, color: C.text }}>index = <span style={{ color: C.purple }}>z</span> | <span style={{ color: C.green }}>y</span> | <span style={{ color: C.blue }}>x</span></div>
              <div style={{ marginTop: 12, color: C.dim }}>Ví dụ: (x{">"}, y{"<"}, z{">"})</div>
              <div style={{ color: C.amber }}>→ bits = <span style={{ color: C.blue }}>1</span>, <span style={{ color: C.green }}>0</span>, <span style={{ color: C.purple }}>1</span> → octant <span style={{ color: C.text, fontWeight: 700 }}>5</span></div>
              <div style={{ marginTop: 12 }}>
                <div>8 octant con được lưu liên tục:</div>
                <div style={{ color: C.green }}>children[0..7] tại 1 block</div>
                <div style={{ color: C.green }}>→ random access O(1)</div>
              </div>
            </div>
          </div>
        </div>

        {/* §5 — Delete */}
        <SectionTitle num={5}>Delete — Duyệt từng điểm vs Box-wise</SectionTitle>
        <P>
          Trong LIO-SLAM, robot di chuyển → cần xóa điểm cũ nằm xa robot (giữ local map bounded). Thao tác này gọi là <Cd>box-wise delete</Cd>: xóa mọi điểm trong 1 hình hộp AABB.
        </P>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginTop: 16 }}>
          <DeleteComparison />
        </div>

        <P>
          <Hl color={C.green}>Trick của i-Octree</Hl>: Nhờ continuous storage, xóa 1 octant = giải phóng 1 đoạn memory segment. Memory của các octant khác không bị ảnh hưởng → không cần compact hay rebuild.
        </P>

        {/* §6 — Downsample */}
        <SectionTitle num={6}>On-tree Downsampling</SectionTitle>
        <P>
          Mỗi scan thêm ~100K điểm. Không downsample → map phình vô hạn → search chậm dần. Cần giữ mật độ map ổn định.
        </P>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginTop: 16 }}>
          <DownsampleViz />
        </div>

        <P>
          <Hl color={C.red}>Octree thường</Hl>: Insert tất cả → chạy voxel grid filter riêng → rebuild cây. Hai bước riêng biệt, chi phí gấp đôi.
        </P>
        <P>
          <Hl color={C.green}>i-Octree</Hl>: Kiểm tra ngay khi điểm đến leaf — nếu leaf đã đạt extent {"<"} <Cd>2·e_min</Cd> và size {">"} <Cd>b/8</Cd>, điểm mới bị <Hl color={C.green}>reject tại chỗ</Hl>. Không insert, không cần filter sau. Một pass duy nhất.
        </P>

        {/* §7 — Summary table */}
        <SectionTitle num={7}>Bảng tổng hợp</SectionTitle>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginTop: 16 }}>
          <CompTable />
        </div>

        {/* §8 — One-liner */}
        <div style={{
          marginTop: 40, padding: "20px 24px", borderRadius: 10,
          background: "linear-gradient(135deg, rgba(74,222,128,0.08), rgba(255,179,71,0.08))",
          border: `1px solid rgba(74,222,128,0.2)`,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            Tóm gọn 1 câu
          </div>
          <div style={{ color: C.dim, fontSize: 14, lineHeight: 1.7 }}>
            i-Octree = Octree + <Hl color={C.green}>incremental insert</Hl> (không rebuild) + <Hl color={C.green}>continuous memory per leaf</Hl> (cache-friendly) + <Hl color={C.green}>on-tree downsampling</Hl> (reject tại chỗ) + <Hl color={C.green}>box-wise delete</Hl> (xóa cả octant). Cấu trúc cây giống hệt — cách vận hành khác hoàn toàn.
          </div>
        </div>

        <div style={{
          textAlign: "center", padding: "24px 0 40px", color: C.muted, fontSize: 11,
          fontFamily: "monospace",
        }}>
          SLAM Research Skill · Octree vs i-Octree · Zhu et al. 2024
        </div>
      </div>
    </div>
  );
}
