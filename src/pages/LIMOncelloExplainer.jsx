import { useState, useRef, useEffect } from "react";

const C = {
  bg: "#06090f",
  card: "#0d1420",
  border: "#182436",
  blue: "#4a9eff",
  amber: "#ffb347",
  green: "#4ade80",
  red: "#f87171",
  purple: "#c084fc",
  cyan: "#22d3ee",
  pink: "#f472b6",
  text: "#dfe6ee",
  dim: "#8899ad",
  muted: "#4a5a6e",
};

// ── Utilities ──
function Tag({ color, children }) {
  return (
    <span style={{
      display: "inline-block", background: `${color}18`, color, border: `1px solid ${color}40`,
      borderRadius: 4, padding: "1px 8px", fontSize: 11, fontFamily: "monospace", fontWeight: 600,
    }}>{children}</span>
  );
}
function S({ n, children }) {
  return (
    <div style={{ marginTop: n > 1 ? 56 : 0, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 14, fontWeight: 800, fontFamily: "monospace",
          background: `linear-gradient(135deg, ${C.blue}30, ${C.amber}30)`,
          color: C.amber, border: `1.5px solid ${C.amber}50`,
        }}>{n}</div>
        <h2 style={{ fontSize: 19, fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-0.02em" }}>
          {children}
        </h2>
      </div>
    </div>
  );
}
function P({ children }) {
  return <p style={{ color: C.dim, lineHeight: 1.85, fontSize: 13.5, margin: "8px 0" }}>{children}</p>;
}
function B({ color = C.amber, children }) {
  return <strong style={{ color }}>{children}</strong>;
}
function Cd({ children }) {
  return <code style={{ background: "#182436", color: C.cyan, padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>{children}</code>;
}
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: 20, marginTop: 14, ...style,
    }}>{children}</div>
  );
}

