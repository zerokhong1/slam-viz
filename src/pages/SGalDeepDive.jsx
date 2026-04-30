import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  bg: "#06090f", card: "#0d1420", border: "#182436",
  blue: "#4a9eff", amber: "#ffb347", green: "#4ade80",
  red: "#f87171", purple: "#c084fc", cyan: "#22d3ee",
  pink: "#f472b6", text: "#dfe6ee", dim: "#8899ad", muted: "#4a5a6e",
};

function S({ n, children }) {
  return (
    <div style={{ marginTop: n > 1 ? 52 : 0, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 13, fontWeight: 800, fontFamily: "monospace",
          background: `${C.amber}20`, color: C.amber, border: `1.5px solid ${C.amber}50`,
        }}>{n}</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-0.02em" }}>{children}</h2>
      </div>
    </div>
  );
}
function P({ children }) { return <p style={{ color: C.dim, lineHeight: 1.85, fontSize: 13.5, margin: "8px 0" }}>{children}</p>; }
function B({ color = C.amber, children }) { return <strong style={{ color }}>{children}</strong>; }
function Cd({ children }) { return <code style={{ background: "#182436", color: C.cyan, padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>{children}</code>; }
function Card({ children, style = {} }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginTop: 14, ...style }}>{children}</div>;
}

// ══════════════════════════════════════════════════════
// §1 — The Core Problem: What goes wrong with SO(3)×R6
// ══════════════════════════════════════════════════════

