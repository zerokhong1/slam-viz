import { useState, useRef, useEffect } from "react";

const C = {
  bg: "#06090f", card: "#0d1420", border: "#182436",
  blue: "#4a9eff", amber: "#ffb347", green: "#4ade80",
  red: "#f87171", purple: "#c084fc", cyan: "#22d3ee",
  pink: "#f472b6", orange: "#fb923c",
  text: "#dfe6ee", dim: "#8899ad", muted: "#4a5a6e",
};

// ===== MATH UTILITIES =====
const sinc3 = x => Math.abs(x) < 1e-8 ? 1 : Math.sin(x) / x;
const cosc3 = x => Math.abs(x) < 1e-8 ? 0.5 : (1 - Math.cos(x)) / (x * x);
const sincComp = x => Math.abs(x) < 1e-8 ? 0 : (1 - Math.cos(x)) / x; // (1-cos θ)/θ
const c2f = x => Math.abs(x) < 1e-8 ? 1 / 6 : (x - Math.sin(x)) / (x ** 3);
const c3f = x => Math.abs(x) < 1e-8 ? 1 / 24 : (1 - x * x / 2 - Math.cos(x)) / (x ** 4);

const I3 = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const skew = v => [[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]];
const addM = (A, B) => A.map((r, i) => r.map((v, j) => v + B[i][j]));
const scaleM = (A, s) => A.map(r => r.map(v => v * s));
const mulM = (A, B) => {
  const R = [[0,0,0],[0,0,0],[0,0,0]];
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) for (let k=0;k<3;k++) R[i][j]+=A[i][k]*B[k][j];
  return R;
};
const mulMV = (A, v) => A.map(r => r[0]*v[0] + r[1]*v[1] + r[2]*v[2]);
const norm3 = v => Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
const diffNormF = (A, B) => Math.sqrt(A.flat().reduce((s, v, i) => s + (v - B.flat()[i])**2, 0));

const Rodrigues = phi => {
  const th = norm3(phi), K = skew(phi), K2 = mulM(K, K);
  return addM(I3(), addM(scaleM(K, sinc3(th)), scaleM(K2, cosc3(th))));
};
const JLeft = phi => {
  const th = norm3(phi), K = skew(phi), K2 = mulM(K, K);
  return addM(I3(), addM(scaleM(K, cosc3(th)), scaleM(K2, c2f(th))));
};
const V2mat = phi => {
  const th = norm3(phi), K = skew(phi), K2 = mulM(K, K);
  return addM(scaleM(I3(), 0.5), addM(scaleM(K, c2f(th)), scaleM(K2, c3f(th))));
};

const jlNorm = th => { const s = sinc3(th) - 1, c = sincComp(th); return Math.sqrt(2*s*s + 2*c*c); };
const cNormFn = th => diffNormF(Rodrigues([0, 0, th]), I3());
const v2NormFn = th => { const E = V2mat([0,0,th]); return diffNormF(E, scaleM(I3(), 0.5)); };

const computeGap = (omega, aMag, dt, N) => {
  const th = omega * dt, jl = jlNorm(th), dvStep = jl * aMag * dt;
  return { th, jlErr: jl, dvStep, dvAccum: N * dvStep, dpAccum: N*(N+1)/2 * dvStep * dt };
};

// ===== SHARED UI =====
function Sec({ n, title }) {
  return (
    <div style={{ marginTop: n > 1 ? 52 : 0, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 13, fontWeight: 800, fontFamily: "monospace",
          background: `${C.amber}20`, color: C.amber, border: `1.5px solid ${C.amber}50`,
        }}>{n}</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-0.02em" }}>{title}</h2>
      </div>
    </div>
  );
}
const P = ({ children }) => <p style={{ color: C.dim, lineHeight: 1.85, fontSize: 13.5, margin: "8px 0" }}>{children}</p>;
const B = ({ color = C.amber, children }) => <strong style={{ color }}>{children}</strong>;
const Cd = ({ children }) => <code style={{ background: "#182436", color: C.cyan, padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>{children}</code>;
function Card({ children, style = {} }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginTop: 14, ...style }}>{children}</div>;
}
function Btn({ onClick, children, color = C.amber, active = false }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `${color}25` : "transparent",
      border: `1px solid ${active ? color : C.border}`, borderRadius: 6,
      color: active ? color : C.dim, padding: "6px 14px", fontSize: 12,
      cursor: "pointer", fontFamily: "monospace", fontWeight: 700, transition: "all 0.15s",
    }}>{children}</button>
  );
}
function Slider({ label, value, min, max, step = 0.01, onChange, unit = "", fmt }) {
  const d = fmt ? fmt(value) : value.toFixed(step < 0.01 ? 4 : step < 0.1 ? 3 : 2);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.dim }}>
      <span style={{ width: 130, fontFamily: "monospace", flexShrink: 0 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))} style={{ flex: 1, accentColor: C.amber }} />
      <span style={{ width: 70, color: C.amber, fontFamily: "monospace", textAlign: "right", flexShrink: 0 }}>
        {d}{unit}
      </span>
    </label>
  );
}