// ── Pipeline Diagram ──
function PipelineDiagram() {
  const w = 760, h = 420;
  const boxes = [
    { x: 20, y: 30, w: 130, h: 50, label: "IMU Data", sub: "ω, a @ 400Hz", color: C.cyan, icon: "⟳" },
    { x: 20, y: 180, w: 130, h: 50, label: "LiDAR Scan", sub: "~100K pts @ 10Hz", color: C.green, icon: "◉" },
    { x: 210, y: 30, w: 170, h: 70, label: "SGal(3) Prediction", sub: "Γ ← Γ ⊕ u·Δt", color: C.amber, icon: "▶", main: true },
    { x: 210, y: 140, w: 170, h: 50, label: "Covariance Prop.", sub: "P ← F·P·Fᵀ + F_w·Q·F_wᵀ", color: C.amber, icon: "◻" },
    { x: 210, y: 240, w: 170, h: 50, label: "Deskewing", sub: "per-point undistortion", color: C.blue, icon: "↝" },
    { x: 450, y: 140, w: 150, h: 50, label: "i-Octree KNN", sub: "k nearest neighbors", color: C.green, icon: "🌲" },
    { x: 450, y: 240, w: 150, h: 60, label: "IESKF Update", sub: "iterate until converge", color: C.purple, icon: "↻", main: true },
    { x: 450, y: 340, w: 150, h: 50, label: "Map Update", sub: "insert + box delete", color: C.green, icon: "+" },
    { x: 660, y: 240, w: 80, h: 50, label: "Pose", sub: "R, v, p", color: C.text, icon: "✓" },
  ];
  const arrows = [
    [150, 55, 210, 55], [150, 205, 210, 265], [295, 100, 295, 140],
    [295, 190, 295, 240], [380, 265, 450, 265], [380, 265, 450, 165],
    [525, 190, 525, 240], [525, 300, 525, 340],
    [600, 270, 660, 270],
    // feedback
  ];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", background: "#080e18", borderRadius: 10 }}>
      <defs>
        <marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={C.muted} />
        </marker>
        <marker id="ahg" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={C.green} />
        </marker>
      </defs>

      {/* arrows */}
      {arrows.map((a, i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={a[2]} y2={a[3]}
          stroke={C.muted} strokeWidth={1.5} markerEnd="url(#ah)" />
      ))}

      {/* feedback arrow IESKF → SGal prediction */}
      <path d="M 525,240 Q 525,20 380,55" fill="none" stroke={C.amber} strokeWidth={1.2}
        strokeDasharray="5 3" markerEnd="url(#ah)" opacity={0.5} />
      <text x={480} y={18} fill={C.amber} fontSize={9} fontFamily="monospace" opacity={0.6}>
        state reset
      </text>

      {/* boxes */}
      {boxes.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6}
            fill={b.main ? `${b.color}15` : `${b.color}0a`}
            stroke={b.color} strokeWidth={b.main ? 2 : 1} opacity={b.main ? 1 : 0.7} />
          <text x={b.x + 12} y={b.y + 22} fill={b.color} fontSize={12}
            fontFamily="monospace" fontWeight={700}>{b.label}</text>
          <text x={b.x + 12} y={b.y + 38} fill={C.dim} fontSize={9.5}
            fontFamily="monospace">{b.sub}</text>
          {b.h > 55 && b.sub.length > 20 && (
            <text x={b.x + 12} y={b.y + 50} fill={C.dim} fontSize={9.5} fontFamily="monospace">
            </text>
          )}
        </g>
      ))}

      {/* labels */}
      <text x={190} y={290} fill={C.blue} fontSize={9} fontFamily="monospace" opacity={0.7}>
        IMU poses → correct each point
      </text>
      <text x={420} y={130} fill={C.dim} fontSize={9} fontFamily="monospace" opacity={0.6}>
        plane fit → residual
      </text>

      {/* Legend */}
      <g transform="translate(20, 350)">
        {[
          { c: C.amber, l: "Prediction (SGal(3))" },
          { c: C.purple, l: "Update (IESKF)" },
          { c: C.green, l: "Map (i-Octree)" },
          { c: C.blue, l: "Preprocessing" },
        ].map((item, i) => (
          <g key={i} transform={`translate(${i * 170}, 0)`}>
            <rect x={0} y={0} width={10} height={10} rx={2} fill={item.c} opacity={0.6} />
            <text x={16} y={9} fill={C.dim} fontSize={9} fontFamily="monospace">{item.l}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ── SGal(3) Matrix Viz ──
function SGalMatrix() {
  const entries = [
    [{ v: "R", c: C.blue, sub: "3×3" }, { v: "v", c: C.green, sub: "3×1" }, { v: "p", c: C.amber, sub: "3×1" }],
    [{ v: "0ᵀ", c: C.muted }, { v: "1", c: C.muted }, { v: "τ", c: C.pink, sub: "scalar" }],
    [{ v: "0ᵀ", c: C.muted }, { v: "0", c: C.muted }, { v: "1", c: C.muted }],
  ];
  const cellW = 80, cellH = 55, pad = 2;
  const w = cellW * 3 + 60, h = cellH * 3 + 40;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: 320 }}>
      <text x={10} y={h / 2 + 5} fill={C.dim} fontSize={18} fontFamily="monospace" fontWeight={700}>Γ =</text>
      {/* brackets */}
      <rect x={38} y={8} width={w - 46} height={h - 16} rx={4} fill="none"
        stroke={C.dim} strokeWidth={1.5} />
      {entries.map((row, r) =>
        row.map((cell, c) => (
          <g key={`${r}${c}`} transform={`translate(${42 + c * cellW}, ${12 + r * cellH})`}>
            <rect x={pad} y={pad} width={cellW - pad * 2} height={cellH - pad * 2} rx={4}
              fill={cell.c === C.muted ? "transparent" : `${cell.c}12`} />
            <text x={cellW / 2} y={cellH / 2 + (cell.sub ? -2 : 5)}
              fill={cell.c} fontSize={cell.v.length > 2 ? 14 : 20} fontFamily="monospace"
              fontWeight={700} textAnchor="middle">{cell.v}</text>
            {cell.sub && (
              <text x={cellW / 2} y={cellH / 2 + 16} fill={cell.c} fontSize={9}
                fontFamily="monospace" textAnchor="middle" opacity={0.6}>{cell.sub}</text>
            )}
          </g>
        ))
      )}
    </svg>
  );
}