function CoreProblemViz() {
  const [omega, setOmega] = useState(0.5);
  const [dt, setDt] = useState(0.1);
  const w = 680, h = 320;

  // Simulate 2D (simplification for visualization)
  // Compound: p += v*dt + 0.5*R*a*dt^2 (R and v independent)
  // SGal: coupled through left Jacobian
  const a = 2.0; // acceleration in body frame
  const steps = 20;

  const compound = [];
  const sgal = [];
  let cR = 0, cV = 0, cP = 0;
  let gR = 0, gV = 0, gP = 0;

  for (let i = 0; i <= steps; i++) {
    compound.push({ r: cR, v: cV, p: cP });
    sgal.push({ r: gR, v: gV, p: gP });

    // Compound: treat R, v, p independently
    const cRnew = cR + omega * dt;
    const cVnew = cV + Math.cos(cR) * a * dt; // R_k * a * dt (using old R)
    const cPnew = cP + cV * dt + 0.5 * Math.cos(cR) * a * dt * dt; // v_k*dt + 0.5*R_k*a*dt^2
    cR = cRnew; cV = cVnew; cP = cPnew;

    // SGal(3): exact integration under constant omega, a
    // During interval [0, dt], rotation changes continuously
    // p integrates over the whole interval accounting for rotation change
    const phi = omega * dt;
    const sinc = Math.abs(phi) < 1e-6 ? 1 : Math.sin(phi) / phi;
    const cosc = Math.abs(phi) < 1e-6 ? 0 : (1 - Math.cos(phi)) / phi;
    // V1 = J_l(phi) for 2D: [[sinc, -cosc], [cosc, sinc]]
    // V2 (second integral) for position
    const V1_00 = sinc, V1_01 = -cosc;
    const V1_10 = cosc, V1_11 = sinc;

    // Exact: v += R * V1 * a * dt (V1 encodes rotation during interval)
    const gRnew = gR + phi;
    const ax_body = a, ay_body = 0;
    const gVnew = gV + (Math.cos(gR) * (V1_00 * ax_body) + (-Math.sin(gR)) * (V1_10 * ax_body)) * dt;

    // Position uses second-order integral
    const sinc2 = Math.abs(phi) < 1e-6 ? 0.5 : (1 - sinc) / (phi);
    const cosc2 = Math.abs(phi) < 1e-6 ? 0 : (1 - Math.cos(phi)) / (phi * phi);
    const V2_00 = Math.abs(phi) < 1e-6 ? 0.5 : (1 - Math.cos(phi)) / (phi * phi);
    const V2_10 = Math.abs(phi) < 1e-6 ? 0 : (phi - Math.sin(phi)) / (phi * phi);

    const gPnew = gP + gV * dt + (Math.cos(gR) * V2_00 * ax_body + (-Math.sin(gR)) * V2_10 * ax_body) * dt * dt;
    gR = gRnew; gV = gVnew; gP = gPnew;
  }

  const allP = [...compound.map(c => c.p), ...sgal.map(s => s.p)];
  const allV = [...compound.map(c => c.v), ...sgal.map(s => s.v)];
  const minP = Math.min(...allP), maxP = Math.max(...allP);
  const minV = Math.min(...allV), maxV = Math.max(...allV);

  const px = (i) => 60 + (i / steps) * (w - 100);

  const pyP = (v) => {
    const range = maxP - minP || 1;
    return 280 - ((v - minP) / range) * 240 + 20;
  };
  const pyV = (v) => {
    const range = maxV - minV || 1;
    return 280 - ((v - minV) / range) * 240 + 20;
  };

  const diff = Math.abs(compound[steps].p - sgal[steps].p);

  return (
    <div>
      <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ color: C.dim, fontSize: 11, fontFamily: "monospace", marginBottom: 4 }}>
            Angular velocity ω = {omega.toFixed(2)} rad/s
          </div>
          <input type="range" min={0.1} max={2.0} step={0.1} value={omega}
            onChange={e => setOmega(Number(e.target.value))}
            style={{ width: 180 }} />
        </div>
        <div>
          <div style={{ color: C.dim, fontSize: 11, fontFamily: "monospace", marginBottom: 4 }}>
            Time step Δt = {dt.toFixed(3)} s
          </div>
          <input type="range" min={0.01} max={0.2} step={0.01} value={dt}
            onChange={e => setDt(Number(e.target.value))}
            style={{ width: 180 }} />
        </div>
        <div style={{
          background: diff > 0.5 ? `${C.red}15` : `${C.green}15`,
          border: `1px solid ${diff > 0.5 ? C.red : C.green}40`,
          borderRadius: 6, padding: "6px 14px",
        }}>
          <div style={{ color: C.dim, fontSize: 10, fontFamily: "monospace" }}>Position error</div>
          <div style={{ color: diff > 0.5 ? C.red : C.green, fontSize: 16, fontWeight: 800, fontFamily: "monospace" }}>
            {diff.toFixed(3)} m
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", background: "#080e18", borderRadius: 8 }}>
        {/* Grid */}
        <line x1={60} y1={h - 30} x2={w - 30} y2={h - 30} stroke={C.border} strokeWidth={1} />
        <line x1={60} y1={20} x2={60} y2={h - 30} stroke={C.border} strokeWidth={1} />
        <text x={w / 2} y={h - 10} fill={C.muted} fontSize={9} fontFamily="monospace" textAnchor="middle">IMU step index</text>

        {/* Compound trajectory */}
        <polyline fill="none" stroke={C.red} strokeWidth={2} opacity={0.8}
          points={compound.map((c, i) => `${px(i)},${pyP(c.p)}`).join(" ")} />
        {/* SGal trajectory */}
        <polyline fill="none" stroke={C.green} strokeWidth={2} opacity={0.8}
          points={sgal.map((s, i) => `${px(i)},${pyP(s.p)}`).join(" ")} />

        {/* Error region */}
        {compound.map((c, i) => {
          const s = sgal[i];
          if (i % 2 !== 0) return null;
          return (
            <line key={i} x1={px(i)} y1={pyP(c.p)} x2={px(i)} y2={pyP(s.p)}
              stroke={C.amber} strokeWidth={1} opacity={0.3} strokeDasharray="2 2" />
          );
        })}

        {/* End markers */}
        <circle cx={px(steps)} cy={pyP(compound[steps].p)} r={5} fill={C.red} />
        <circle cx={px(steps)} cy={pyP(sgal[steps].p)} r={5} fill={C.green} />

        {/* Legend */}
        <g transform="translate(80, 30)">
          <line x1={0} y1={0} x2={20} y2={0} stroke={C.red} strokeWidth={2} />
          <text x={26} y={4} fill={C.red} fontSize={10} fontFamily="monospace">SO(3)×ℝ⁶ (V₁≈I)</text>
          <line x1={0} y1={18} x2={20} y2={18} stroke={C.green} strokeWidth={2} />
          <text x={26} y={22} fill={C.green} fontSize={10} fontFamily="monospace">SGal(3) (exact J_l)</text>
          <line x1={0} y1={36} x2={20} y2={36} stroke={C.amber} strokeWidth={1} strokeDasharray="2 2" />
          <text x={26} y={40} fill={C.amber} fontSize={10} fontFamily="monospace">error gap</text>
        </g>

        <text x={w - 40} y={40} fill={C.dim} fontSize={9} fontFamily="monospace" textAnchor="end">
          position
        </text>
      </svg>

      <div style={{ color: C.muted, fontSize: 11, fontFamily: "monospace", marginTop: 6 }}>
        Kéo ω lên cao hoặc Δt lên lớn → gap tăng nhanh. Đây là lý do SGal(3) quan trọng ở high angular rate và low LiDAR rate.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// §3 — V1 approximation explained