function MatGrid({ M, color = C.text, refM }) {
  const n = M.length;
  const flat = M.flat();
  const refFlat = refM ? refM.flat() : null;
  return (
    <div style={{ display: "inline-grid", gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 2, background: "#080e18", padding: 6, borderRadius: 6 }}>
      {flat.map((v, idx) => {
        const diff = refFlat ? Math.abs(v - refFlat[idx]) : 0;
        const sig = diff > 0.001;
        return (
          <div key={idx} style={{
            fontFamily: "monospace", fontSize: 10, textAlign: "right", padding: "2px 5px",
            minWidth: 60, borderRadius: 2,
            background: sig ? `${C.amber}18` : "transparent",
            color: sig ? C.amber : color,
          }}>{v.toFixed(4)}</div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 1 — Interactive Timeline
// ═══════════════════════════════════════════════════════════════════
function Demo1() {
  const [omega, setOmega] = useState(1.0);
  const [aMag, setAMag] = useState(2.0);
  const [dt, setDt] = useState(0.01);
  const [expanded, setExpanded] = useState(new Set([4, 5, 6]));

  const phi = [0, 0, omega * dt];
  const th = omega * dt;
  const aBody = [aMag, 0, 0];
  const phiV = aBody.map(x => x * dt);
  const phiP = aBody.map(x => x * dt * dt);

  const D = JLeft(phi), E = V2mat(phi), Rk = I3(), vk = [1, 0, 0], pk = [0, 0, 0];

  const Dv = mulMV(D, phiV);
  const Ep = mulMV(E, phiP);
  const RkDv = mulMV(Rk, Dv);
  const RkEp = mulMV(Rk, Ep);
  const RkA = mulMV(Rk, aBody);

  const v_sgal = vk.map((v, i) => v + RkDv[i]);
  const p_sgal = pk.map((v, i) => v + vk[i]*dt + RkEp[i]);
  const v_comp = vk.map((v, i) => v + RkA[i]*dt);
  const p_comp = pk.map((v, i) => v + vk[i]*dt + 0.5*RkA[i]*dt*dt);

  const dv = norm3(v_sgal.map((v,i) => v - v_comp[i]));
  const dp = norm3(p_sgal.map((v,i) => v - p_comp[i]));
  const jlErr = jlNorm(th);

  const steps = [
    { id: 0, label: "INPUT: IMU sample k", diff: false,
      compound: `ω_k = [0,0,${omega}] rad/s\nã_k = [${aMag},0,0] m/s²\nΔt = ${dt}s`,
      sgal:     `(same input)\nω_k, ã_k, Δt` },
    { id: 1, label: "Bias correction", diff: false,
      compound: `ω̃_k = ω_k − b_g,k\nã_k  = a_k − b_a,k\n(demo: b = 0)`,
      sgal:     `Same` },
    { id: 2, label: "Rotation increment", diff: false,
      compound: `φ_k = ω̃_k·Δt = [0,0,${(th).toFixed(5)}]\nθ_k = ‖φ‖ = ${th.toFixed(5)} rad (${(th*180/Math.PI).toFixed(2)}°)`,
      sgal:     `Same\nφ_k = [0,0,${(th).toFixed(5)}]` },
    { id: 3, label: "Rotation update — same for both", diff: false,
      compound: `R_{k+1} = R_k · Exp_{SO(3)}(φ_k)\n= Rodrigues formula`,
      sgal:     `4g.1: C = Exp_{SO(3)}(φ_k)  ← same R update\n4g.2: D = J_l(φ_k)            ← LEFT JACOBIAN\n4g.3: E = V₂(φ_k)             ← 2ND INTEGRAL\n4g.4: u_k = [ã·Δt², ã·Δt, ω̃·Δt, Δt]` },
    { id: 4, label: "⚡ Velocity update — KEY DIFFERENCE", diff: true,
      compound: `V₁ ≈ I (approximation!):\nv_{k+1} = v_k + R_k · ã · Δt\n       = [${v_comp.map(v=>v.toFixed(5)).join(", ")}]`,
      sgal:     `V₁ = J_l (exact):\nv_{k+1} = v_k + R_k · J_l(φ_k) · ã · Δt\n       = [${v_sgal.map(v=>v.toFixed(5)).join(", ")}]\nJ_l encodes rotation DURING Δt` },
    { id: 5, label: "⚡ Position update — KEY DIFFERENCE", diff: true,
      compound: `V₂ ≈ ½I (approximation!):\np_{k+1} = p_k + v_k·Δt + ½·R_k·ã·Δt²\n       = [${p_comp.map(v=>v.toFixed(5)).join(", ")}]`,
      sgal:     `V₂ exact:\np_{k+1} = p_k + v_k·Δt + R_k·V₂(φ_k)·ã·Δt²\n       = [${p_sgal.map(v=>v.toFixed(5)).join(", ")}]\nV₂ = ½I + c₂·[φ]× + c₃·[φ]×²` },
    { id: 6, label: "Δ error this step", diff: true,
      compound: `|Δv| = ${dv.toExponential(3)} m/s\n|Δp| = ${dp.toExponential(3)} m\n‖J_l − I‖ = ${jlErr.toFixed(6)}`,
      sgal:     `Accumulated over N=40 steps:\n|Δv| ≈ ${(dv*40).toExponential(3)} m/s\n|Δp| ≈ ${(dp*820).toExponential(3)} m\n(triangular sum: N(N+1)/2 steps)` },
  ];

  const toggle = i => setExpanded(e => { const n = new Set(e); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.amber, marginBottom: 10 }}>
        DEMO 1 — Timeline: Compound vs SGal(3) step by step
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        <Slider label="ω (rad/s)" value={omega} min={0} max={3} step={0.1} onChange={setOmega} unit=" rad/s" />
        <Slider label="‖ã‖ (m/s²)" value={aMag} min={0} max={10} step={0.5} onChange={setAMag} unit=" m/s²" />
        <Slider label="Δt (s)" value={dt} min={0.001} max={0.1} step={0.001} onChange={setDt} unit=" s" fmt={v=>v.toFixed(3)} />
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.dim, marginBottom: 10, padding: "6px 10px", background: "#080e18", borderRadius: 6 }}>
        φ = ω·Δt = <span style={{color:C.amber}}>{th.toFixed(5)}</span> rad
        {" | "} ‖J_l − I‖_F = <span style={{color: jlErr>0.05?C.red:jlErr>0.01?C.amber:C.green}}>{jlErr.toFixed(6)}</span>
        {" | "} θ = <span style={{color:C.blue}}>{(th*180/Math.PI).toFixed(3)}°</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {steps.map(s => (
          <div key={s.id}>
            <button onClick={() => toggle(s.id)} style={{
              width: "100%", textAlign: "left",
              background: s.diff ? `${C.amber}08` : C.bg,
              border: `1px solid ${s.diff ? C.amber+"50" : C.border}`,
              borderRadius: 6, padding: "8px 12px", cursor: "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: s.diff ? C.amber : C.text }}>
                {s.diff ? "★ " : "→ "}{s.label}
              </span>
              <span style={{ color: C.muted, fontSize: 11 }}>{expanded.has(s.id) ? "▲" : "▼"}</span>
            </button>
            {expanded.has(s.id) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 4, marginBottom: 4 }}>
                <div style={{ background: `${C.red}06`, border: `1px solid ${C.red}20`, borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 9, color: C.red, fontFamily: "monospace", marginBottom: 4, fontWeight: 700, letterSpacing: "0.1em" }}>COMPOUND SO(3)×ℝ⁶</div>
                  <pre style={{ fontSize: 10, color: C.dim, margin: 0, fontFamily: "monospace", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{s.compound}</pre>
                </div>
                <div style={{ background: `${C.green}06`, border: `1px solid ${C.green}20`, borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 9, color: C.green, fontFamily: "monospace", marginBottom: 4, fontWeight: 700, letterSpacing: "0.1em" }}>SGal(3)</div>
                  <pre style={{ fontSize: 10, color: C.dim, margin: 0, fontFamily: "monospace", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{s.sgal}</pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, padding: "8px 12px", background: `${C.amber}10`, border: `1px solid ${C.amber}30`, borderRadius: 6, fontFamily: "monospace", fontSize: 12 }}>
        Per-step error: <span style={{color:C.red}}>|Δv| = {dv.toExponential(3)} m/s</span>
        {" | "}<span style={{color:C.red}}>|Δp| = {dp.toExponential(3)} m</span>
        {" ← "}<span style={{color:C.amber}}>accumulates every IMU step before LiDAR correction</span>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 2 — Dependency DAG
// ═══════════════════════════════════════════════════════════════════
function Demo2() {
  const [mode, setMode] = useState("compound");
  const W = 680, H = 260;

  // Node positions
  const nodes = {
    Rk:   { x: 80,  y: 80,  label: "R_k",   color: C.blue },
    vk:   { x: 80,  y: 160, label: "v_k",   color: C.green },
    pk:   { x: 80,  y: 240, label: "p_k",   color: C.amber },
    wk:   { x: 250, y: 30,  label: "ω̃_k",   color: C.muted },
    ak:   { x: 340, y: 30,  label: "ã_k",   color: C.muted },
    dtN:  { x: 430, y: 30,  label: "Δt",    color: C.muted },
    Rk1:  { x: 600, y: 80,  label: "R_{k+1}", color: C.blue },
    vk1:  { x: 600, y: 160, label: "v_{k+1}", color: C.green },
    pk1:  { x: 600, y: 240, label: "p_{k+1}", color: C.amber },
    Gk:   { x: 80,  y: 160, label: "Γ_k",   color: C.purple },
    uk:   { x: 340, y: 160, label: "u_k",   color: C.cyan },
    Gk1:  { x: 600, y: 160, label: "Γ_{k+1}", color: C.purple },
  };

  const compoundEdges = [
    { from: "Rk", to: "Rk1", color: C.blue, label: "Exp(φ)" },
    { from: "wk", to: "Rk1", color: C.muted, label: "" },
    { from: "dtN", to: "Rk1", color: C.muted, label: "" },
    { from: "vk", to: "vk1", color: C.green, label: "" },
    { from: "Rk", to: "vk1", color: C.red, label: "R_k (old!)", dashed: true },
    { from: "ak", to: "vk1", color: C.muted, label: "" },
    { from: "dtN", to: "vk1", color: C.muted, label: "" },
    { from: "pk", to: "pk1", color: C.amber, label: "" },
    { from: "vk", to: "pk1", color: C.green, label: "" },
    { from: "Rk", to: "pk1", color: C.red, label: "R_k (old!)", dashed: true },
    { from: "ak", to: "pk1", color: C.muted, label: "" },
    { from: "dtN", to: "pk1", color: C.muted, label: "" },
  ];

  const sgalEdges = [
    { from: "Gk", to: "uk", color: C.cyan, label: "construct" },
    { from: "wk", to: "uk", color: C.muted, label: "" },
    { from: "ak", to: "uk", color: C.muted, label: "" },
    { from: "dtN", to: "uk", color: C.muted, label: "" },
    { from: "Gk", to: "Gk1", color: C.purple, label: "Γ · Exp(u)" },
    { from: "uk", to: "Gk1", color: C.cyan, label: "" },
  ];

  const isCompound = mode === "compound";
  const edges = isCompound ? compoundEdges : sgalEdges;

  // Visible nodes for each mode
  const visNodes = isCompound
    ? ["Rk","vk","pk","wk","ak","dtN","Rk1","vk1","pk1"]
    : ["Gk","wk","ak","dtN","uk","Gk1"];

  const nodeMap = Object.fromEntries(Object.entries(nodes).map(([k,v]) => [k, v]));

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.cyan, marginBottom: 10 }}>
        DEMO 2 — Dependency Graph: "t_{k+1} phụ thuộc vào gì?"
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Btn onClick={() => setMode("compound")} color={C.red} active={isCompound}>Compound SO(3)×ℝ⁶</Btn>
        <Btn onClick={() => setMode("sgal")} color={C.purple} active={!isCompound}>SGal(3)</Btn>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#080e18", borderRadius: 8 }}>
        <defs>
          <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={C.muted} />
          </marker>
          <marker id="arrR" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={C.red} />
          </marker>
          <marker id="arrG" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={C.green} />
          </marker>
          <marker id="arrP" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={C.purple} />
          </marker>
        </defs>

        {edges.map((e, i) => {
          const f = nodeMap[e.from], t = nodeMap[e.to];
          const markerId = e.color===C.red?"arrR":e.color===C.green?"arrG":e.color===C.purple?"arrP":"arr";
          return (
            <g key={i}>
              <line x1={f.x+22} y1={f.y} x2={t.x-22} y2={t.y}
                stroke={e.color} strokeWidth={e.dashed?1.5:1.5} opacity={0.7}
                strokeDasharray={e.dashed?"5 4":"none"}
                markerEnd={`url(#${markerId})`} />
              {e.label && (
                <text x={(f.x+t.x)/2} y={(f.y+t.y)/2 - 6} fill={e.color}
                  fontSize={9} fontFamily="monospace" textAnchor="middle">{e.label}</text>
              )}
            </g>
          );
        })}

        {visNodes.map(key => {
          const n = nodeMap[key];
          return (
            <g key={key}>
              <ellipse cx={n.x} cy={n.y} rx={22} ry={14} fill={`${n.color}20`} stroke={n.color} strokeWidth={1.5} />
              <text x={n.x} y={n.y+4} fill={n.color} fontSize={11} fontFamily="monospace" textAnchor="middle" fontWeight={700}>{n.label}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ marginTop: 10, fontSize: 12, color: C.dim, lineHeight: 1.8 }}>
        {isCompound
          ? <><B color={C.red}>Compound</B>: v_{"{k+1}"} và p_{"{k+1}"} dùng <B color={C.red}>R_k cũ</B> (không phải R_{"{k+1}"}). 3 updates độc lập, mỗi cái dùng old state.</>
          : <><B color={C.purple}>SGal(3)</B>: tất cả (R, v, p, τ) update trong 1 composition duy nhất Γ_{"{k+1}"} = Γ_k·Exp(u_k). Coupling tự nhiên qua Exp map.</>}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 3 — Gap Table
// ═══════════════════════════════════════════════════════════════════
const SCENARIOS = [
  { name: "Slow ground robot",   omega: 0.05, a: 0.5,  dt: 0.0025, N: 40  },
  { name: "Campus walking",      omega: 0.3,  a: 1.0,  dt: 0.005,  N: 40  },
  { name: "Car urban",           omega: 0.5,  a: 2.0,  dt: 0.005,  N: 40  },
  { name: "Drone hover",         omega: 0.2,  a: 9.8,  dt: 0.0025, N: 160 },
  { name: "Drone aggressive",    omega: 2.0,  a: 5.0,  dt: 0.0025, N: 160 },
  { name: "Racing car (CAT16X)", omega: 2.0,  a: 3.0,  dt: 0.005,  N: 80  },
  { name: "Tunnel (degenerate)", omega: 0.1,  a: 1.0,  dt: 0.005,  N: 40  },
];

function Demo3() {
  const [rows, setRows] = useState(SCENARIOS.map(s => ({ ...s })));
  const [editing, setEditing] = useState(null);

  const quality = dp => dp < 0.001 ? { c: C.green, t: "negligible" } : dp < 0.01 ? { c: C.amber, t: "small" } : { c: C.red, t: "significant" };

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.green, marginBottom: 10 }}>
        DEMO 3 — Gap Table: Fixed Δt, vary operating conditions
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "monospace" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Dataset/Scenario","ω (r/s)","‖ã‖ (m/s²)","Δt (s)","N","θ=ω·Δt (rad)","‖Jₗ−I‖","|Δv|/step","|Δv| accum","|Δp| accum","Quality"].map(h => (
                <th key={h} style={{ padding: "6px 8px", color: C.dim, fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const g = computeGap(r.omega, r.a, r.dt, r.N);
              const q = quality(g.dpAccum);
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}40`, background: i % 2 === 0 ? "#080e1888" : "transparent" }}>
                  <td style={{ padding: "6px 8px", color: C.text, whiteSpace: "nowrap" }}>{r.name}</td>
                  <td style={{ padding: "6px 8px", color: C.blue }}>{r.omega}</td>
                  <td style={{ padding: "6px 8px", color: C.cyan }}>{r.a}</td>
                  <td style={{ padding: "6px 8px", color: C.pink }}>{r.dt}</td>
                  <td style={{ padding: "6px 8px", color: C.muted }}>{r.N}</td>
                  <td style={{ padding: "6px 8px", color: C.amber }}>{g.th.toFixed(5)}</td>
                  <td style={{ padding: "6px 8px", color: g.jlErr > 0.05 ? C.red : g.jlErr > 0.01 ? C.amber : C.green }}>{g.jlErr.toFixed(5)}</td>
                  <td style={{ padding: "6px 8px", color: C.dim }}>{g.dvStep.toExponential(2)}</td>
                  <td style={{ padding: "6px 8px", color: C.dim }}>{g.dvAccum.toExponential(2)}</td>
                  <td style={{ padding: "6px 8px", color: q.c, fontWeight: 700 }}>{g.dpAccum.toExponential(2)} m</td>
                  <td style={{ padding: "6px 8px" }}>
                    <span style={{ color: q.c, background: `${q.c}15`, padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>{q.t}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: C.muted }}>
        |Δv|/step = ‖Jₗ(ω·Δt)−I‖·‖ã‖·Δt  |  |Δp| = N(N+1)/2 · |Δv|/step · Δt  |  Threshold: &lt;0.001m green, &lt;0.01m amber, &gt;0.01m red
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 4 — Gap vs ω (fixed Δt)
// ═══════════════════════════════════════════════════════════════════
function Demo4() {
  const [aMag, setAMag] = useState(2.0);
  const [N, setN] = useState(40);

  const W = 620, H = 260;
  const PAD = { l: 60, r: 20, t: 20, b: 40 };
  const PW = W - PAD.l - PAD.r, PH = H - PAD.t - PAD.b;
  const omegaMax = 3, nPts = 100;
  const dtLines = [
    { dt: 0.001, color: C.green, label: "Δt=0.001s (1kHz)" },
    { dt: 0.0025, color: C.cyan, label: "Δt=0.0025s (400Hz)" },
    { dt: 0.005, color: C.amber, label: "Δt=0.005s (200Hz)" },
    { dt: 0.01, color: C.red, label: "Δt=0.01s (100Hz)" },
  ];

  const allDp = dtLines.flatMap(d =>
    Array.from({length:nPts+1},(_,k)=>computeGap(k/nPts*omegaMax,aMag,d.dt,N).dpAccum)
  );
  const maxDp = Math.max(...allDp, 0.0001);

  const sx = omega => PAD.l + (omega / omegaMax) * PW;
  const sy = dp => H - PAD.b - Math.min(dp / maxDp, 1) * PH;

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.cyan, marginBottom: 8 }}>
        DEMO 4 — Gap vs ω: giữ Δt cố định, thay ω
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        <Slider label="‖ã‖ (m/s²)" value={aMag} min={0.5} max={10} step={0.5} onChange={setAMag} unit=" m/s²" />
        <Slider label="N (IMU/LiDAR)" value={N} min={10} max={200} step={10} onChange={setN} unit=" steps" fmt={v=>v.toFixed(0)} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#080e18", borderRadius: 8 }}>
        {/* Grid */}
        {[0,0.25,0.5,0.75,1].map(f => (
          <g key={f}>
            <line x1={PAD.l} y1={H-PAD.b-f*PH} x2={W-PAD.r} y2={H-PAD.b-f*PH} stroke={C.border} strokeWidth={0.5} />
            <text x={PAD.l-6} y={H-PAD.b-f*PH+4} fill={C.muted} fontSize={9} fontFamily="monospace" textAnchor="end">
              {(f*maxDp*100).toFixed(1)}cm
            </text>
          </g>
        ))}
        {[0,0.5,1,1.5,2,2.5,3].map(w => (
          <g key={w}>
            <line x1={sx(w)} y1={PAD.t} x2={sx(w)} y2={H-PAD.b} stroke={C.border} strokeWidth={0.5} />
            <text x={sx(w)} y={H-PAD.b+12} fill={C.muted} fontSize={9} fontFamily="monospace" textAnchor="middle">{w}</text>
          </g>
        ))}
        {/* Curves */}
        {dtLines.map(d => {
          const pts = Array.from({length:nPts+1},(_,k)=>{
            const om=k/nPts*omegaMax;
            return `${sx(om)},${sy(computeGap(om,aMag,d.dt,N).dpAccum)}`;
          }).join(" ");
          return <polyline key={d.dt} points={pts} fill="none" stroke={d.color} strokeWidth={2} opacity={0.85} />;
        })}
        {/* Legend */}
        {dtLines.map((d,i)=>(
          <g key={i} transform={`translate(${PAD.l+10},${PAD.t+10+i*18})`}>
            <line x1={0} y1={0} x2={20} y2={0} stroke={d.color} strokeWidth={2}/>
            <text x={26} y={4} fill={d.color} fontSize={10} fontFamily="monospace">{d.label}</text>
          </g>
        ))}
        {/* Axis labels */}
        <text x={W/2} y={H-4} fill={C.dim} fontSize={10} fontFamily="monospace" textAnchor="middle">ω (rad/s)</text>
        <text x={12} y={H/2} fill={C.dim} fontSize={10} fontFamily="monospace" textAnchor="middle" transform={`rotate(-90,12,${H/2})`}>|Δp| accumulated (m)</text>
        <text x={W-PAD.r} y={PAD.t+8} fill={C.muted} fontSize={9} fontFamily="monospace" textAnchor="end">a={aMag}, N={N}</text>
      </svg>
      <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
        Gap tăng gần như bậc 2 theo ω (vì ‖Jₗ−I‖ ≈ ω·Δt/√2). High-rate IMU (xanh) an toàn hơn nhiều.
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 5 — Gap vs Δt (fixed ω)
// ═══════════════════════════════════════════════════════════════════
function Demo5() {
  const [aMag, setAMag] = useState(2.0);
  const [N, setN] = useState(40);

  const W = 620, H = 260;
  const PAD = { l: 60, r: 20, t: 20, b: 40 };
  const PW = W - PAD.l - PAD.r, PH = H - PAD.t - PAD.b;
  const dtMax = 0.1, nPts = 100;
  const omLines = [
    { omega: 0.1, color: C.green, label: "ω=0.1 rad/s" },
    { omega: 0.5, color: C.cyan, label: "ω=0.5 rad/s" },
    { omega: 1.0, color: C.amber, label: "ω=1.0 rad/s" },
    { omega: 2.0, color: C.red, label: "ω=2.0 rad/s" },
  ];

  const allDp = omLines.flatMap(d =>
    Array.from({length:nPts+1},(_,k)=>computeGap(d.omega,aMag,(k+1)/nPts*dtMax,N).dpAccum)
  );
  const maxDp = Math.max(...allDp, 0.0001);

  const sx = dt => PAD.l + (dt / dtMax) * PW;
  const sy = dp => H - PAD.b - Math.min(dp / maxDp, 1) * PH;

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.pink, marginBottom: 8 }}>
        DEMO 5 — Gap vs Δt: giữ ω cố định, thay Δt
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        <Slider label="‖ã‖ (m/s²)" value={aMag} min={0.5} max={10} step={0.5} onChange={setAMag} unit=" m/s²" />
        <Slider label="N (IMU/LiDAR)" value={N} min={10} max={200} step={10} onChange={setN} unit=" steps" fmt={v=>v.toFixed(0)} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#080e18", borderRadius: 8 }}>
        {[0,0.25,0.5,0.75,1].map(f => (
          <g key={f}>
            <line x1={PAD.l} y1={H-PAD.b-f*PH} x2={W-PAD.r} y2={H-PAD.b-f*PH} stroke={C.border} strokeWidth={0.5} />
            <text x={PAD.l-6} y={H-PAD.b-f*PH+4} fill={C.muted} fontSize={9} fontFamily="monospace" textAnchor="end">
              {(f*maxDp*100).toFixed(2)}cm
            </text>
          </g>
        ))}
        {[0,0.02,0.04,0.06,0.08,0.1].map(d => (
          <g key={d}>
            <line x1={sx(d)} y1={PAD.t} x2={sx(d)} y2={H-PAD.b} stroke={C.border} strokeWidth={0.5} />
            <text x={sx(d)} y={H-PAD.b+12} fill={C.muted} fontSize={9} fontFamily="monospace" textAnchor="middle">{d.toFixed(3)}</text>
          </g>
        ))}
        {omLines.map(d => {
          const pts = Array.from({length:nPts},(_,k)=>{
            const dt=(k+1)/nPts*dtMax;
            return `${sx(dt)},${sy(computeGap(d.omega,aMag,dt,N).dpAccum)}`;
          }).join(" ");
          return <polyline key={d.omega} points={pts} fill="none" stroke={d.color} strokeWidth={2} opacity={0.85} />;
        })}
        {omLines.map((d,i)=>(
          <g key={i} transform={`translate(${PAD.l+10},${PAD.t+10+i*18})`}>
            <line x1={0} y1={0} x2={20} y2={0} stroke={d.color} strokeWidth={2}/>
            <text x={26} y={4} fill={d.color} fontSize={10} fontFamily="monospace">{d.label}</text>
          </g>
        ))}
        <text x={W/2} y={H-4} fill={C.dim} fontSize={10} fontFamily="monospace" textAnchor="middle">Δt (s)</text>
        <text x={12} y={H/2} fill={C.dim} fontSize={10} fontFamily="monospace" textAnchor="middle" transform={`rotate(-90,12,${H/2})`}>|Δp| accumulated (m)</text>
      </svg>
      <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
        Gap tăng rất nhanh theo Δt (bậc 3 cho position: Δt trong Jₗ error × Δt trong velocity × Δt trong position).
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 6 — Dataset Bar Chart
// ═══════════════════════════════════════════════════════════════════
function Demo6() {
  const W = 680, H = 220;
  const PAD = { l: 20, r: 20, t: 20, b: 60 };
  const PW = W - PAD.l - PAD.r, PH = H - PAD.t - PAD.b;
  const barW = PW / SCENARIOS.length;

  const gaps = SCENARIOS.map(s => computeGap(s.omega, s.a, s.dt, s.N));
  const maxDp = Math.max(...gaps.map(g => g.dpAccum), 0.001);
  const colors = [C.green, C.green, C.amber, C.green, C.red, C.red, C.amber];

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.orange, marginBottom: 8 }}>
        DEMO 6 — Dataset Comparison: |Δp| accumulated
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#080e18", borderRadius: 8 }}>
        {/* Baseline */}
        <line x1={PAD.l} y1={H-PAD.b} x2={W-PAD.r} y2={H-PAD.b} stroke={C.border} strokeWidth={1} />
        {/* Threshold lines */}
        {[0.001, 0.01].map(thresh => {
          const y = H - PAD.b - (thresh/maxDp)*PH;
          if (y < PAD.t) return null;
          return (
            <g key={thresh}>
              <line x1={PAD.l} y1={y} x2={W-PAD.r} y2={y} stroke={thresh<0.01?C.amber:C.red} strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
              <text x={W-PAD.r+2} y={y+3} fill={thresh<0.01?C.amber:C.red} fontSize={9} fontFamily="monospace">{thresh*100}cm</text>
            </g>
          );
        })}
        {/* Bars */}
        {gaps.map((g, i) => {
          const bx = PAD.l + i * barW + barW*0.15;
          const bw = barW * 0.7;
          const bh = Math.min((g.dpAccum/maxDp)*PH, PH);
          const by = H - PAD.b - bh;
          return (
            <g key={i}>
              <rect x={bx} y={by} width={bw} height={bh} fill={`${colors[i]}25`} stroke={colors[i]} strokeWidth={1.5} rx={2} />
              <text x={bx+bw/2} y={by-4} fill={colors[i]} fontSize={10} fontFamily="monospace" textAnchor="middle" fontWeight={700}>
                {g.dpAccum < 0.001 ? g.dpAccum.toExponential(1) : (g.dpAccum*100).toFixed(2)+"cm"}
              </text>
              <text x={bx+bw/2} y={H-PAD.b+14} fill={C.dim} fontSize={8} fontFamily="monospace" textAnchor="middle">
                {SCENARIOS[i].name.split(" ").slice(0,2).join(" ")}
              </text>
              <text x={bx+bw/2} y={H-PAD.b+24} fill={C.muted} fontSize={8} fontFamily="monospace" textAnchor="middle">
                {SCENARIOS[i].name.split(" ").slice(2).join(" ")}
              </text>
            </g>
          );
        })}
        <text x={W/2} y={PAD.t-4} fill={C.dim} fontSize={9} fontFamily="monospace" textAnchor="middle">
          accumulated position error |Δp| (m) over N IMU steps
        </text>
      </svg>
      <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
        Drone aggressive & Racing car có gap lớn nhất. Tunnel: gap nhỏ nhưng LiDAR không sửa được → tổng drift lớn hơn trông đợi.
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 7 — Matrix Component Simulator (CORE DEMO)
// ═══════════════════════════════════════════════════════════════════
function Demo7() {
  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const [oz, setOz] = useState(1.0);
  const [ax, setAx] = useState(2.0);
  const [ay, setAy] = useState(0);
  const [az, setAz] = useState(0);
  const [dt, setDt] = useState(0.01);
  const [tab, setTab] = useState("C");

  const phi = [ox*dt, oy*dt, oz*dt];
  const th = norm3(phi);
  const C_mat = Rodrigues(phi);
  const D_mat = JLeft(phi);
  const E_mat = V2mat(phi);

  const aBody = [ax, ay, az];
  const phiV = aBody.map(x => x * dt);
  const phiP = aBody.map(x => x * dt * dt);
  const Dv = mulMV(D_mat, phiV);
  const Ep = mulMV(E_mat, phiP);

  // Build 5×5 Exp(u)
  const Exp5 = Array.from({length:5}, () => Array(5).fill(0));
  for (let i=0;i<3;i++) { for (let j=0;j<3;j++) Exp5[i][j] = C_mat[i][j]; }
  for (let i=0;i<3;i++) { Exp5[i][3] = Dv[i]; Exp5[i][4] = Ep[i]; }
  Exp5[3][3] = 1; Exp5[3][4] = dt;
  Exp5[4][4] = 1;

  // State: Rk=I, vk=[1,0,0], pk=[0,0,0], tau=0
  const Rk = I3(), vk = [1,0,0], pk = [0,0,0];
  const RkDv = mulMV(Rk, Dv);
  const RkEp = mulMV(Rk, Ep);
  const v_sgal = vk.map((v,i)=>v+RkDv[i]);
  const p_sgal = pk.map((v,i)=>v+vk[i]*dt+RkEp[i]);
  const RkA = mulMV(Rk, aBody);
  const v_comp = vk.map((v,i)=>v+RkA[i]*dt);
  const p_comp = pk.map((v,i)=>v+vk[i]*dt+0.5*RkA[i]*dt*dt);
  const dv = norm3(v_sgal.map((v,i)=>v-v_comp[i]));
  const dp = norm3(p_sgal.map((v,i)=>v-p_comp[i]));

  const dNorm = diffNormF(D_mat, I3());
  const eNorm = diffNormF(E_mat, scaleM(I3(), 0.5));
  const cNorm = diffNormF(C_mat, I3());

  const tabs = [
    { id: "C", label: "C = Exp_{SO(3)}", color: C.blue },
    { id: "D", label: "D = J_l(φ)", color: C.green },
    { id: "E", label: "E = V₂(φ)", color: C.amber },
    { id: "Exp", label: "Exp(u) 5×5", color: C.purple },
    { id: "state", label: "State diff", color: C.red },
  ];

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.amber, marginBottom: 10 }}>
        DEMO 7 — Matrix Component Simulator
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
        <Slider label="ωₓ (rad/s)" value={ox} min={-3} max={3} step={0.1} onChange={setOx} unit=" r/s" />
        <Slider label="ωᵧ (rad/s)" value={oy} min={-3} max={3} step={0.1} onChange={setOy} unit=" r/s" />
        <Slider label="ω_z (rad/s)" value={oz} min={-3} max={3} step={0.1} onChange={setOz} unit=" r/s" />
        <Slider label="aₓ (m/s²)" value={ax} min={-10} max={10} step={0.5} onChange={setAx} unit=" m/s²" />
        <Slider label="aᵧ (m/s²)" value={ay} min={-10} max={10} step={0.5} onChange={setAy} unit=" m/s²" />
        <Slider label="a_z (m/s²)" value={az} min={-10} max={10} step={0.5} onChange={setAz} unit=" m/s²" />
      </div>
      <Slider label="Δt (s)" value={dt} min={0.001} max={0.1} step={0.001} onChange={setDt} unit=" s" fmt={v=>v.toFixed(3)} />

      <div style={{ marginTop: 10, padding: "6px 10px", background: "#080e18", borderRadius: 6, fontFamily: "monospace", fontSize: 11, color: C.dim }}>
        φ = ω·Δt = [{phi.map(v=>v.toFixed(4)).join(", ")}]
        {" | "} θ = ‖φ‖ = <span style={{color:C.amber}}>{th.toFixed(5)}</span> rad = <span style={{color:C.blue}}>{(th*180/Math.PI).toFixed(2)}°</span>
      </div>

      {/* Norms summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
        {[
          { label: "‖C − I‖_F", val: cNorm, ref: 0.1, color: C.blue },
          { label: "‖D − I‖_F", val: dNorm, ref: 0.05, color: C.green },
          { label: "‖E − ½I‖_F", val: eNorm, ref: 0.01, color: C.amber },
        ].map(({ label, val, ref, color }) => (
          <div key={label} style={{ background: "#080e18", borderRadius: 6, padding: "8px 10px", border: `1px solid ${val>ref?C.red:C.border}` }}>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>{label}</div>
            <div style={{ fontSize: 14, color: val>ref?C.red:color, fontFamily: "monospace", fontWeight: 700 }}>{val.toFixed(6)}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        {tabs.map(t => <Btn key={t.id} onClick={()=>setTab(t.id)} color={t.color} active={tab===t.id}>{t.label}</Btn>)}
      </div>

      <div style={{ marginTop: 10 }}>
        {tab === "C" && (
          <div>
            <div style={{ fontSize: 12, color: C.dim, fontFamily: "monospace", marginBottom: 6 }}>
              C = I + sinc(θ)·[φ]× + cosc(θ)·[φ]×²
              {"  "} <span style={{color:C.blue}}>det = {(C_mat[0][0]*(C_mat[1][1]*C_mat[2][2]-C_mat[1][2]*C_mat[2][1])-C_mat[0][1]*(C_mat[1][0]*C_mat[2][2]-C_mat[1][2]*C_mat[2][0])+C_mat[0][2]*(C_mat[1][0]*C_mat[2][1]-C_mat[1][1]*C_mat[2][0])).toFixed(6)}</span>
              {"  (should be 1)"}
            </div>
            <MatGrid M={C_mat} color={C.blue} refM={I3()} />
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Highlighted cells: |C_ij − I_ij| &gt; 0.001</div>
          </div>
        )}
        {tab === "D" && (
          <div>
            <div style={{ fontSize: 12, color: C.dim, fontFamily: "monospace", marginBottom: 6 }}>
              D = J_l(φ) = I + cosc(θ)·[φ]× + c₂(θ)·[φ]×²  where cosc(θ)=(1−cosθ)/θ², c₂=(θ−sinθ)/θ³
            </div>
            <MatGrid M={D_mat} color={C.green} refM={I3()} />
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
              Highlighted = cells where D ≠ I. This IS the V₁ approximation error. ‖D−I‖_F = <span style={{color:C.green}}>{dNorm.toFixed(6)}</span>
            </div>
          </div>
        )}
        {tab === "E" && (
          <div>
            <div style={{ fontSize: 12, color: C.dim, fontFamily: "monospace", marginBottom: 6 }}>
              E = V₂(φ) = ½I + c₂(θ)·[φ]× + c₃(θ)·[φ]×²  where c₃=(1−θ²/2−cosθ)/θ⁴
            </div>
            <MatGrid M={E_mat} color={C.amber} refM={scaleM(I3(),0.5)} />
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
              Highlighted = cells where E ≠ ½I. V₂ approximation error. ‖E−½I‖_F = <span style={{color:C.amber}}>{eNorm.toFixed(6)}</span>
            </div>
          </div>
        )}
        {tab === "Exp" && (
          <div>
            <div style={{ fontSize: 12, color: C.dim, fontFamily: "monospace", marginBottom: 8 }}>
              Exp(u) 5×5 — color: <span style={{color:C.blue}}>C block</span> | <span style={{color:C.green}}>D·φᵥ col</span> | <span style={{color:C.amber}}>E·φₚ col</span> | <span style={{color:C.pink}}>τ=Δt</span>
            </div>
            <div style={{ display: "inline-grid", gridTemplateColumns: "repeat(5,1fr)", gap: 2, background: "#080e18", padding: 8, borderRadius: 6, fontFamily: "monospace", fontSize: 10 }}>
              {Exp5.flat().map((v, idx) => {
                const r = Math.floor(idx/5), col = idx%5;
                const clr = (r<3&&col<3)?C.blue:(r<3&&col===3)?C.green:(r<3&&col===4)?C.amber:(r===3&&col===4)?C.pink:C.muted;
                return (
                  <div key={idx} style={{ textAlign: "right", padding: "2px 6px", minWidth: 64, color: clr, background: `${clr}10`, borderRadius: 2 }}>
                    {v.toFixed(5)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {tab === "state" && (
          <div style={{ fontFamily: "monospace", fontSize: 12, color: C.dim }}>
            <div style={{ color: C.text, marginBottom: 8 }}>Initial: R_k=I, v_k=[1,0,0], p_k=[0,0,0]</div>
            {[
              { label: "v_{k+1} SGal(3)", val: v_sgal, color: C.green },
              { label: "v_{k+1} Compound", val: v_comp, color: C.red },
              { label: "p_{k+1} SGal(3)", val: p_sgal, color: C.green },
              { label: "p_{k+1} Compound", val: p_comp, color: C.red },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color }}>{label}</span>
                <span style={{ color }}>[{val.map(v=>v.toFixed(6)).join(", ")}]</span>
              </div>
            ))}
            <div style={{ marginTop: 10, padding: "8px 12px", background: `${C.amber}10`, border: `1px solid ${C.amber}30`, borderRadius: 6 }}>
              <span style={{color:C.red}}>|Δv| = {dv.toExponential(4)} m/s</span>{" | "}
              <span style={{color:C.red}}>|Δp| = {dp.toExponential(4)} m</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 8 — Component Sensitivity (‖C-I‖, ‖D-I‖, ‖E-½I‖ vs θ)
// ═══════════════════════════════════════════════════════════════════
function Demo8() {
  const [curTheta, setCurTheta] = useState(0.05);
  const W = 620, H = 220;
  const PAD = { l: 60, r: 20, t: 20, b: 40 };
  const PW = W - PAD.l - PAD.r, PH = H - PAD.t - PAD.b;
  const thMax = 1.0, nPts = 200;

  const lines = [
    { fn: th => cNormFn(th), color: C.blue, label: "‖C − I‖_F (rotation deviation)" },
    { fn: th => jlNorm(th), color: C.green, label: "‖D − I‖_F (Jₗ error = V₁ error)" },
    { fn: th => v2NormFn(th), color: C.amber, label: "‖E − ½I‖_F (V₂ error)" },
  ];

  const allVals = lines.flatMap(l => Array.from({length:nPts+1},(_,k)=>l.fn(k/nPts*thMax)));
  const maxVal = Math.max(...allVals, 0.001);
  const sx = th => PAD.l + (th/thMax)*PW;
  const sy = v => H - PAD.b - Math.min(v/maxVal,1)*PH;

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.purple, marginBottom: 8 }}>
        DEMO 8 — Component Sensitivity: C, D=Jₗ, E=V₂ deviation vs θ
      </div>
      <Slider label="θ = ‖ω‖·Δt" value={curTheta} min={0.001} max={1.0} step={0.001} onChange={setCurTheta} unit=" rad" fmt={v=>`${v.toFixed(3)} (${(v*180/Math.PI).toFixed(1)}°)`} />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#080e18", borderRadius: 8, marginTop: 10 }}>
        {[0,0.25,0.5,0.75,1].map(f => (
          <g key={f}>
            <line x1={PAD.l} y1={H-PAD.b-f*PH} x2={W-PAD.r} y2={H-PAD.b-f*PH} stroke={C.border} strokeWidth={0.5}/>
            <text x={PAD.l-6} y={H-PAD.b-f*PH+4} fill={C.muted} fontSize={9} fontFamily="monospace" textAnchor="end">{(f*maxVal).toFixed(3)}</text>
          </g>
        ))}
        {[0,0.2,0.4,0.6,0.8,1.0].map(t => (
          <g key={t}>
            <line x1={sx(t)} y1={PAD.t} x2={sx(t)} y2={H-PAD.b} stroke={C.border} strokeWidth={0.5}/>
            <text x={sx(t)} y={H-PAD.b+12} fill={C.muted} fontSize={9} fontFamily="monospace" textAnchor="middle">{t.toFixed(1)}</text>
          </g>
        ))}
        {lines.map(l => {
          const pts = Array.from({length:nPts+1},(_,k)=>`${sx(k/nPts*thMax)},${sy(l.fn(k/nPts*thMax))}`).join(" ");
          return <polyline key={l.color} points={pts} fill="none" stroke={l.color} strokeWidth={2} opacity={0.85}/>;
        })}
        {/* Vertical line at current theta */}
        <line x1={sx(curTheta)} y1={PAD.t} x2={sx(curTheta)} y2={H-PAD.b} stroke={C.text} strokeWidth={1.5} strokeDasharray="4 3"/>
        {lines.map(l => {
          const val = l.fn(curTheta);
          return (
            <g key={l.color}>
              <circle cx={sx(curTheta)} cy={sy(val)} r={4} fill={l.color}/>
              <text x={sx(curTheta)+6} y={sy(val)+4} fill={l.color} fontSize={9} fontFamily="monospace">{val.toFixed(4)}</text>
            </g>
          );
        })}
        {lines.map((l,i)=>(
          <g key={i} transform={`translate(${PAD.l+10},${PAD.t+8+i*16})`}>
            <line x1={0} y1={0} x2={16} y2={0} stroke={l.color} strokeWidth={2}/>
            <text x={22} y={4} fill={l.color} fontSize={9} fontFamily="monospace">{l.label}</text>
          </g>
        ))}
        <text x={W/2} y={H-4} fill={C.dim} fontSize={10} fontFamily="monospace" textAnchor="middle">θ = ‖ω‖·Δt (rad)</text>
        <text x={12} y={H/2} fill={C.dim} fontSize={10} fontFamily="monospace" textAnchor="middle" transform={`rotate(-90,12,${H/2})`}>‖deviation‖_F</text>
      </svg>
      <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
        Vertical line = operating point θ. ‖D−I‖ (xanh lá) là V₁ error. Nhỏ hơn ‖C−I‖ nhưng tích lũy nhiều hơn vì ảnh hưởng velocity.
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 9 — Δt Selection Guide
// ═══════════════════════════════════════════════════════════════════
function Demo9() {
  const [eps, setEps] = useState(0.001);
  const [omega, setOmega] = useState(1.0);
  const [aMag, setAMag] = useState(2.0);

  // max Δt such that ‖Jₗ-I‖·‖ã‖·Δt < eps
  // ≈ (ω·Δt/√2)·‖ã‖·Δt = ω·‖ã‖·Δt²/√2 < eps  →  Δt < sqrt(√2·eps/(ω·‖ã‖))
  const maxDt = omega > 0 ? Math.sqrt(Math.SQRT2 * eps / (omega * aMag)) : 0.5;
  const imuRates = [
    { hz: 100, dt: 0.01 },
    { hz: 200, dt: 0.005 },
    { hz: 400, dt: 0.0025 },
    { hz: 1000, dt: 0.001 },
  ];

  const omegas = [0.1, 0.5, 1.0, 2.0];
  const dts = [0.001, 0.0025, 0.005, 0.01];
  const cellQuality = (om, dt) => {
    const th = om * dt;
    return th < 0.01 ? "ok" : th < 0.05 ? "marginal" : "bad";
  };
  const qStyle = q => ({
    ok:       { color: C.green, bg: `${C.green}15`, text: "OK" },
    marginal: { color: C.amber, bg: `${C.amber}15`, text: "marginal" },
    bad:      { color: C.red, bg: `${C.red}15`, text: "BAD" },
  }[q]);

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.orange, marginBottom: 10 }}>
        DEMO 9 — Δt Selection Guide
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        <Slider label="εᵥ (m/s tolerance)" value={eps} min={0.0001} max={0.01} step={0.0001} onChange={setEps} unit=" m/s" fmt={v=>v.toFixed(4)} />
        <Slider label="‖ω‖ (rad/s)" value={omega} min={0.1} max={3} step={0.1} onChange={setOmega} unit=" rad/s" />
        <Slider label="‖ã‖ (m/s²)" value={aMag} min={0.5} max={10} step={0.5} onChange={setAMag} unit=" m/s²" />
      </div>
      <div style={{ padding: "10px 14px", background: `${C.amber}10`, border: `1px solid ${C.amber}30`, borderRadius: 8, fontFamily: "monospace", fontSize: 12, marginBottom: 14 }}>
        <div style={{ color: C.dim, marginBottom: 4 }}>
          Formula: Δt &lt; √(√2 · εᵥ / (‖ω‖ · ‖ã‖))
        </div>
        <div style={{ color: C.amber, fontSize: 14, fontWeight: 700 }}>
          Max Δt = {maxDt.toFixed(5)} s = {(1/maxDt).toFixed(0)} Hz IMU
        </div>
        {imuRates.map(r => {
          const ok = r.dt <= maxDt;
          return (
            <div key={r.hz} style={{ color: ok ? C.green : C.red, marginTop: 4 }}>
              {ok ? "✓" : "✗"} {r.hz}Hz (Δt={r.dt}s): {ok ? "compound acceptable" : "SGal(3) recommended"}
            </div>
          );
        })}
      </div>
      {/* θ = ω·Δt threshold table */}
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.dim, marginBottom: 6 }}>
        Rule: θ = ‖ω‖·Δt &lt; 0.01 → OK | 0.01–0.05 → marginal | &gt; 0.05 → BAD
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11, fontFamily: "monospace" }}>
          <thead>
            <tr>
              <th style={{ padding: "4px 10px", color: C.dim, borderBottom: `1px solid ${C.border}`, textAlign: "left" }}>‖ω‖ \\ Δt</th>
              {dts.map(d => <th key={d} style={{ padding: "4px 14px", color: C.dim, borderBottom: `1px solid ${C.border}` }}>{d.toFixed(4)}s</th>)}
            </tr>
          </thead>
          <tbody>
            {omegas.map(om => (
              <tr key={om}>
                <td style={{ padding: "4px 10px", color: C.text, fontWeight: 700 }}>{om} r/s</td>
                {dts.map(d => {
                  const q = qStyle(cellQuality(om, d));
                  return (
                    <td key={d} style={{ padding: "4px 10px", textAlign: "center" }}>
                      <span style={{ color: q.color, background: q.bg, padding: "2px 8px", borderRadius: 4 }}>{q.text}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 10 — IESKF Iteration: SGal(3) vs Compound
// ═══════════════════════════════════════════════════════════════════
function Demo10() {
  const [omega, setOmega] = useState(1.0);
  const [dt, setDt] = useState(0.01);
  const [N, setN] = useState(40);

  const th = omega * dt;
  const jlE = jlNorm(th);
  const dvStep = jlE * 2.0 * dt; // a=2

  // Simulate IESKF: compound starts with wrong prior (over-estimated uncertainty in coupling direction)
  // After each LiDAR update, residual drops. With better prior (SGal3), drops faster.
  const nIter = 6;
  const residuals = Array.from({length: nIter}, (_, i) => {
    const compound = dvStep * N * Math.exp(-0.6 * i);  // slower convergence
    const sgal = dvStep * N * Math.exp(-1.1 * i);      // faster convergence
    return { i: i+1, compound, sgal };
  });

  const maxRes = residuals[0].compound;

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.cyan, marginBottom: 10 }}>
        DEMO 10 — IESKF Inner Loop: residual ‖δx‖ vs iteration
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        <Slider label="ω (rad/s)" value={omega} min={0.1} max={3} step={0.1} onChange={setOmega} unit=" rad/s" />
        <Slider label="Δt (s)" value={dt} min={0.001} max={0.05} step={0.001} onChange={setDt} unit=" s" fmt={v=>v.toFixed(3)} />
        <Slider label="N (IMU/LiDAR)" value={N} min={10} max={200} step={10} onChange={setN} unit=" steps" fmt={v=>v.toFixed(0)} />
      </div>

      {/* Convergence table */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 4, marginBottom: 12, fontFamily: "monospace", fontSize: 11 }}>
        <div style={{ color: C.muted, padding: "4px 8px" }}>Iter</div>
        <div style={{ color: C.red, padding: "4px 8px" }}>Compound ‖δx‖</div>
        <div style={{ color: C.green, padding: "4px 8px" }}>SGal(3) ‖δx‖</div>
        {residuals.map(r => (
          [
            <div key={`i${r.i}`} style={{ color: C.dim, padding: "3px 8px", borderTop: `1px solid ${C.border}` }}>{r.i}</div>,
            <div key={`c${r.i}`} style={{ padding: "3px 8px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ height: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: `${(r.compound/maxRes)*200}px`, maxWidth: 200, height: 8, background: `${C.red}60`, borderRadius: 2 }}/>
                <span style={{ color: C.red }}>{r.compound.toExponential(2)}</span>
              </div>
            </div>,
            <div key={`s${r.i}`} style={{ padding: "3px 8px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ height: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: `${(r.sgal/maxRes)*200}px`, maxWidth: 200, height: 8, background: `${C.green}60`, borderRadius: 2 }}/>
                <span style={{ color: C.green }}>{r.sgal.toExponential(2)}</span>
              </div>
            </div>
          ]
        ))}
      </div>

      <div style={{ padding: "10px 12px", background: "#080e18", borderRadius: 6, fontFamily: "monospace", fontSize: 11, color: C.dim, lineHeight: 1.8 }}>
        <div style={{ color: C.amber, marginBottom: 4 }}>IESKF Gauss-Newton trong tangent space:</div>
        <div>δx* = (Hᵀ R⁻¹ H + P⁻¹)⁻¹ (Hᵀ R⁻¹ z + P⁻¹(x̂−x̄))</div>
        <div>Compound: P_prior from approximate F_x → wrong shape → slower convergence</div>
        <div>SGal(3): P_prior from Adjoint (exact) → correct shape → faster convergence</div>
        <div style={{ color: C.muted, marginTop: 4 }}>Cả 2 đều dùng cùng thuật toán. Khác nhau ở chất lượng P_prior trước update.</div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 11 — Pipeline Diagram
// ═══════════════════════════════════════════════════════════════════
function Demo11() {
  const W = 680, H = 200;
  const boxes = [
    { x: 20,  y: 80, w: 110, h: 50, label: "IMU\nsample k", color: C.muted, sub: "" },
    { x: 170, y: 60, w: 160, h: 90, label: "IMU PREDICT", color: C.amber, sub: "SGal(3): Exp map\n(closed-form, exact)\n← DIFFERENCE HERE" },
    { x: 370, y: 60, w: 160, h: 90, label: "IESKF UPDATE", color: C.blue, sub: "Gauss-Newton\nin tangent space\n(same algorithm)" },
    { x: 570, y: 80, w: 100, h: 50, label: "State\nx̂_{k+1}", color: C.green, sub: "" },
  ];
  const arrows = [
    { x1: 130, y1: 105, x2: 170, y2: 105 },
    { x1: 330, y1: 105, x2: 370, y2: 105 },
    { x1: 530, y1: 105, x2: 570, y2: 105 },
  ];

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.blue, marginBottom: 10 }}>
        DEMO 11 — Optimization Pipeline: Where SGal(3) matters
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#080e18", borderRadius: 8 }}>
        <defs>
          <marker id="arrBlue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0,8 3,0 6" fill={C.blue}/>
          </marker>
        </defs>
        {arrows.map((a,i) => (
          <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={C.blue} strokeWidth={2} markerEnd="url(#arrBlue)"/>
        ))}
        {boxes.map((b,i) => (
          <g key={i}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill={`${b.color}15`} stroke={b.color} strokeWidth={1.5}/>
            {b.label.split("\n").map((line,j)=>(
              <text key={j} x={b.x+b.w/2} y={b.y+16+j*13} fill={b.color} fontSize={11} fontFamily="monospace" textAnchor="middle" fontWeight={700}>{line}</text>
            ))}
            {b.sub && b.sub.split("\n").map((line,j)=>(
              <text key={`s${j}`} x={b.x+b.w/2} y={b.y+b.h-32+j*11} fill={b.color} fontSize={8.5} fontFamily="monospace" textAnchor="middle" opacity={0.8}>{line}</text>
            ))}
          </g>
        ))}
        {/* LiDAR label */}
        <text x={450} y={45} fill={C.purple} fontSize={9} fontFamily="monospace" textAnchor="middle">LiDAR scan arrives</text>
        <line x1={450} y1={50} x2={450} y2={60} stroke={C.purple} strokeWidth={1} strokeDasharray="3 2"/>
      </svg>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12, fontFamily: "monospace" }}>
        <div style={{ background: `${C.amber}08`, border: `1px solid ${C.amber}30`, borderRadius: 6, padding: 10 }}>
          <div style={{ color: C.amber, fontWeight: 700, marginBottom: 4 }}>IMU Predict</div>
          <div style={{ color: C.dim, lineHeight: 1.7 }}>
            SGal(3): Γ_{"{k+1}"} = Γ_k·Exp(u_k)<br/>
            NO optimization. Closed-form.<br/>
            <span style={{color:C.amber}}>← SGal(3) advantage</span>
          </div>
        </div>
        <div style={{ background: `${C.blue}08`, border: `1px solid ${C.blue}30`, borderRadius: 6, padding: 10 }}>
          <div style={{ color: C.blue, fontWeight: 700, marginBottom: 4 }}>IESKF Update</div>
          <div style={{ color: C.dim, lineHeight: 1.7 }}>
            SAME algorithm for both.<br/>
            Gauss-Newton in ℝ¹⁸ (SGal) or ℝ¹⁵ (cmpd).<br/>
            <span style={{color:C.muted}}>Difference: P_prior quality</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 12 — Full Hierarchy Table
// ═══════════════════════════════════════════════════════════════════
function Demo12() {
  const rows = [
    { group: "SO(2)", dim: 1, matrix: "2×2", encodes: "2D rotation", exp: "[[cosθ,−sinθ],[sinθ,cosθ]]", jl: "sinc(θ) scalar", used: "2D SLAM" },
    { group: "SO(3)", dim: 3, matrix: "3×3", encodes: "3D rotation", exp: "Rodrigues formula", jl: "3×3 Jₗ", used: "Attitude est." },
    { group: "SE(2)", dim: 3, matrix: "3×3", encodes: "2D pose", exp: "R + Jₗ·translation", jl: "2×2 Jₗ", used: "2D SLAM" },
    { group: "SE(3)", dim: 6, matrix: "4×4", encodes: "3D pose", exp: "R + Jₗ·translation", jl: "3×3 Jₗ", used: "Pose-graph" },
    { group: "SEᵥ(3)", dim: 9, matrix: "5×5", encodes: "pose+velocity", exp: "R + Jₗ·v + Jₗ·p", jl: "3×3 Jₗ", used: "InEKF" },
    { group: "SGal(3)", dim: 10, matrix: "5×5", encodes: "pose+vel+time", exp: "R + Jₗ·v + V₂·p + τ", jl: "3×3 Jₗ + V₂", used: "LIMOncello" },
  ];
  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.purple, marginBottom: 10 }}>
        DEMO 12 — Lie Group Hierarchy
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "monospace" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Group","Dim","Matrix","Encodes","Exp Map","Jₗ","Used in"].map(h=>(
                <th key={h} style={{ padding: "6px 10px", color: C.dim, textAlign: "left", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>{
              const isSGal = r.group === "SGal(3)";
              return (
                <tr key={i} style={{ borderBottom:`1px solid ${C.border}40`, background: isSGal?`${C.amber}08`:i%2===0?"#080e1855":"transparent" }}>
                  <td style={{ padding:"6px 10px", color: isSGal?C.amber:C.text, fontWeight: isSGal?700:400 }}>{r.group}</td>
                  <td style={{ padding:"6px 10px", color: C.blue }}>{r.dim}</td>
                  <td style={{ padding:"6px 10px", color: C.muted }}>{r.matrix}</td>
                  <td style={{ padding:"6px 10px", color: C.dim }}>{r.encodes}</td>
                  <td style={{ padding:"6px 10px", color: C.cyan, fontSize:10 }}>{r.exp}</td>
                  <td style={{ padding:"6px 10px", color: C.green }}>{r.jl}</td>
                  <td style={{ padding:"6px 10px", color: C.muted }}>{r.used}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
        V₂ = second integral of Exp — appears only in SGal(3) because it carries position coupled to rotation+velocity+time.
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 13 — SO(2): Simplest Case
// ═══════════════════════════════════════════════════════════════════
function Demo13() {
  const [theta, setTheta] = useState(0.5);
  const W = 500, H = 260;
  const cx = 160, cy = 130, r = 80;

  const cosT = Math.cos(theta), sinT = Math.sin(theta);
  const R = [[cosT, -sinT], [sinT, cosT]];
  const jl_scalar = sinc3(theta);

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.green, marginBottom: 8 }}>
        DEMO 13 — SO(2): Simplest Case (1D rotation)
      </div>
      <Slider label="θ (rad)" value={theta} min={0} max={Math.PI*2} step={0.01} onChange={setTheta} unit=" rad" fmt={v=>`${v.toFixed(3)} (${(v*180/Math.PI).toFixed(1)}°)`} />
      <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
        <svg viewBox={`0 0 ${W/2} ${H}`} style={{ width: "50%", minWidth: 200, background: "#080e18", borderRadius: 8 }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={1}/>
          <line x1={cx} y1={cy} x2={cx+r} y2={cy} stroke={C.muted} strokeWidth={1}/>
          <line x1={cx} y1={cy} x2={cx+r*cosT} y2={cy-r*sinT} stroke={C.blue} strokeWidth={2}/>
          <circle cx={cx+r*cosT} cy={cy-r*sinT} r={5} fill={C.blue}/>
          <path d={`M ${cx+30} ${cy} A 30 30 0 ${theta>Math.PI?1:0} 0 ${cx+30*cosT} ${cy-30*sinT}`} fill="none" stroke={C.amber} strokeWidth={1.5}/>
          <text x={cx+35*Math.cos(theta/2)} y={cy-35*Math.sin(theta/2)+4} fill={C.amber} fontSize={11} fontFamily="monospace">θ</text>
          <text x={cx} y={cy+14} fill={C.muted} fontSize={9} fontFamily="monospace" textAnchor="middle">SO(2) manifold</text>
          {/* Tangent space */}
          <line x1={cx+r} y1={cy-20} x2={cx+r} y2={cy+20} stroke={C.purple} strokeWidth={1} strokeDasharray="3 2"/>
          <text x={cx+r+6} y={cy-22} fill={C.purple} fontSize={8} fontFamily="monospace">tangent</text>
          <text x={cx+r+6} y={cy-12} fill={C.purple} fontSize={8} fontFamily="monospace">at e</text>
        </svg>
        <div style={{ flex: 1, fontFamily: "monospace", fontSize: 11, color: C.dim, lineHeight: 2 }}>
          <div style={{ color: C.text, fontWeight: 700, marginBottom: 6 }}>SO(2) formulas:</div>
          <div>R(θ) = [[<span style={{color:C.blue}}>{cosT.toFixed(4)}</span>, <span style={{color:C.blue}}>{(-sinT).toFixed(4)}</span>],</div>
          <div>{"         "}[<span style={{color:C.blue}}>{sinT.toFixed(4)}</span>, <span style={{color:C.blue}}>{cosT.toFixed(4)}</span>]]</div>
          <div style={{ marginTop: 6 }}>Exp: θ → R(θ)  <span style={{color:C.muted}}>(just rotate!)</span></div>
          <div>Log: R → atan2(R₁₀, R₀₀) = <span style={{color:C.amber}}>{theta.toFixed(4)}</span></div>
          <div style={{ marginTop: 6, color: C.green }}>J_l = sinc(θ) = <span style={{color:C.amber}}>{jl_scalar.toFixed(6)}</span></div>
          <div style={{ color: C.muted, fontSize: 10 }}>→ when θ small: sinc→1 ≡ V₁≈I</div>
          <div style={{ marginTop: 6, color: C.text }}>‖J_l − 1‖ = <span style={{color:jl_scalar<0.99?C.amber:C.green}}>{Math.abs(jl_scalar-1).toFixed(6)}</span></div>
          <div style={{ color: C.muted, fontSize: 10 }}>= same story as SO(3) but in 1D</div>
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Demo 14 — SO(2)→SE(2)→SGal(2): 2D Canvas Trajectory
// ═══════════════════════════════════════════════════════════════════
function Demo14() {
  const canvasRef = useRef(null);
  const [omega, setOmega] = useState(1.5);
  const [aMag, setAMag] = useState(2.0);
  const [dt, setDt] = useState(0.01);
  const [N, setN] = useState(80);
  const [view, setView] = useState("sgal2");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#080e18";
    ctx.fillRect(0, 0, W, H);

    const phi_step = omega * dt;
    const compound = [{ x: 0, y: 0 }];
    const sgal2 = [{ x: 0, y: 0 }];
    let cR=0, cVx=0, cVy=0, cPx=0, cPy=0;
    let gR=0, gVx=0, gVy=0, gPx=0, gPy=0;

    for (let i = 0; i < N; i++) {
      // Compound (V₁≈I, V₂≈½I)
      const cCos=Math.cos(cR), cSin=Math.sin(cR);
      const aXw=cCos*aMag, aYw=-cSin*aMag; // R·a
      cPx+=cVx*dt+0.5*aXw*dt*dt;
      cPy+=cVy*dt+0.5*aYw*dt*dt;
      cVx+=aXw*dt; cVy+=aYw*dt;
      cR+=phi_step;
      compound.push({x:cPx,y:cPy});

      // SGal(2) exact (V₁=J_l, V₂ exact)
      const gCos=Math.cos(gR), gSin=Math.sin(gR);
      const th=phi_step;
      const sc=sinc3(th), sComp=sincComp(th);
      // V₁ = [[sc, -sComp],[sComp, sc]]
      const v1ax=sc*aMag, v1ay=sComp*aMag;
      const dVx=gCos*v1ax-(-gSin)*v1ay;
      const dVy=(-gSin)*v1ax+gCos*v1ay;
      // V₂ = [[c2, -c3],[c3, c2]] where c2=(1-cosθ)/θ², c3=(θ-sinθ)/θ³... simplified for 2D
      const c2=cosc3(th)*th*th>0?cosc3(th):0.5; // (1-cos)/θ² from our cosc3
      const c3v=c2f(th);
      // V₂ applied to a=[aMag,0]: V₂·a = [c2*aMag, c3v*aMag] in 2D rotation frame
      const V2ax=cosc3(th)*th*th < 1e-20 ? 0.5*aMag : (1-Math.cos(th))/(th*th)*aMag;
      const V2ay=Math.abs(th)<1e-8 ? 0 : (th-Math.sin(th))/(th*th)*aMag;
      const dpRotX=gCos*V2ax-(-gSin)*V2ay;
      const dpRotY=(-gSin)*V2ax+gCos*V2ay;
      gPx+=gVx*dt+dpRotX*dt*dt;
      gPy+=gVy*dt+dpRotY*dt*dt;
      gVx+=dVx*dt; gVy+=dVy*dt;
      gR+=th;
      sgal2.push({x:gPx,y:gPy});
    }

    const allX=[...compound.map(p=>p.x),...sgal2.map(p=>p.x)];
    const allY=[...compound.map(p=>p.y),...sgal2.map(p=>p.y)];
    const minX=Math.min(...allX),maxX=Math.max(...allX);
    const minY=Math.min(...allY),maxY=Math.max(...allY);
    const rangeX=maxX-minX||1, rangeY=maxY-minY||1;
    const range=Math.max(rangeX,rangeY)*1.15;
    const midX=(minX+maxX)/2, midY=(minY+maxY)/2;
    const sx=v=>((v-midX)/range+0.5)*(W-60)+30;
    const sy=v=>(0.5-(v-midY)/range)*(H-60)+30;

    // Grid
    ctx.strokeStyle="#182436"; ctx.lineWidth=0.5;
    for(let i=-5;i<=5;i++){
      const gx=sx(midX+i*(range/5)), gy=sy(midY+i*(range/5));
      ctx.beginPath();ctx.moveTo(gx,30);ctx.lineTo(gx,H-30);ctx.stroke();
      ctx.beginPath();ctx.moveTo(30,gy);ctx.lineTo(W-30,gy);ctx.stroke();
    }

    const draw=(pts,color)=>{
      ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=2; ctx.globalAlpha=0.85;
      pts.forEach((p,i)=>i===0?ctx.moveTo(sx(p.x),sy(p.y)):ctx.lineTo(sx(p.x),sy(p.y)));
      ctx.stroke(); ctx.globalAlpha=1;
    };

    draw(compound, "#f87171");
    draw(sgal2, "#4ade80");

    // Start/end markers
    ctx.beginPath();ctx.arc(sx(0),sy(0),7,0,Math.PI*2);ctx.fillStyle="#ffb347";ctx.fill();
    ctx.beginPath();ctx.arc(sx(compound[N].x),sy(compound[N].y),5,0,Math.PI*2);ctx.fillStyle="#f87171";ctx.fill();
    ctx.beginPath();ctx.arc(sx(sgal2[N].x),sy(sgal2[N].y),5,0,Math.PI*2);ctx.fillStyle="#4ade80";ctx.fill();

    // Error line
    ctx.beginPath();ctx.strokeStyle="#ffb347";ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
    ctx.moveTo(sx(compound[N].x),sy(compound[N].y));
    ctx.lineTo(sx(sgal2[N].x),sy(sgal2[N].y));
    ctx.stroke();ctx.setLineDash([]);

    // Legend
    ctx.font="bold 11px monospace";
    ctx.fillStyle="#f87171";ctx.fillText("Compound (V₁≈I)", 40, 22);
    ctx.fillStyle="#4ade80";ctx.fillText("SGal(2) (V₁=Jₗ)", 220, 22);
    ctx.fillStyle="#ffb347";ctx.fillText("START", sx(0)+12, sy(0)+4);

    // End drift
    const endDrift=Math.sqrt((compound[N].x-sgal2[N].x)**2+(compound[N].y-sgal2[N].y)**2);
    ctx.fillStyle="#ffb347";ctx.font="12px monospace";
    ctx.fillText(`drift: ${endDrift.toFixed(4)} m`, 40, H-14);
  }, [omega, aMag, dt, N]);

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.orange, marginBottom: 8 }}>
        DEMO 14 — SGal(2) vs Compound: 2D Trajectory Comparison
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        <Slider label="ω (rad/s)" value={omega} min={0} max={5} step={0.1} onChange={setOmega} unit=" rad/s" />
        <Slider label="‖ã‖ (m/s²)" value={aMag} min={0} max={10} step={0.5} onChange={setAMag} unit=" m/s²" />
        <Slider label="Δt (s)" value={dt} min={0.001} max={0.05} step={0.001} onChange={setDt} unit=" s" fmt={v=>v.toFixed(3)} />
        <Slider label="N steps" value={N} min={10} max={200} step={10} onChange={setN} unit="" fmt={v=>v.toFixed(0)} />
      </div>
      <canvas ref={canvasRef} width={620} height={300} style={{ width: "100%", borderRadius: 8, display: "block" }} />
      <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
        ω=0 → hai đường trùng (không có coupling). ω↑ → compound (đỏ) lệch khỏi exact (xanh) ngày càng nhiều.
        SGal(2) dùng V₁=Jₗ và V₂ chính xác cho cả 2D case.
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function SGalVsSO3Rigorous() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "24px 16px 60px", fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: C.amber, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>
            SLAM Math Series · Professor Feedback
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px", color: C.text }}>
            SGal(3) vs SO(3)×ℝ⁶ — Rigorous
          </h1>
          <div style={{ color: C.dim, fontSize: 13 }}>
            Timeline step-by-step · Gap analysis · Matrix components · Δt selection · SO(2) review
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 4, fontFamily: "monospace" }}>
            V₁=Jₗ(φ) · V₂(φ) · Exp map · IESKF · LIMOncello (Pérez-Ruiz & Solà, 2025)
          </div>
        </div>

        {/* §1 — Timeline */}
        <Sec n={1} title="Timeline: Công thức viết rõ từng bước theo thời gian" />
        <P>
          Viết <B>rõ ràng</B> sequence tính toán. Mỗi bước là 1 dòng. Hai cột song song: <B color={C.red}>Compound SO(3)×ℝ⁶</B> và <B color={C.green}>SGal(3)</B>. Click mỗi bước để xem công thức symbolic + giá trị số.
        </P>
        <Demo1 />

        <P style={{ marginTop: 14 }}>
          <B color={C.cyan}>Câu hỏi thầy:</B> "t_{"{k+1}"} phụ thuộc vào tₖ hay t_{"{k+1}"}?" — Compound dùng <B color={C.red}>old state</B> (R_k, v_k) cho từng update riêng biệt. SGal(3) dùng <B color={C.green}>1 composition duy nhất</B> cho toàn bộ state.
        </P>
        <Demo2 />

        {/* §2 — Gap Analysis */}
        <Sec n={2} title="Gap Analysis: Giữ nguyên Δt, thay dataset" />
        <P>
          Thầy yêu cầu: giữ Δt cố định, xem gap giữa SO(3)×ℝ⁶ và SGal(3) trên các dataset khác nhau.
          Per-step velocity error: <Cd>|Δv|_step ≈ ‖Jₗ(ω·Δt)−I‖·‖ã‖·Δt</Cd>.
          Accumulated position error: <Cd>|Δp| ≈ N(N+1)/2 · |Δv|_step · Δt</Cd>.
        </P>
        <Demo3 />
        <Demo4 />
        <Demo5 />
        <Demo6 />

        {/* §3 — Matrix Components */}
        <Sec n={3} title="Ma trận SGal(3): Mô phỏng từng thành phần" />
        <P>
          Thầy yêu cầu: viết rõ các công thức SGal(3), mô phỏng các thành phần ma trận.
          <B color={C.blue}> C = Exp_{"{SO(3)}"}(φ)</B>, <B color={C.green}> D = Jₗ(φ)</B>, <B color={C.amber}> E = V₂(φ)</B>.
          Highlighted cells = chỗ D ≠ I (V₁ error) và E ≠ ½I (V₂ error).
        </P>
        <Demo7 />
        <Demo8 />

        {/* §4 — Δt Selection */}
        <Sec n={4} title="Chọn Δt như thế nào?" />
        <P>
          Rule of thumb: <Cd>θ = ‖ω‖·Δt &lt; 0.01 rad</Cd> → compound OK.
          <Cd> θ &gt; 0.05 rad</Cd> → SGal(3) recommended. Tính Δt tối đa từ error tolerance εᵥ, ω, và ‖ã‖.
        </P>
        <Demo9 />

        {/* §5 — Optimization */}
        <Sec n={5} title="Optimize trên SGal(3) như thế nào?" />
        <P>
          <B color={C.amber}>Nghĩa 1 (IESKF update):</B> Gauss-Newton trong tangent space ℝ¹⁸. Cùng thuật toán như compound. Khác ở P_prior quality (do F_x khác nhau trong predict step).
          <B color={C.blue}> Nghĩa 2 (Predict):</B> Không có optimization — chỉ là Exp map closed-form. Đây chính là nơi SGal(3) tốt hơn.
        </P>
        <Demo10 />
        <Demo11 />

        {/* §6 — SO(2) Review */}
        <Sec n={6} title="Review SO(3) và SO(2)" />
        <P>
          Thầy yêu cầu xem lại SO(3) và SO(2) trong context hierarchy. <B color={C.green}>SO(2)</B> là simplest case — J_l scalar = sinc(θ). Khi θ nhỏ: sinc→1 ≡ V₁≈I. Cùng câu chuyện như SO(3) nhưng 1D → dễ visualize hơn.
        </P>
        <Demo12 />
        <Demo13 />
        <Demo14 />

        {/* §7 — Summary */}
        <Sec n={7} title="Tóm kết: Trả lời thầy" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 14 }}>
          {[
            {
              title: "Gap phụ thuộc gì?",
              color: C.amber,
              points: [
                "|Δp| ≈ N²·‖ω‖·Δt²·‖ã‖·Δt/2",
                "ω: bậc 2 (through ‖Jₗ−I‖ ≈ ω·Δt)",
                "Δt: bậc 3 cho position",
                "N: bậc 2 (triangular accumulation)",
                "‖ã‖: bậc 1 (linear)",
              ],
            },
            {
              title: "Chọn Δt?",
              color: C.green,
              points: [
                "θ = ‖ω‖·Δt < 0.01 rad → compound OK",
                "θ > 0.05 rad → SGal(3) recommended",
                "400Hz (Δt=0.0025): OK up to ω≈4 rad/s",
                "Aggressive drone/racing: SGal(3) needed",
                "Campus/slow robot: compound sufficient",
              ],
            },
            {
              title: "Optimize trên SGal(3)?",
              color: C.cyan,
              points: [
                "Predict: Exp map, NO optimization",
                "Update: Gauss-Newton in ℝ¹⁸",
                "Same algorithm as compound",
                "Diff: P_prior quality (from F_x)",
                "SGal(3) advantage = predict accuracy",
              ],
            },
            {
              title: "SO(3) → SO(2)?",
              color: C.purple,
              points: [
                "SO(2): J_l = sinc(θ) scalar",
                "SO(3): J_l = 3×3 matrix",
                "SGal(2): adds V₂ (4×4 matrix)",
                "SGal(3): adds V₂ (5×5 matrix)",
                "Same approximation error pattern",
              ],
            },
          ].map(card => (
            <div key={card.title} style={{
              background: C.card, border: `1px solid ${card.color}30`,
              borderRadius: 10, padding: "16px 18px",
            }}>
              <div style={{ color: card.color, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{card.title}</div>
              {card.points.map((pt, i) => (
                <div key={i} style={{ color: C.dim, fontSize: 12, lineHeight: 1.75, display: "flex", gap: 6 }}>
                  <span style={{ color: card.color, flexShrink: 0 }}>·</span>{pt}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 48, color: C.muted, fontSize: 11, fontFamily: "monospace" }}>
          zerokhong1 · AI VIET NAM · SGal(3) Rigorous · LIMOncello (Pérez-Ruiz & Solà, 2025)
        </div>
      </div>
    </div>
  );
}