// ── Lie Algebra Vector ──
function LieAlgViz() {
  const items = [
    { sym: "ρ", label: "position", color: C.amber, dim: "ℝ³" },
    { sym: "ν", label: "velocity", color: C.green, dim: "ℝ³" },
    { sym: "θ", label: "rotation", color: C.blue, dim: "ℝ³" },
    { sym: "ι", label: "time", color: C.pink, dim: "ℝ¹" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: C.dim, fontSize: 16, fontFamily: "monospace", fontWeight: 700 }}>τ =</span>
      <div style={{
        border: `1.5px solid ${C.dim}`, borderRadius: 6, padding: "4px 0",
        display: "flex", flexDirection: "column", gap: 2,
      }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "3px 12px",
            background: `${it.color}08`,
          }}>
            <span style={{ color: it.color, fontSize: 16, fontFamily: "monospace", fontWeight: 700, width: 16 }}>
              {it.sym}
            </span>
            <span style={{ color: C.dim, fontSize: 11, fontFamily: "monospace" }}>
              {it.label}
            </span>
            <span style={{ color: it.color, fontSize: 10, fontFamily: "monospace", marginLeft: "auto", opacity: 0.6 }}>
              {it.dim}
            </span>
          </div>
        ))}
      </div>
      <span style={{ color: C.dim, fontSize: 13, fontFamily: "monospace" }}>∈ ℝ¹⁰</span>
    </div>
  );
}

// ── State Composition ──
function StateViz() {
  const parts = [
    { sym: "Γ", label: "SGal(3)", sub: "R, v, p, τ", color: C.amber, dim: 10 },
    { sym: "b_g", label: "gyro bias", sub: "random walk", color: C.cyan, dim: 3 },
    { sym: "b_a", label: "accel bias", sub: "random walk", color: C.cyan, dim: 3 },
    { sym: "g", label: "gravity", sub: "on S²", color: C.purple, dim: 2 },
  ];
  const total = parts.reduce((s, p) => s + p.dim, 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, alignItems: "stretch", marginBottom: 8 }}>
        {parts.map((p, i) => (
          <div key={i} style={{
            flex: p.dim, background: `${p.color}10`, border: `1px solid ${p.color}40`,
            borderRadius: 6, padding: "8px 10px", minWidth: 0,
          }}>
            <div style={{ color: p.color, fontSize: 16, fontFamily: "monospace", fontWeight: 700 }}>{p.sym}</div>
            <div style={{ color: C.dim, fontSize: 10, fontFamily: "monospace", marginTop: 2 }}>{p.label}</div>
            <div style={{ color: p.color, fontSize: 9, fontFamily: "monospace", marginTop: 2, opacity: 0.6 }}>{p.sub}</div>
            <div style={{
              marginTop: 6, color: p.color, fontSize: 11, fontFamily: "monospace",
              fontWeight: 700, textAlign: "center",
            }}>dim {p.dim}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: 12, color: C.dim }}>
        Error-state tổng: <span style={{ color: C.text, fontWeight: 700 }}>{total}</span> dimensions
        <span style={{ color: C.muted, marginLeft: 8 }}>(vs 15 trong FAST-LIO2)</span>
      </div>
    </div>
  );
}