// ══════════════════════════════════════════════════════

function V1ExplainViz() {
  const [phi, setPhi] = useState(0.3);
  const sinc = Math.abs(phi) < 1e-8 ? 1 : Math.sin(phi) / phi;
  const cosc = Math.abs(phi) < 1e-8 ? 0 : (1 - Math.cos(phi)) / phi;

  const w = 500, h = 240;
  const cx = 250, cy = 140, r = 80;

  const err = Math.sqrt((sinc - 1) ** 2 + cosc ** 2);

  return (
    <div>
      <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ color: C.dim, fontSize: 11, fontFamily: "monospace", marginBottom: 4 }}>
            φ = ω·Δt = {phi.toFixed(2)} rad ({(phi * 180 / Math.PI).toFixed(1)}°)
          </div>
          <input type="range" min={0.01} max={1.5} step={0.01} value={phi}
            onChange={e => setPhi(Number(e.target.value))} style={{ width: 200 }} />
        </div>
        <div style={{
          background: `${err > 0.05 ? C.red : C.green}12`,
          border: `1px solid ${err > 0.05 ? C.red : C.green}30`,
          borderRadius: 6, padding: "4px 12px",
        }}>
          <div style={{ color: C.muted, fontSize: 9, fontFamily: "monospace" }}>‖V₁ − I‖</div>
          <div style={{ color: err > 0.05 ? C.red : C.green, fontSize: 14, fontWeight: 800, fontFamily: "monospace" }}>
            {err.toFixed(4)}
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, background: "#080e18", borderRadius: 8 }}>
        {/* Circle (rotation manifold) */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={1} />

        {/* Start direction */}
        <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke={C.muted} strokeWidth={1.5} />
        <text x={cx + r + 8} y={cy + 4} fill={C.muted} fontSize={10} fontFamily="monospace">t=0</text>

        {/* End direction (after rotation phi) */}
        <line x1={cx} y1={cy} x2={cx + r * Math.cos(phi)} y2={cy - r * Math.sin(phi)}
          stroke={C.blue} strokeWidth={1.5} />
        <text x={cx + r * Math.cos(phi) + 8} y={cy - r * Math.sin(phi)}
          fill={C.blue} fontSize={10} fontFamily="monospace">t=Δt</text>

        {/* Arc */}
        <path d={`M ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx + r * Math.cos(phi)} ${cy - r * Math.sin(phi)}`}
          fill="none" stroke={C.amber} strokeWidth={2} />
        <text x={cx + r * 0.7 * Math.cos(phi / 2) + 10} y={cy - r * 0.7 * Math.sin(phi / 2)}
          fill={C.amber} fontSize={11} fontFamily="monospace" fontWeight={700}>φ</text>

        {/* V1 ≈ I: straight line (tangent approximation) */}
        <line x1={cx + r} y1={cy} x2={cx + r} y2={cy - r * phi}
          stroke={C.red} strokeWidth={2} strokeDasharray="4 3" />
        <text x={cx + r + 8} y={cy - r * phi / 2} fill={C.red} fontSize={9} fontFamily="monospace">
          V₁≈I
        </text>

        {/* Exact V1 result */}
        <line x1={cx + r} y1={cy}
          x2={cx + r + r * (-cosc)} y2={cy - r * sinc * phi}
          stroke={C.green} strokeWidth={2} />
        <circle cx={cx + r + r * (-cosc)} cy={cy - r * sinc * phi} r={4} fill={C.green} />
        <text x={cx + r + r * (-cosc) - 40} y={cy - r * sinc * phi - 8}
          fill={C.green} fontSize={9} fontFamily="monospace">exact V₁</text>

        {/* Error arrow */}
        {err > 0.02 && (
          <line x1={cx + r} y1={cy - r * phi}
            x2={cx + r + r * (-cosc)} y2={cy - r * sinc * phi}
            stroke={C.red} strokeWidth={1.5} opacity={0.6}
            markerEnd="url(#arrowR)" />
        )}

        <defs>
          <marker id="arrowR" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill={C.red} />
          </marker>
        </defs>

        {/* Explanation */}
        <text x={20} y={20} fill={C.dim} fontSize={10} fontFamily="monospace">
          Tác động của acceleration a qua interval Δt:
        </text>
        <text x={20} y={35} fill={C.red} fontSize={10} fontFamily="monospace">
          V₁≈I: a tác động theo hướng CỐ ĐỊNH (t=0)
        </text>
        <text x={20} y={50} fill={C.green} fontSize={10} fontFamily="monospace">
          V₁ exact: a tác động QUAY DẦN theo rotation
        </text>
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// §5 — Step by step numerical example
// ══════════════════════════════════════════════════════

function NumericalExample() {
  const [step, setStep] = useState(0);
  const omega = 0.5; // rad/s
  const ax = 2.0; // m/s^2 in body x
  const dt = 0.1; // seconds
  const phi = omega * dt; // 0.05 rad

  const sinc_v = Math.sin(phi) / phi;
  const cosc_v = (1 - Math.cos(phi)) / phi;
  const V1 = [[sinc_v, -cosc_v], [cosc_v, sinc_v]];

  const steps_data = [
    {
      title: "Input: IMU measurement",
      content: [
        { l: "ω (angular velocity)", v: `${omega} rad/s`, c: C.blue },
        { l: "a (body acceleration)", v: `[${ax}, 0] m/s²`, c: C.cyan },
        { l: "Δt (time step)", v: `${dt} s`, c: C.pink },
        { l: "φ = ω·Δt", v: `${phi.toFixed(3)} rad (${(phi * 180 / Math.PI).toFixed(1)}°)`, c: C.amber },
      ]
    },
    {
      title: "SO(3)×ℝ⁶: V₁ ≈ I (identity)",
      content: [
        { l: "V₁ (approximated)", v: "[[1, 0], [0, 1]]", c: C.red },
        { l: "R_k · V₁ · a · Δt", v: `R_k · [${ax}, 0]ᵀ · ${dt}`, c: C.red },
        { l: "→ Assumes a acts in FIXED direction of R_k", v: "", c: C.red },
        { l: "Error: ignores rotation DURING Δt", v: "", c: C.red },
      ]
    },
    {
      title: "SGal(3): V₁ = J_l(φ) (exact left Jacobian)",
      content: [
        { l: "sinc(φ) = sin(φ)/φ", v: sinc_v.toFixed(6), c: C.green },
        { l: "(1−cos(φ))/φ", v: cosc_v.toFixed(6), c: C.green },
        { l: `V₁ (exact)`, v: `[[${sinc_v.toFixed(4)}, ${(-cosc_v).toFixed(4)}], [${cosc_v.toFixed(4)}, ${sinc_v.toFixed(4)}]]`, c: C.green },
        { l: "→ Accounts for rotation DURING Δt", v: "", c: C.green },
      ]
    },
    {
      title: "Sai số mỗi step",
      content: [
        { l: "V₁ exact - I", v: `[[${(sinc_v - 1).toFixed(6)}, ${(-cosc_v).toFixed(6)}], [${cosc_v.toFixed(6)}, ${(sinc_v - 1).toFixed(6)}]]`, c: C.amber },
        { l: "‖V₁ − I‖ (Frobenius)", v: `${Math.sqrt(2 * (sinc_v - 1) ** 2 + 2 * cosc_v ** 2).toFixed(6)}`, c: C.amber },
        { l: "Velocity error per step", v: `${(Math.abs(cosc_v) * ax * dt).toFixed(6)} m/s`, c: C.amber },
        { l: "After 100 steps (1s)", v: `~${(Math.abs(cosc_v) * ax * dt * 100).toFixed(3)} m/s accumulated`, c: C.red },
      ]
    },
  ];

  const cur = steps_data[step];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {steps_data.map((s, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            background: step === i ? C.amber : "#182436", color: step === i ? "#000" : C.text,
            border: "none", borderRadius: 5, padding: "5px 10px", cursor: "pointer",
            fontSize: 11, fontFamily: "monospace", fontWeight: step === i ? 700 : 400,
          }}>{i + 1}</button>
        ))}
      </div>

      <div style={{
        background: `${C.card}`, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16,
      }}>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 700, fontFamily: "monospace", marginBottom: 12 }}>
          Step {step + 1}: {cur.title}
        </div>
        {cur.content.map((item, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "6px 0", borderBottom: i < cur.content.length - 1 ? `1px solid ${C.border}` : "none",
          }}>
            <span style={{ color: C.dim, fontSize: 12, fontFamily: "monospace" }}>{item.l}</span>
            <span style={{ color: item.c, fontSize: 12, fontFamily: "monospace", fontWeight: 600 }}>{item.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// §6 — Drift accumulation over 100 steps
// ══════════════════════════════════════════════════════

function DriftSimulation() {
  const [omegaScale, setOmegaScale] = useState(3);
  const omega = omegaScale * 0.2;
  const ax = 2.0, dt = 0.01;
  const N = 200;

  const compound = [{ x: 0, y: 0 }];
  const exact = [{ x: 0, y: 0 }];
  let cR = 0, cVx = 0, cVy = 0, cPx = 0, cPy = 0;
  let gR = 0, gVx = 0, gVy = 0, gPx = 0, gPy = 0;

  for (let i = 0; i < N; i++) {
    // Compound
    const ccR = Math.cos(cR), scR = Math.sin(cR);
    cPx += cVx * dt + 0.5 * ccR * ax * dt * dt;
    cPy += cVy * dt + 0.5 * (-scR) * ax * dt * dt;
    cVx += ccR * ax * dt;
    cVy += (-scR) * ax * dt;
    cR += omega * dt;
    compound.push({ x: cPx, y: cPy });

    // Exact (SGal)
    const phi = omega * dt;
    const sinc = Math.abs(phi) < 1e-8 ? 1 : Math.sin(phi) / phi;
    const cosc = Math.abs(phi) < 1e-8 ? 0 : (1 - Math.cos(phi)) / phi;
    const cgR = Math.cos(gR), sgR = Math.sin(gR);

    const v1ax = sinc * ax;
    const v1ay = cosc * ax;
    const dvx = cgR * v1ax - (-sgR) * v1ay;
    const dvy = (-sgR) * v1ax + cgR * v1ay;

    // Second integral for position
    const V2_00 = Math.abs(phi) < 1e-8 ? 0.5 : (1 - Math.cos(phi)) / (phi * phi);
    const V2_10 = Math.abs(phi) < 1e-8 ? 0 : (phi - Math.sin(phi)) / (phi * phi);
    const v2ax = V2_00 * ax;
    const v2ay = V2_10 * ax;
    const dpx_rot = cgR * v2ax - (-sgR) * v2ay;
    const dpy_rot = (-sgR) * v2ax + cgR * v2ay;

    gPx += gVx * dt + dpx_rot * dt * dt;
    gPy += gVy * dt + dpy_rot * dt * dt;
    gVx += dvx * dt;
    gVy += dvy * dt;
    gR += phi;
    exact.push({ x: gPx, y: gPy });
  }

  const allX = [...compound.map(p => p.x), ...exact.map(p => p.x)];
  const allY = [...compound.map(p => p.y), ...exact.map(p => p.y)];
  const minX = Math.min(...allX), maxX = Math.max(...allX);
  const minY = Math.min(...allY), maxY = Math.max(...allY);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
  const range = Math.max(rangeX, rangeY) * 1.1;
  const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;

  const w = 600, h = 400;
  const sx = (v) => ((v - midX) / range + 0.5) * (w - 60) + 30;
  const sy = (v) => (0.5 - (v - midY) / range) * (h - 60) + 30;

  const endDist = Math.sqrt((compound[N].x - exact[N].x) ** 2 + (compound[N].y - exact[N].y) ** 2);

  return (
    <div>
      <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: C.dim, fontSize: 11, fontFamily: "monospace", marginBottom: 4 }}>
            ω = {omega.toFixed(1)} rad/s | Δt = {dt}s | {N} steps ({(N * dt).toFixed(1)}s)
          </div>
          <input type="range" min={1} max={10} step={1} value={omegaScale}
            onChange={e => setOmegaScale(Number(e.target.value))} style={{ width: 200 }} />
        </div>
        <div style={{
          background: `${C.red}15`, border: `1px solid ${C.red}40`,
          borderRadius: 6, padding: "4px 14px",
        }}>
          <div style={{ color: C.muted, fontSize: 9, fontFamily: "monospace" }}>End-point drift</div>
          <div style={{ color: C.red, fontSize: 16, fontWeight: 800, fontFamily: "monospace" }}>
            {endDist.toFixed(4)} m
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", background: "#080e18", borderRadius: 8 }}>
        {/* Compound trajectory */}
        <polyline fill="none" stroke={C.red} strokeWidth={2} opacity={0.7}
          points={compound.map(p => `${sx(p.x)},${sy(p.y)}`).join(" ")} />
        {/* Exact trajectory */}
        <polyline fill="none" stroke={C.green} strokeWidth={2} opacity={0.7}
          points={exact.map(p => `${sx(p.x)},${sy(p.y)}`).join(" ")} />

        {/* Start */}
        <circle cx={sx(0)} cy={sy(0)} r={6} fill={C.amber} />
        <text x={sx(0) + 10} y={sy(0) + 4} fill={C.amber} fontSize={10} fontFamily="monospace">start</text>

        {/* End markers */}
        <circle cx={sx(compound[N].x)} cy={sy(compound[N].y)} r={5} fill={C.red} />
        <circle cx={sx(exact[N].x)} cy={sy(exact[N].y)} r={5} fill={C.green} />

        {/* Error line */}
        <line x1={sx(compound[N].x)} y1={sy(compound[N].y)}
          x2={sx(exact[N].x)} y2={sy(exact[N].y)}
          stroke={C.amber} strokeWidth={1.5} strokeDasharray="4 3" />

        <g transform={`translate(20, 20)`}>
          <line x1={0} y1={0} x2={16} y2={0} stroke={C.red} strokeWidth={2} />
          <text x={22} y={4} fill={C.red} fontSize={10} fontFamily="monospace">SO(3)×ℝ⁶</text>
          <line x1={0} y1={16} x2={16} y2={16} stroke={C.green} strokeWidth={2} />
          <text x={22} y={20} fill={C.green} fontSize={10} fontFamily="monospace">SGal(3)</text>
        </g>
      </svg>

      <div style={{ color: C.muted, fontSize: 11, fontFamily: "monospace", marginTop: 6 }}>
        2D simulation: constant ω và a trong body frame. Kéo slider → ω cao hơn → drift rõ rệt hơn.
        Trong 3D, hiệu ứng mạnh hơn vì coupling xảy ra trên cả 3 trục.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// §7 — When does it matter (scenario comparison)
// ══════════════════════════════════════════════════════

function ScenarioGrid() {
  const scenarios = [
    {
      name: "Campus (structured)",
      omega: "~0.1 rad/s",
      lidar: "fully constrained",
      gap: "tiny",
      verdict: "SGal(3) ≈ SO(3)×ℝ⁶",
      color: C.green,
      icon: "🏫",
      reason: "LiDAR update sửa hết → prediction error không tích lũy",
    },
    {
      name: "Tunnel (degenerate)",
      omega: "~0.1 rad/s",
      lidar: "1-2 DoF unconstrained",
      gap: "large",
      verdict: "SGal(3) >> SO(3)×ℝ⁶",
      color: C.red,
      icon: "🚇",
      reason: "Hướng dọc tunnel: LiDAR không đo được → filter dựa hoàn toàn vào prediction → drift tích lũy",
    },
    {
      name: "Drone (high ω)",
      omega: "~2 rad/s",
      lidar: "varies",
      gap: "significant",
      verdict: "SGal(3) > SO(3)×ℝ⁶",
      color: C.amber,
      icon: "🛩",
      reason: "V₁ ≈ I sai nhiều khi ω·Δt lớn → velocity/position prediction bị lệch mỗi step",
    },
    {
      name: "Low-rate LiDAR",
      omega: "any",
      lidar: "10Hz (40 IMU steps/scan)",
      gap: "accumulates",
      verdict: "SGal(3) > SO(3)×ℝ⁶",
      color: C.amber,
      icon: "📡",
      reason: "40 IMU steps giữa 2 LiDAR corrections → 40 lần tích lũy V₁ error trước khi được sửa",
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {scenarios.map((s, i) => (
        <div key={i} style={{
          background: `${s.color}08`, border: `1px solid ${s.color}25`,
          borderRadius: 8, padding: 14,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: s.color, fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>
              {s.icon} {s.name}
            </span>
            <span style={{
              fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: s.color,
              background: `${s.color}15`, padding: "2px 8px", borderRadius: 4,
            }}>{s.gap}</span>
          </div>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: C.dim, lineHeight: 1.7 }}>
            <div>ω: {s.omega}</div>
            <div>LiDAR: {s.lidar}</div>
          </div>
          <div style={{
            marginTop: 8, fontSize: 11, color: s.color, fontFamily: "monospace",
            fontWeight: 600, padding: "4px 8px", background: `${s.color}10`, borderRadius: 4,
          }}>{s.verdict}</div>
          <div style={{ marginTop: 6, fontSize: 10, color: C.muted, lineHeight: 1.6 }}>
            {s.reason}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════

export default function SGalDeepDive() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "32px 16px", fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: C.amber, letterSpacing: "0.12em", marginBottom: 6 }}>DEEP DIVE</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
            SGal(3) vs SO(3)×ℝ⁶
          </h1>
          <div style={{ color: C.dim, fontSize: 13 }}>Tại sao compound representation gây drift, và SGal(3) fix điều đó</div>
        </div>

        {/* §1 */}
        <S n={1}>Vấn đề gốc: tại sao cần coupling?</S>
        <P>
          Robot đang quay với angular velocity <B color={C.blue}>ω</B> và tăng tốc với acceleration <B color={C.cyan}>a</B> (trong body frame). Trong khoảng Δt, robot vừa quay vừa tịnh tiến <B color={C.text}>đồng thời</B>. Hướng mà <B color={C.cyan}>a</B> tác động lên velocity <B color={C.text}>thay đổi liên tục</B> theo rotation.
        </P>
        <P>
          <B color={C.red}>SO(3)×ℝ⁶</B> giả sử: trong khoảng Δt, acceleration <B color={C.cyan}>a</B> tác động theo hướng cố định (hướng tại t=0). Nói cách khác, <B color={C.red}>V₁ ≈ I</B> — left Jacobian xấp xỉ bằng identity.
        </P>
        <P>
          <B color={C.green}>SGal(3)</B> dùng <B color={C.green}>V₁ = J_l(φ)</B> chính xác — encode sự thay đổi hướng của <B color={C.cyan}>a</B> theo rotation trong suốt interval Δt. Exponential map của SGal(3) <B color={C.green}>chính là</B> nghiệm đóng dạng closed-form của IMU integration dưới zero-order hold.
        </P>

        {/* §2 — Interactive comparison */}
        <S n={2}>Minh họa: sai lệch tích lũy qua N steps</S>
        <P>
          Kéo <B color={C.blue}>ω</B> (angular velocity) và <B color={C.pink}>Δt</B> (time step). Quan sát: khi ω·Δt nhỏ, hai đường gần trùng. Khi ω·Δt lớn, compound (đỏ) lệch khỏi exact (xanh) rõ rệt.
        </P>
        <Card><CoreProblemViz /></Card>

        {/* §3 — V1 explained */}
        <S n={3}>V₁ = J_l(φ) là gì? Tại sao V₁ ≈ I sai?</S>
        <P>
          Hình dung trong 2D: robot quay 1 góc <B>φ = ω·Δt</B> trong interval Δt. Acceleration <B color={C.cyan}>a</B> (hướng body-x) tác động lên velocity.
        </P>
        <P>
          <B color={C.red}>V₁ ≈ I</B>: giả sử <B color={C.cyan}>a</B> tác động thẳng lên (theo hướng tại t=0) trong suốt Δt. Kết quả: velocity increment theo hướng cố định.
        </P>
        <P>
          <B color={C.green}>V₁ exact</B>: <B color={C.cyan}>a</B> quay dần từ hướng (t=0) sang hướng (t=Δt). Left Jacobian <Cd>J_l(φ)</Cd> tính trung bình có trọng số của tất cả hướng mà <B color={C.cyan}>a</B> đi qua. Kết quả: velocity increment hơi lệch sang phải và ngắn hơn (vì cos averaging).
        </P>
        <Card><V1ExplainViz /></Card>
        <P>
          <B>Key insight</B>: khi φ nhỏ ({"<"}5°), V₁ ≈ I là xấp xỉ tốt vì sinc(φ) ≈ 1 và (1−cos φ)/φ ≈ 0. Khi φ lớn (high ω hoặc large Δt), V₁ − I có magnitude đáng kể → sai lệch velocity mỗi step → tích lũy thành drift position.
        </P>

        {/* §4 — Where compound fails */}
        <S n={4}>3 equations riêng biệt vs 1 group composition</S>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: `${C.red}08`, border: `1px solid ${C.red}25`, borderRadius: 8, padding: 14 }}>
              <div style={{ color: C.red, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 10 }}>
                SO(3)×ℝ⁶ — 3 equations
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: C.dim, lineHeight: 2.2 }}>
                <div><span style={{ color: C.blue }}>R</span> = R · Exp(ω̃·Δt)</div>
                <div><span style={{ color: C.green }}>v</span> = v + <span style={{ color: C.blue }}>R</span>·<span style={{ color: C.red }}>I</span>·ã·Δt + g·Δt</div>
                <div><span style={{ color: C.amber }}>p</span> = p + v·Δt + ½·<span style={{ color: C.blue }}>R</span>·<span style={{ color: C.red }}>I</span>·ã·Δt²</div>
              </div>
              <div style={{ marginTop: 10, padding: "6px 8px", background: `${C.red}10`, borderRadius: 4 }}>
                <div style={{ color: C.red, fontSize: 10, lineHeight: 1.6 }}>
                  <B color={C.red}>V₁ = I</B> — acceleration a tác động theo hướng cố định R_k.
                  R, v, p cập nhật <B color={C.red}>không biết</B> nhau đang thay đổi trong cùng interval.
                </div>
              </div>
            </div>

            <div style={{ background: `${C.green}08`, border: `1px solid ${C.green}25`, borderRadius: 8, padding: 14 }}>
              <div style={{ color: C.green, fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginBottom: 10 }}>
                SGal(3) — 1 composition
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: C.dim, lineHeight: 2.2 }}>
                <div>u = [<span style={{ color: C.amber }}>ã·Δt²</span>, <span style={{ color: C.green }}>ã·Δt</span>, <span style={{ color: C.blue }}>ω̃·Δt</span>, <span style={{ color: C.pink }}>Δt</span>]</div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ color: C.amber, fontWeight: 700 }}>Γ = Γ · Exp(u)</span>
                </div>
                <div style={{ marginTop: 4, color: C.muted }}>→ R, v, p, τ updated jointly</div>
              </div>
              <div style={{ marginTop: 10, padding: "6px 8px", background: `${C.green}10`, borderRadius: 4 }}>
                <div style={{ color: C.green, fontSize: 10, lineHeight: 1.6 }}>
                  <B color={C.green}>V₁ = J_l(φ)</B> — acceleration a tác động quay dần theo rotation.
                  Exp map encode <B color={C.green}>coupling R↔v↔p</B> tự nhiên qua left Jacobian.
                </div>
              </div>
            </div>
          </div>
        </Card>

        <P>
          <B>Covariance propagation cũng bị ảnh hưởng.</B> Error-state Jacobian F_x trong compound là block-sparse (cross-term yếu). Trong SGal(3), F_x = Adjoint 10×10 dense, encode đầy đủ coupling → predicted uncertainty ellipsoid chính xác hơn → IESKF update hiệu quả hơn.
        </P>

        {/* §5 — Numerical */}
        <S n={5}>Ví dụ số cụ thể</S>
        <P>
          Bấm qua 4 bước để thấy: cùng input (ω, a, Δt), V₁ ≈ I cho kết quả khác V₁ exact bao nhiêu, và sai số tích lũy thế nào.
        </P>
        <Card><NumericalExample /></Card>

        {/* §6 — Drift simulation */}
        <S n={6}>Drift tích lũy: 2D trajectory simulation</S>
        <P>
          Robot chạy với constant ω và constant a trong body frame. So sánh trajectory sau 200 IMU steps. Kéo slider tăng ω → drift rõ rệt.
        </P>
        <Card><DriftSimulation /></Card>

        {/* §7 — When it matters */}
        <S n={7}>Khi nào SGal(3) tạo khác biệt thực tế?</S>
        <P>
          SGal(3) không phải lúc nào cũng tốt hơn đáng kể. Nó tỏa sáng khi filter <B color={C.text}>phải dựa vào prediction nhiều</B> — tức LiDAR update không đủ để sửa hết error. Có 3 điều kiện tạo ra tình huống này:
        </P>
        <Card><ScenarioGrid /></Card>

        {/* §8 — One liner */}
        <S n={8}>Tóm gọn</S>
        <Card style={{
          background: "linear-gradient(135deg, rgba(74,222,128,0.06), rgba(255,179,71,0.06))",
          border: `1px solid rgba(74,222,128,0.2)`,
        }}>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: C.dim, lineHeight: 2 }}>
            <div><B color={C.red}>SO(3)×ℝ⁶</B>: R, v, p là 3 biến độc lập. Prediction = 3 equations riêng. V₁ ≈ I bỏ qua coupling.</div>
            <div><B color={C.green}>SGal(3)</B>: R, v, p, τ gom trong 1 ma trận 5×5. Prediction = 1 group composition. Exp map encode exact coupling qua J_l(φ).</div>
            <div style={{ marginTop: 8 }}><B>Hệ quả thực tế</B>: trên campus — gần như giống nhau. Trong tunnel / high ω / low LiDAR rate — SGal(3) ít drift hơn đáng kể vì prediction chính xác hơn ở những hướng mà LiDAR không đo được.</div>
          </div>
        </Card>

        <div style={{ textAlign: "center", padding: "28px 0 40px", color: C.muted, fontSize: 11, fontFamily: "monospace" }}>
          SLAM Research Skill · SGal(3) Deep Dive · LIMOncello (Pérez-Ruiz & Solà, 2025)
        </div>
      </div>
    </div>
  );
}