// ── Prediction Step ──
function PredictionViz() {
  return (
    <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 2.2 }}>
      <div style={{ color: C.dim, marginBottom: 8 }}>// Mỗi IMU sample (ω_m, a_m) với interval Δt:</div>

      <div><span style={{ color: C.muted }}>① Bias correction:</span></div>
      <div style={{ paddingLeft: 20 }}>
        <span style={{ color: C.cyan }}>ω̃</span> = ω_m − <span style={{ color: C.cyan }}>b_g</span>
        <span style={{ color: C.muted, marginLeft: 20 }}>// angular velocity</span>
      </div>
      <div style={{ paddingLeft: 20 }}>
        <span style={{ color: C.cyan }}>ã</span> = a_m − <span style={{ color: C.cyan }}>b_a</span>
        <span style={{ color: C.muted, marginLeft: 20 }}>// acceleration</span>
      </div>

      <div style={{ marginTop: 8 }}><span style={{ color: C.muted }}>② Tangent vector (sgal(3)):</span></div>
      <div style={{ paddingLeft: 20, display: "flex", gap: 4, flexWrap: "wrap" }}>
        <span style={{ color: C.text }}>u = [</span>
        <span style={{ color: C.amber }}>ã·Δt²</span>,
        <span style={{ color: C.green }}>ã·Δt</span>,
        <span style={{ color: C.blue }}>ω̃·Δt</span>,
        <span style={{ color: C.pink }}>Δt</span>
        <span style={{ color: C.text }}>]</span>
        <span style={{ color: C.muted, marginLeft: 8 }}>∈ ℝ¹⁰</span>
      </div>
      <div style={{ paddingLeft: 20, fontSize: 10, color: C.muted, marginTop: -4 }}>
        {"    "}
        <span style={{ color: C.amber }}>ρ_p</span>{"     "}
        <span style={{ color: C.green }}>ρ_v</span>{"    "}
        <span style={{ color: C.blue }}>φ</span>{"      "}
        <span style={{ color: C.pink }}>σ</span>
      </div>

      <div style={{ marginTop: 8 }}><span style={{ color: C.muted }}>③ Group composition:</span></div>
      <div style={{
        paddingLeft: 20, padding: "6px 20px", background: `${C.amber}10`,
        borderLeft: `3px solid ${C.amber}`, borderRadius: "0 4px 4px 0", marginTop: 4,
      }}>
        <span style={{ color: C.amber, fontWeight: 700, fontSize: 15 }}>
          Γ_{"{k+1}"} = Γ_k · Exp<sub>SGal(3)</sub>(u)
        </span>
      </div>
      <div style={{ paddingLeft: 20, fontSize: 11, color: C.dim, marginTop: 4 }}>
        ↑ Một dòng duy nhất thay thế 3 equations riêng cho R, v, p
      </div>

      <div style={{ marginTop: 8 }}><span style={{ color: C.muted }}>④ Gravity (additive, ngoài group):</span></div>
      <div style={{ paddingLeft: 20 }}>
        <span style={{ color: C.green }}>v</span> += <span style={{ color: C.purple }}>g</span>·Δt
        <span style={{ color: C.muted, marginLeft: 16 }}>//</span>{" "}
        <span style={{ color: C.amber }}>p</span> += <span style={{ color: C.purple }}>g</span>·Δt²/2
      </div>
    </div>
  );
}

// ── Compound vs SGal comparison ──
function CompoundVsSGal() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{
        background: `${C.red}08`, border: `1px solid ${C.red}25`,
        borderRadius: 8, padding: 16,
      }}>
        <div style={{ color: C.red, fontFamily: "monospace", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
          SO(3) × ℝ⁶ — FAST-LIO2
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 12, color: C.dim, lineHeight: 2 }}>
          <div><span style={{ color: C.blue }}>R</span>_{"{k+1}"} = R_k · Exp(ω̃·Δt)</div>
          <div><span style={{ color: C.green }}>v</span>_{"{k+1}"} = v_k + <span style={{ color: C.blue }}>R_k</span>·ã·Δt + g·Δt</div>
          <div><span style={{ color: C.amber }}>p</span>_{"{k+1}"} = p_k + v_k·Δt + ½·<span style={{ color: C.blue }}>R_k</span>·ã·Δt²</div>
        </div>
        <div style={{ color: C.red, fontSize: 10, marginTop: 8, lineHeight: 1.6 }}>
          3 equations độc lập. V₁ ≈ I (xấp xỉ).
          <br />Mất kinematic coupling R↔v↔p.
        </div>
      </div>

      <div style={{
        background: `${C.green}08`, border: `1px solid ${C.green}25`,
        borderRadius: 8, padding: 16,
      }}>
        <div style={{ color: C.green, fontFamily: "monospace", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
          SGal(3) — LIMOncello
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 12, color: C.dim, lineHeight: 2 }}>
          <div>u = [ã·Δt², ã·Δt, ω̃·Δt, Δt]</div>
          <div style={{ marginTop: 4 }}>
            <span style={{ color: C.amber, fontWeight: 700 }}>Γ_{"{k+1}"} = Γ_k · Exp(u)</span>
          </div>
          <div style={{ marginTop: 4, color: C.muted }}>// R, v, p, τ updated jointly</div>
        </div>
        <div style={{ color: C.green, fontSize: 10, marginTop: 8, lineHeight: 1.6 }}>
          1 equation. Exact ZOH integration.
          <br />Left Jacobian J_l(φ) couples R↔v↔p tự nhiên.
        </div>
      </div>
    </div>
  );
}

// ── Deskewing Diagram ──
function DeskewDiagram() {
  const w = 600, h = 200;
  const scanPts = Array.from({ length: 12 }, (_, i) => ({
    t: i / 11, x: 80 + i * 38, y: 140 - Math.sin(i * 0.5) * 40 - i * 3,
  }));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", background: "#080e18", borderRadius: 8 }}>
      {/* Timeline */}
      <line x1={60} y1={175} x2={w - 20} y2={175} stroke={C.muted} strokeWidth={1} />
      <text x={30} y={180} fill={C.dim} fontSize={9} fontFamily="monospace">t₀</text>
      <text x={w - 18} y={180} fill={C.dim} fontSize={9} fontFamily="monospace">t_end</text>

      {/* IMU poses along trajectory */}
      <path d={`M 80,140 Q 200,90 320,100 Q 440,110 530,80`}
        fill="none" stroke={C.amber} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />
      <text x={250} y={78} fill={C.amber} fontSize={9} fontFamily="monospace" opacity={0.6}>
        IMU-propagated trajectory
      </text>

      {/* Scan points at different times */}
      {scanPts.map((p, i) => (
        <g key={i}>
          <line x1={p.x} y1={p.y} x2={p.x} y2={175} stroke={C.muted} strokeWidth={0.5} strokeDasharray="2 2" />
          <circle cx={p.x} cy={p.y} r={4}
            fill={i === scanPts.length - 1 ? C.green : C.blue}
            opacity={0.3 + p.t * 0.7} />
        </g>
      ))}

      {/* Corrected points (projected to t_end) */}
      {scanPts.map((p, i) => {
        const cx = p.x + (1 - p.t) * 12;
        const cy = p.y - (1 - p.t) * 15;
        return (
          <g key={`c${i}`}>
            <line x1={p.x} y1={p.y} x2={cx} y2={cy}
              stroke={C.green} strokeWidth={0.8} opacity={0.3} />
            <circle cx={cx} cy={cy} r={3} fill={C.green} opacity={0.7} />
          </g>
        );
      })}

      <text x={80} y={25} fill={C.blue} fontSize={10} fontFamily="monospace">● raw points (different timestamps)</text>
      <text x={80} y={40} fill={C.green} fontSize={10} fontFamily="monospace">● corrected to t_end</text>
      <text x={80} y={55} fill={C.dim} fontSize={9} fontFamily="monospace">
        p_corrected = R(t_end)ᵀ · (R(t_i)·p_i + p(t_i) − p(t_end))
      </text>
    </svg>
  );
}

// ── IESKF Update ──
function IESKFViz() {
  const [iter, setIter] = useState(0);
  const iters = [
    { dx: 8, label: "Iteration 0: prior from IMU prediction", conv: false },
    { dx: 4, label: "Iteration 1: first correction from LiDAR", conv: false },
    { dx: 1.5, label: "Iteration 2: refining", conv: false },
    { dx: 0.3, label: "Iteration 3: converged (‖δx‖ < ε)", conv: true },
  ];
  const cur = iters[iter];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {iters.map((it, i) => (
          <button key={i} onClick={() => setIter(i)} style={{
            background: iter === i ? C.purple : "#182436", color: C.text, border: "none",
            borderRadius: 5, padding: "5px 12px", cursor: "pointer", fontSize: 11,
            fontFamily: "monospace", fontWeight: iter === i ? 700 : 400,
          }}>iter {i}</button>
        ))}
      </div>

      <svg viewBox="0 0 400 160" style={{ width: "100%", maxWidth: 400, background: "#080e18", borderRadius: 8 }}>
        {/* True state */}
        <circle cx={200} cy={80} r={6} fill={C.green} />
        <text x={212} y={84} fill={C.green} fontSize={10} fontFamily="monospace">x* (true)</text>

        {/* Prior */}
        <circle cx={200 - 30} cy={80 - 25} r={5} fill={C.amber} opacity={0.5} />
        <text x={200 - 28} y={80 - 32} fill={C.amber} fontSize={9} fontFamily="monospace" opacity={0.6}>x̄ (prior)</text>

        {/* Current estimate */}
        {iters.slice(0, iter + 1).map((it, i) => {
          const scale = iters.slice(0, i + 1).reduce((s, v) => s - v.dx * 1.5, 30);
          const cx = 200 - scale;
          const cy = 80 - 25 + (i + 1) * 8;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={4} fill={C.purple} opacity={0.3 + i * 0.2} />
              {i > 0 && (
                <line x1={200 - (iters.slice(0, i).reduce((s, v) => s - v.dx * 1.5, 30))}
                  y1={80 - 25 + i * 8} x2={cx} y2={cy}
                  stroke={C.purple} strokeWidth={1} opacity={0.4} strokeDasharray="3 2" />
              )}
            </g>
          );
        })}

        {/* Uncertainty ellipse */}
        <ellipse cx={200 - 30 + iter * 7} cy={80 - 25 + iter * 7}
          rx={25 - iter * 5} ry={18 - iter * 3}
          fill="none" stroke={C.purple} strokeWidth={1} opacity={0.3} strokeDasharray="4 3" />

        <text x={10} y={150} fill={cur.conv ? C.green : C.dim} fontSize={10} fontFamily="monospace">
          {cur.label}
        </text>
      </svg>

      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.dim, marginTop: 8, lineHeight: 1.8 }}>
        <div>δx* = argmin ‖<span style={{ color: C.green }}>z</span> − <span style={{ color: C.blue }}>H</span>·δx‖²<sub>R⁻¹</sub> + ‖δx − (<span style={{ color: C.purple }}>x̂</span> ⊖ <span style={{ color: C.amber }}>x̄</span>)‖²<sub>P⁻¹</sub></div>
        <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>
          z = point-to-plane residuals, H = measurement Jacobian, P = predicted covariance
        </div>
      </div>
    </div>
  );
}

// ── Group Hierarchy ──
function GroupHierarchy() {
  const groups = [
    { name: "SO(3)", dim: 3, enc: "R", color: C.blue, w: 80 },
    { name: "SE(3)", dim: 6, enc: "R, p", color: C.cyan, w: 110 },
    { name: "SE₂(3)", dim: 9, enc: "R, v, p", color: C.purple, w: 150 },
    { name: "SGal(3)", dim: 10, enc: "R, v, p, τ", color: C.amber, w: 190 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      {groups.map((g, i) => (
        <div key={i} style={{
          width: g.w + 120, background: `${g.color}10`, border: `1.5px solid ${g.color}40`,
          borderRadius: 8, padding: "6px 16px", display: "flex", justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ color: g.color, fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}>
            {g.name}
          </span>
          <span style={{ color: C.dim, fontFamily: "monospace", fontSize: 11 }}>
            dim {g.dim}
          </span>
          <span style={{ color: C.dim, fontFamily: "monospace", fontSize: 10 }}>
            {g.enc}
          </span>
        </div>
      ))}
      <div style={{ color: C.muted, fontSize: 10, fontFamily: "monospace", marginTop: 4 }}>
        ↑ Mỗi bước thêm kinematic coupling
      </div>
    </div>
  );
}

// ── Degenerate Scenario ──
function DegenerateViz() {
  const w = 500, h = 180;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", background: "#080e18", borderRadius: 8 }}>
      {/* Tunnel walls */}
      <rect x={0} y={20} width={w} height={12} fill={C.muted} opacity={0.3} rx={2} />
      <rect x={0} y={h - 32} width={w} height={12} fill={C.muted} opacity={0.3} rx={2} />

      {/* LiDAR rays */}
      {Array.from({ length: 15 }, (_, i) => {
        const angle = (i / 14) * Math.PI;
        const cx = 100, cy = h / 2;
        const len = angle > 0.3 && angle < 2.8 ? 50 + Math.random() * 20 : 200;
        const ex = cx + Math.cos(angle - Math.PI / 2) * Math.min(len, (angle > Math.PI / 2 ? h / 2 - 32 : h / 2 - 32) / Math.abs(Math.cos(angle - Math.PI / 2) || 0.01));
        const ey = cy + Math.sin(angle - Math.PI / 2) * Math.min(len, 200);
        return (
          <line key={i} x1={cx} y1={cy} x2={Math.max(0, Math.min(w, ex))} y2={Math.max(32, Math.min(h - 32, ey))}
            stroke={C.green} strokeWidth={0.8} opacity={0.3} />
        );
      })}
      <circle cx={100} cy={h / 2} r={5} fill={C.amber} />
      <text x={110} y={h / 2 + 4} fill={C.amber} fontSize={10} fontFamily="monospace">robot</text>

      {/* Labels */}
      <text x={250} y={50} fill={C.dim} fontSize={10} fontFamily="monospace">
        LiDAR chỉ thấy 2 tường → unconstrained along tunnel axis
      </text>
      <text x={250} y={70} fill={C.red} fontSize={10} fontFamily="monospace">
        SO(3)×ℝ⁶: drift dọc tunnel (V₁≈I sai)
      </text>
      <text x={250} y={90} fill={C.green} fontSize={10} fontFamily="monospace">
        SGal(3): exact propagation → ít drift hơn
      </text>

      <text x={w / 2} y={h - 10} fill={C.muted} fontSize={9} fontFamily="monospace" textAnchor="middle">
        City02 tunnel sequence: FAST-LIO2 diverges, LIMOncello holds
      </text>
    </svg>
  );
}

// ── Main ──
export default function LIMOncelloExplainer() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "32px 16px", fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: C.amber, letterSpacing: "0.15em", marginBottom: 6 }}>
            PÉREZ-RUIZ & SOLÀ · IRI, UPC BARCELONA · 2025
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
            LIMOncello
          </h1>
          <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
            IESKF on SGal(3) for Fast LiDAR–Inertial Odometry
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
            <Tag color={C.amber}>SGal(3) state</Tag>
            <Tag color={C.purple}>IESKF filter</Tag>
            <Tag color={C.green}>i-Octree map</Tag>
            <Tag color={C.blue}>manif library</Tag>
          </div>
        </div>

        {/* §1 Pipeline */}
        <S n={1}>System Pipeline</S>
        <P>
          LIMOncello là hệ thống <B color={C.text}>tightly-coupled LiDAR-Inertial Odometry</B>. Hai sensor: IMU (400Hz) cung cấp angular velocity + acceleration, LiDAR (10Hz) cung cấp point cloud 3D. Pipeline gồm 2 phase chính: <B>Prediction</B> (IMU propagation trên SGal(3)) và <B color={C.purple}>Update</B> (LiDAR correction qua IESKF).
        </P>
        <Card><PipelineDiagram /></Card>

        {/* §2 SGal(3) */}
        <S n={2}>SGal(3) — Tại sao không dùng SO(3)×ℝ⁶?</S>
        <P>
          Hầu hết LIO systems (FAST-LIO2, DLIO) biểu diễn state dưới dạng <B color={C.red}>compound manifold</B>: rotation R trên SO(3), velocity v và position p trên ℝ³ riêng biệt. Ba thành phần được update <B color={C.red}>độc lập</B> trong prediction step.
        </P>
        <P>
          LIMOncello dùng <B>SGal(3)</B> — nhóm Galilean đặc biệt — đóng gói R, v, p, τ vào <B>1 ma trận 5×5 duy nhất</B>. Exponential map của SGal(3) <B>là</B> nghiệm chính xác của IMU integration dưới zero-order hold. Không cần xấp xỉ V₁ ≈ I.
        </P>

        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
            <div>
              <div style={{ color: C.amber, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 10 }}>
                Ma trận SGal(3):
              </div>
              <SGalMatrix />
            </div>
            <div>
              <div style={{ color: C.amber, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 10 }}>
                Lie algebra vector:
              </div>
              <LieAlgViz />
            </div>
          </div>
        </Card>

        <Card style={{ marginTop: 14 }}>
          <div style={{ color: C.text, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 10 }}>
            Subgroup hierarchy — mỗi bước thêm kinematic coupling:
          </div>
          <GroupHierarchy />
        </Card>

        {/* §3 State */}
        <S n={3}>State Definition</S>
        <P>
          Full state gồm 4 phần: <B>Γ</B> trên SGal(3) chứa pose + velocity + time, <B color={C.cyan}>biases</B> trên ℝ³ (gyroscope + accelerometer), và <B color={C.purple}>gravity</B> trên 2-sphere S². Error-state dimension = 18.
        </P>
        <Card><StateViz /></Card>

        {/* §4 Prediction */}
        <S n={4}>Prediction — IMU Forward Propagation</S>
        <P>
          Mỗi IMU measurement, LIMOncello thực hiện <B>1 group composition duy nhất</B> trên SGal(3). So với FAST-LIO2 phải chạy 3 equations riêng cho R, v, p — LIMOncello gom lại thành 1 dòng. Exponential map tự động encode coupling giữa rotation và translation qua left Jacobian.
        </P>
        <Card><PredictionViz /></Card>
        <Card style={{ marginTop: 14 }}>
          <div style={{ color: C.text, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 10 }}>
            So sánh prediction step:
          </div>
          <CompoundVsSGal />
        </Card>

        {/* §5 Deskewing */}
        <S n={5}>Deskewing — Per-point Motion Correction</S>
        <P>
          LiDAR quét trong ~100ms. Robot di chuyển trong lúc quét → mỗi điểm có timestamp khác nhau → scan bị "méo" (distorted). Deskewing dùng IMU-propagated poses để project mỗi điểm về cùng 1 thời điểm (scan end). LIMOncello dùng poses từ SGal(3) prediction, tương tự FAST-LIO2 nhưng poses chính xác hơn nhờ exact integration.
        </P>
        <Card><DeskewDiagram /></Card>

        {/* §6 IESKF Update */}
        <S n={6}>IESKF Update — LiDAR Correction</S>
        <P>
          Khi scan mới đến (đã deskew), mỗi điểm tìm k nearest neighbors trong map (qua i-Octree), fit plane, tính <B color={C.green}>point-to-plane residual</B>. IESKF chạy <B color={C.purple}>iterated Gauss-Newton</B> trên manifold SGal(3) × ℝ³ × ℝ³ × S² — minimize residuals + prior constraint cho đến khi hội tụ.
        </P>
        <Card><IESKFViz /></Card>

        {/* §7 i-Octree */}
        <S n={7}>i-Octree — Map Backend</S>
        <P>
          Map được duy trì bởi <B color={C.green}>i-Octree</B> thay vì ikd-Tree (FAST-LIO2). i-Octree hỗ trợ incremental insert (không rebuild), box-wise delete (xóa cả octant), on-tree downsampling (reject tại chỗ), và continuous memory per leaf (cache-friendly). Xem notebook trước để hiểu chi tiết cơ chế.
        </P>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { label: "KNN Search", val: "−30%", sub: "vs ikd-Tree", color: C.green },
              { label: "Insert", val: "−66%", sub: "vs ikd-Tree", color: C.green },
              { label: "Rebalance", val: "none", sub: "never needed", color: C.green },
              { label: "Memory", val: "lower", sub: "continuous storage", color: C.green },
            ].map((m, i) => (
              <div key={i} style={{
                background: `${m.color}08`, border: `1px solid ${m.color}25`,
                borderRadius: 6, padding: "10px 8px", textAlign: "center",
              }}>
                <div style={{ color: m.color, fontSize: 18, fontWeight: 800, fontFamily: "monospace" }}>{m.val}</div>
                <div style={{ color: C.dim, fontSize: 10, fontFamily: "monospace", marginTop: 2 }}>{m.label}</div>
                <div style={{ color: C.muted, fontSize: 9, fontFamily: "monospace" }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* §8 When SGal(3) matters */}
        <S n={8}>Khi nào SGal(3) tạo khác biệt?</S>
        <P>
          SGal(3) mạnh nhất khi <B color={C.text}>LiDAR không đủ thông tin</B> — filter phải dựa vào prediction (IMU) nhiều hơn. Compound SO(3)×ℝ⁶ tích lũy drift vì xấp xỉ V₁ ≈ I. SGal(3) propagate chính xác hơn → ít drift hơn trong các hướng unconstrained.
        </P>
        <Card><DegenerateViz /></Card>

        {/* §9 Summary */}
        <S n={9}>Contributions tóm gọn</S>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {[
              {
                title: "SGal(3) State",
                color: C.amber,
                items: ["Exact ZOH integration", "Coupled R↔v↔p↔τ", "Robust in degenerate geometry", "dim 10 (vs 9 for compound)"],
              },
              {
                title: "i-Octree Map",
                color: C.green,
                items: ["No rebalance needed", "Cache-friendly (Morton)", "On-tree downsampling", "Box-wise delete"],
              },
              {
                title: "Clean Codebase",
                color: C.blue,
                items: ["manif library for Lie groups", "No IKFoM dependency", "No ikd-Tree dependency", "Open source + extensible"],
              },
            ].map((col, i) => (
              <div key={i} style={{
                background: `${col.color}08`, border: `1px solid ${col.color}25`,
                borderRadius: 8, padding: 14,
              }}>
                <div style={{ color: col.color, fontFamily: "monospace", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                  {col.title}
                </div>
                {col.items.map((item, j) => (
                  <div key={j} style={{ color: C.dim, fontSize: 11, lineHeight: 1.8, paddingLeft: 8, borderLeft: `2px solid ${col.color}30` }}>
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <div style={{ textAlign: "center", padding: "28px 0 40px", color: C.muted, fontSize: 11, fontFamily: "monospace" }}>
          LIMOncello · Pérez-Ruiz & Solà · github.com/CPerezRuiz335/LIMOncello
        </div>
      </div>
    </div>
  );
}
