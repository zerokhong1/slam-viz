import { useState, useRef, useEffect, useCallback } from "react";

const C = {
  bg: "#06090f", card: "#0d1420", border: "#182436",
  blue: "#4a9eff", amber: "#ffb347", green: "#4ade80",
  red: "#f87171", purple: "#c084fc", cyan: "#22d3ee",
  pink: "#f472b6", text: "#dfe6ee", dim: "#8899ad", muted: "#4a5a6e",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function matMul2(A, B) {
  return [
    [A[0][0]*B[0][0]+A[0][1]*B[1][0], A[0][0]*B[0][1]+A[0][1]*B[1][1]],
    [A[1][0]*B[0][0]+A[1][1]*B[1][0], A[1][0]*B[0][1]+A[1][1]*B[1][1]],
  ];
}
function matTranspose2(A) { return [[A[0][0],A[1][0]],[A[0][1],A[1][1]]]; }
function eigenDecomp2(P) {
  const trace = P[0][0]+P[1][1];
  const det = P[0][0]*P[1][1]-P[0][1]*P[1][0];
  const disc = Math.sqrt(Math.max(0, trace*trace/4-det));
  const l1 = trace/2+disc, l2 = trace/2-disc;
  const angle = (P[0][1]===0 && P[0][0]>=P[1][1]) ? 0 : Math.atan2(l1-P[0][0], P[0][1]);
  return { angle, lambda1: Math.max(0,l1), lambda2: Math.max(0,l2) };
}
function addMat2(A, B) {
  return [[A[0][0]+B[0][0],A[0][1]+B[0][1]],[A[1][0]+B[1][0],A[1][1]+B[1][1]]];
}
function propagateP(P, Fx, Q) {
  const FxP = matMul2(Fx, P);
  const FxPFxt = matMul2(FxP, matTranspose2(Fx));
  return addMat2(FxPFxt, Q);
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Section({ n, title }) {
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
function P({ children }) { return <p style={{ color: C.dim, lineHeight: 1.85, fontSize: 13.5, margin: "8px 0" }}>{children}</p>; }
function B({ color = C.amber, children }) { return <strong style={{ color }}>{children}</strong>; }
function Card({ children, style = {} }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginTop: 14, ...style }}>{children}</div>;
}
function Btn({ onClick, children, color = C.amber, active = false }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `${color}25` : "transparent",
      border: `1px solid ${active ? color : C.border}`, borderRadius: 6,
      color: active ? color : C.dim, padding: "6px 14px", fontSize: 12,
      cursor: "pointer", fontFamily: "monospace", fontWeight: 700,
      transition: "all 0.15s",
    }}>{children}</button>
  );
}
function Slider({ label, value, min, max, step = 0.01, onChange, unit = "" }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.dim }}>
      <span style={{ width: 120, fontFamily: "monospace" }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: C.amber }} />
      <span style={{ width: 60, color: C.amber, fontFamily: "monospace", textAlign: "right" }}>
        {value.toFixed(step < 0.1 ? 3 : 2)}{unit}
      </span>
    </label>
  );
}

// ── Ellipse on canvas ─────────────────────────────────────────────────────────

function drawEllipse(ctx, cx, cy, P, scale, color, alpha = 1, nSigma = 2) {
  const { angle, lambda1, lambda2 } = eigenDecomp2(P);
  const rx = nSigma * Math.sqrt(lambda1) * scale;
  const ry = nSigma * Math.sqrt(lambda2) * scale;
  if (!isFinite(rx) || !isFinite(ry) || rx < 0.5 || ry < 0.5) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI);
  ctx.strokeStyle = color + Math.round(alpha * 255).toString(16).padStart(2, "0");
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = color + Math.round(alpha * 0.12 * 255).toString(16).padStart(2, "0");
  ctx.fill();
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════════════════════
// Demo 1 — 1D Error Propagation
// ══════════════════════════════════════════════════════════════════════════════

function Demo1() {
  const canvasRef = useRef(null);
  const [dt, setDt] = useState(0.5);
  const [velErr, setVelErr] = useState(0.3);
  const [history, setHistory] = useState([{
    pos: 0, vel: 0,
    P: [[0.25, 0], [0, 0.04]],
  }]);
  const [animating, setAnimating] = useState(false);

  const W = 500, H = 300;
  const OX = 100, OY = 200;
  const scaleX = 60, scaleY = 80;

  const Fx = [[1, dt], [0, 1]];
  const Q = [[0.001, 0], [0, 0.005]];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    // background
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // axes
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, OY); ctx.lineTo(W - 20, OY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(OX, 10); ctx.lineTo(OX, H - 10); ctx.stroke();

    // axis labels
    ctx.fillStyle = C.dim; ctx.font = "11px monospace";
    ctx.fillText("position (m)", W - 100, OY - 8);
    ctx.save(); ctx.translate(14, 100); ctx.rotate(-Math.PI / 2);
    ctx.fillText("velocity (m/s)", 0, 0); ctx.restore();

    // grid
    ctx.strokeStyle = C.border + "60"; ctx.lineWidth = 0.5;
    for (let i = -3; i <= 6; i++) {
      const x = OX + i * scaleX;
      ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, H - 10); ctx.stroke();
      if (i !== 0) { ctx.fillStyle = C.muted; ctx.font = "9px monospace"; ctx.fillText(i, x - 3, OY + 12); }
    }
    for (let j = -2; j <= 2; j++) {
      const y = OY - j * scaleY;
      ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(W - 20, y); ctx.stroke();
      if (j !== 0) { ctx.fillStyle = C.muted; ctx.font = "9px monospace"; ctx.fillText(j.toFixed(1), OX - 28, y + 4); }
    }

    // Draw all historical ellipses (fading)
    history.forEach((s, i) => {
      const alpha = 0.2 + 0.8 * (i / history.length);
      const color = i === history.length - 1 ? C.amber : C.blue;
      const cx = OX + s.pos * scaleX;
      const cy = OY - s.vel * scaleY;
      const Pscaled = [
        [s.P[0][0] * scaleX * scaleX, s.P[0][1] * scaleX * scaleY],
        [s.P[1][0] * scaleX * scaleY, s.P[1][1] * scaleY * scaleY],
      ];
      drawEllipse(ctx, cx, cy, Pscaled, 1, color, alpha);
      // dot
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = color + (i === history.length - 1 ? "ff" : "80");
      ctx.fill();
    });

    // Δt arrow annotation on latest ellipse
    if (history.length >= 2) {
      const last = history[history.length - 1];
      const prev = history[history.length - 2];
      const x1 = OX + prev.pos * scaleX, y1 = OY - prev.vel * scaleY;
      const x2 = OX + last.pos * scaleX, y2 = OY - last.vel * scaleY;
      ctx.save();
      ctx.strokeStyle = C.green + "aa"; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // F_x matrix overlay
    const mx = W - 130, my = 20;
    ctx.fillStyle = C.card; ctx.fillRect(mx - 4, my - 4, 128, 58);
    ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.strokeRect(mx - 4, my - 4, 128, 58);
    ctx.fillStyle = C.amber; ctx.font = "bold 10px monospace";
    ctx.fillText("F_x =", mx, my + 10);
    ctx.fillStyle = C.text; ctx.font = "10px monospace";
    ctx.fillText(`[1    ${dt.toFixed(2)}]`, mx + 40, my + 10);
    ctx.fillText(`[0    1   ]`, mx + 40, my + 26);
    ctx.fillStyle = C.cyan + "cc"; ctx.font = "9px monospace";
    ctx.fillText(`Δt = ${dt.toFixed(2)}`, mx + 40, my + 44);
  }, [history, dt]);

  function predict() {
    setAnimating(true);
    const cur = history[history.length - 1];
    const newPos = cur.pos + (cur.vel + velErr) * dt;
    const newVel = cur.vel + velErr;
    const newP = propagateP(cur.P, Fx, Q);
    setTimeout(() => {
      setHistory(h => [...h.slice(-6), { pos: newPos, vel: newVel, P: newP }]);
      setAnimating(false);
    }, 200);
  }

  function reset() {
    setHistory([{ pos: 0, vel: 0, P: [[0.25, 0], [0, 0.04]] }]);
  }

  const cur = history[history.length - 1];
  const Ppp = cur.P[0][0], Ppv = cur.P[0][1], Pvv = cur.P[1][1];
  const newP = propagateP(cur.P, Fx, Q);

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.amber, marginBottom: 8 }}>
        DEMO 1 — 1D Error Propagation
      </div>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ width: "100%", maxWidth: W, borderRadius: 6, display: "block" }} />

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <Slider label="Δt (s)" value={dt} min={0.1} max={1.0} step={0.05} onChange={setDt} unit="s" />
        <Slider label="velocity error" value={velErr} min={-1} max={1} step={0.05} onChange={setVelErr} unit="m/s" />
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <Btn onClick={predict} color={C.amber} active>{animating ? "..." : "▶ Predict"}</Btn>
        <Btn onClick={reset} color={C.red}>Reset</Btn>
      </div>

      <div style={{ marginTop: 14, background: "#0a0e18", borderRadius: 6, padding: 14, fontFamily: "monospace", fontSize: 11 }}>
        <div style={{ color: C.amber, marginBottom: 6 }}>{"P_{k+1} = F_x · P_k · F_xᵀ + Q"}</div>
        <div style={{ color: C.dim, lineHeight: 1.9 }}>
          <span style={{ color: C.text }}>P_k</span> = [
          <span style={{ color: C.green }}>{Ppp.toFixed(4)}</span>,{" "}
          <span style={{ color: C.cyan }}>{Ppv.toFixed(4)}</span>;{" "}
          <span style={{ color: C.cyan }}>{Ppv.toFixed(4)}</span>,{" "}
          <span style={{ color: C.green }}>{Pvv.toFixed(4)}</span>]
          <br />
          <span style={{ color: C.text }}>F_x</span> = [[1, {dt.toFixed(2)}], [0, 1]]
          <br />
          <span style={{ color: C.text }}>{"P_{k+1}"}</span> = [
          <span style={{ color: C.amber }}>{newP[0][0].toFixed(4)}</span>,{" "}
          <span style={{ color: C.purple }}>{newP[0][1].toFixed(4)}</span>;{" "}
          <span style={{ color: C.purple }}>{newP[1][0].toFixed(4)}</span>,{" "}
          <span style={{ color: C.amber }}>{newP[1][1].toFixed(4)}</span>]
        </div>
        <div style={{ marginTop: 6, color: C.muted, fontSize: 10 }}>
          Ellipse shear: velocity error propagates to position via Δt coupling.
          σ_pos grows: {(Math.sqrt(newP[0][0]) - Math.sqrt(Ppp)).toFixed(4)} m/step
        </div>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Demo 4 — Covariance Ellipse Propagation (2D unicycle)
// ══════════════════════════════════════════════════════════════════════════════

function unicycleFx(theta, v, dt) {
  return [
    [1, 0, -v * Math.sin(theta) * dt, Math.cos(theta) * dt],
    [0, 1,  v * Math.cos(theta) * dt, Math.sin(theta) * dt],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

function matMulN(A, B, n) {
  const C2 = Array.from({length: n}, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++)
        C2[i][j] += A[i][k] * B[k][j];
  return C2;
}
function matTransposeN(A, n) {
  const T = Array.from({length: n}, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) T[j][i] = A[i][j];
  return T;
}
function matAddN(A, B, n) {
  return A.map((row, i) => row.map((v, j) => v + B[i][j]));
}
function propagatePN(P, Fx, Q, n) {
  const FxP = matMulN(Fx, P, n);
  const FxPFxt = matMulN(FxP, matTransposeN(Fx, n), n);
  return matAddN(FxPFxt, Q, n);
}

function Demo4() {
  const canvasRef = useRef(null);
  const [theta, setTheta] = useState(0.5);
  const [v, setV] = useState(1.0);
  const [dt, setDt] = useState(0.1);
  const [sigX, setSigX] = useState(0.3);
  const [sigY, setSigY] = useState(0.3);
  const [sigT, setSigT] = useState(0.2);

  const initState = () => ({
    px: 0, py: 0, th: theta, v,
    P4: [
      [sigX*sigX, 0, 0, 0],
      [0, sigY*sigY, 0, 0],
      [0, 0, sigT*sigT, 0],
      [0, 0, 0, 0.01],
    ],
  });

  const [history, setHistory] = useState([initState()]);

  const W = 500, H = 300;
  const OX = 250, OY = 150, scale = 80;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = C.border + "50"; ctx.lineWidth = 0.5;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(OX + i * scale, 0); ctx.lineTo(OX + i * scale, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, OY + i * scale); ctx.lineTo(W, OY + i * scale); ctx.stroke();
    }
    ctx.strokeStyle = C.border; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(OX, 0); ctx.lineTo(OX, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, OY); ctx.lineTo(W, OY); ctx.stroke();
    ctx.fillStyle = C.dim; ctx.font = "10px monospace";
    ctx.fillText("px (m)", W - 55, OY - 6);
    ctx.fillText("py", OX + 4, 14);

    history.forEach((s, i) => {
      const frac = (i + 1) / history.length;
      const alpha = 0.15 + 0.85 * frac;
      const color = i === history.length - 1 ? C.amber : C.blue;
      const cx = OX + s.px * scale, cy = OY - s.py * scale;

      // project 4×4 P to 2×2 (px,py subspace)
      const P2 = [[s.P4[0][0], s.P4[0][1]], [s.P4[1][0], s.P4[1][1]]];
      const Pscaled = [
        [P2[0][0]*scale*scale, P2[0][1]*scale*scale],
        [P2[1][0]*scale*scale, P2[1][1]*scale*scale],
      ];
      drawEllipse(ctx, cx, cy, Pscaled, 1, color, alpha);

      // heading arrow
      ctx.save();
      ctx.strokeStyle = color + Math.round(alpha * 200).toString(16).padStart(2, "0");
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(s.th) * 18 * frac, cy - Math.sin(s.th) * 18 * frac);
      ctx.stroke();
      ctx.restore();

      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
      ctx.fillStyle = color + (i === history.length - 1 ? "ff" : "80"); ctx.fill();
    });

    // label
    ctx.fillStyle = C.amber + "cc"; ctx.font = "bold 10px monospace";
    ctx.fillText(`steps: ${history.length - 1}`, 10, 20);
  }, [history]);

  function predict() {
    setHistory(prev => {
      const cur = prev[prev.length - 1];
      const Fx = unicycleFx(cur.th, cur.v, dt);
      const Q4 = [[0.001,0,0,0],[0,0.001,0,0],[0,0,0.001,0],[0,0,0,0.0005]];
      const newP = propagatePN(cur.P4, Fx, Q4, 4);
      const newPx = cur.px + cur.v * Math.cos(cur.th) * dt;
      const newPy = cur.py + cur.v * Math.sin(cur.th) * dt;
      const newTh = cur.th + 0.15 * dt;
      return [...prev.slice(-12), { px: newPx, py: newPy, th: newTh, v: cur.v, P4: newP }];
    });
  }

  function reset() { setHistory([initState()]); }

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.green, marginBottom: 8 }}>
        DEMO 4 — Covariance Ellipse Propagation (Unicycle)
      </div>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ width: "100%", maxWidth: W, borderRadius: 6, display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <Slider label="θ (rad)" value={theta} min={0} max={6.28} step={0.05} onChange={v2 => { setTheta(v2); setHistory([initState()]); }} />
        <Slider label="v (m/s)" value={v} min={0} max={5} step={0.1} onChange={v2 => { setV(v2); setHistory([initState()]); }} />
        <Slider label="Δt (s)" value={dt} min={0.05} max={0.5} step={0.01} onChange={setDt} />
        <Slider label="σ_x" value={sigX} min={0.05} max={1} step={0.05} onChange={v2 => { setSigX(v2); setHistory([initState()]); }} />
        <Slider label="σ_y" value={sigY} min={0.05} max={1} step={0.05} onChange={v2 => { setSigY(v2); setHistory([initState()]); }} />
        <Slider label="σ_θ" value={sigT} min={0.05} max={1} step={0.05} onChange={v2 => { setSigT(v2); setHistory([initState()]); }} />
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <Btn onClick={predict} color={C.green} active>▶ Predict</Btn>
        <Btn onClick={() => { for(let i=0;i<10;i++) setTimeout(predict, i*80); }} color={C.blue}>▶▶ 10 steps</Btn>
        <Btn onClick={reset} color={C.red}>Reset</Btn>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: C.dim, fontFamily: "monospace" }}>
        Ellipse xoay và kéo giãn do coupling: θ → (px, py) qua cột 3 của F_x = [-v·sinθ·Δt, v·cosθ·Δt, 1, 0]ᵀ
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Demo 5 — Matrix structure: Compound 15×15 vs SGal(3) 10×10
// ══════════════════════════════════════════════════════════════════════════════

function buildCompoundFx(R, v, p, aSk, phi, dt) {
  const n = 15;
  const M = Array.from({length:n}, (_,i) => Array.from({length:n}, (_,j) => i===j ? 1 : 0));

  const cphi = Math.cos(phi[2]), sphi = Math.sin(phi[2]);
  const ExpPhi = [[cphi,-sphi,0],[sphi,cphi,0],[0,0,1]];

  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    M[i][j] = ExpPhi[i][j];
    M[i][j+9] = i===j ? -dt : 0;
    M[i+3][j+12] = -(i===j ? dt : 0);
  }

  const a = [2, 0, 0];
  // -R[ã]× Δt for rows 3-5, cols 0-2
  const askDt = [[0,-a[2]*dt,a[1]*dt],[a[2]*dt,0,-a[0]*dt],[-a[1]*dt,a[0]*dt,0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    M[i+3][j] = -askDt[i][j];
    M[i+6][j+3] = i===j ? dt : 0;
  }
  return M;
}

function buildSGalFx(R3, v3, p3, tau) {
  const n = 10;
  const M = Array.from({length:n}, (_,i) => Array.from({length:n}, (_,j) => 0));
  const Rt = [[R3[0][0],R3[1][0],R3[2][0]],[R3[0][1],R3[1][1],R3[2][1]],[R3[0][2],R3[1][2],R3[2][2]]];

  // Rᵀ block (0,0)
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) M[i][j]=Rt[i][j];
  // -Rᵀ[p]× block (3,0)
  const pSk = [[0,-p3[2],p3[1]],[p3[2],0,-p3[0]],[-p3[1],p3[0],0]];
  const RtPsk = matMulN(Rt,pSk,3);
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) M[i+3][j]=-RtPsk[i][j];
  // Rᵀ block (3,3)
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) M[i+3][j+3]=Rt[i][j];
  // -Rᵀ[v]× block (6,0)
  const vSk = [[0,-v3[2],v3[1]],[v3[2],0,-v3[0]],[-v3[1],v3[0],0]];
  const RtVsk = matMulN(Rt,vSk,3);
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) M[i+6][j]=-RtVsk[i][j];
  // Rᵀ block (6,6)
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) M[i+6][j+6]=Rt[i][j];
  // τ row (9,0-2): -Rᵀ(v×p) approx
  const vxp = [v3[1]*p3[2]-v3[2]*p3[1], v3[2]*p3[0]-v3[0]*p3[2], v3[0]*p3[1]-v3[1]*p3[0]];
  const RtVxP = [
    Rt[0][0]*vxp[0]+Rt[0][1]*vxp[1]+Rt[0][2]*vxp[2],
    Rt[1][0]*vxp[0]+Rt[1][1]*vxp[1]+Rt[1][2]*vxp[2],
    Rt[2][0]*vxp[0]+Rt[2][1]*vxp[1]+Rt[2][2]*vxp[2],
  ];
  for (let j=0;j<3;j++) M[9][j]=-RtVxP[j];
  // -Rᵀpᵀ row (9,3-5)
  for (let j=0;j<3;j++) M[9][j+3]=-(Rt[0][j]*p3[0]+Rt[1][j]*p3[1]+Rt[2][j]*p3[2]);
  // Rᵀvᵀ row (9,6-8)
  for (let j=0;j<3;j++) M[9][j+6]= (Rt[0][j]*v3[0]+Rt[1][j]*v3[1]+Rt[2][j]*v3[2]);
  // scalar τ
  M[9][9] = 1;
  return M;
}

function MatrixHeatmap({ data, n, labels, maxVal, onCellClick, highlightCells, title, color }) {
  const cellSize = Math.min(28, Math.floor(420 / n));
  const [tooltip, setTooltip] = useState(null);

  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: "monospace", color, marginBottom: 6 }}>{title}</div>
      <div style={{ overflowX: "auto" }}>
        <svg width={n * cellSize} height={n * cellSize}>
          {data.map((row, i) => row.map((val, j) => {
            const abs = Math.min(Math.abs(val) / maxVal, 1);
            const key = `${i},${j}`;
            const isHighlighted = highlightCells && highlightCells.has(key);
            const r = Math.round(abs * 248);
            const g = Math.round(abs < 0.5 ? abs * 2 * 180 : (1 - abs) * 2 * 180);
            const b = Math.round(abs < 0.5 ? 0 : (abs - 0.5) * 2 * 80);
            const bg = abs < 0.01 ? "#182436" : `rgb(${r},${g},${b})`;
            return (
              <g key={key}
                onClick={() => onCellClick && onCellClick(i, j, val)}
                onMouseEnter={() => setTooltip({ i, j, val })}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: "pointer" }}>
                <rect x={j*cellSize} y={i*cellSize} width={cellSize-1} height={cellSize-1}
                  fill={bg} rx={1}
                  stroke={isHighlighted ? C.amber : "none"}
                  strokeWidth={isHighlighted ? 2 : 0} />
                {cellSize >= 22 && (
                  <text x={j*cellSize+cellSize/2} y={i*cellSize+cellSize/2+3}
                    textAnchor="middle" fontSize={7} fill={abs > 0.3 ? "#fff" : C.muted}>
                    {Math.abs(val) < 0.001 ? "0" : val.toFixed(1)}
                  </text>
                )}
              </g>
            );
          }))}
        </svg>
      </div>
      {tooltip && (
        <div style={{ marginTop: 6, fontSize: 11, color: C.dim, fontFamily: "monospace", minHeight: 28 }}>
          [{tooltip.i},{tooltip.j}] = <span style={{ color: C.amber }}>{tooltip.val.toFixed(4)}</span>
          {" — "}<span style={{ color: C.text }}>
            {Math.abs(tooltip.val) < 0.001
              ? "No coupling"
              : `δ{state[${tooltip.j}]} error → δ{state[${tooltip.i}]} error × ${tooltip.val.toFixed(3)}`}
          </span>
        </div>
      )}
    </div>
  );
}

function Demo5() {
  const [phi] = useState([0, 0, 0.005]);
  const R3 = [[1,0,0],[0,1,0],[0,0,1]];
  const v3 = [1, 0, 0];
  const p3 = [0.5, 0.2, 0];

  const compound = buildCompoundFx(R3, v3, p3, null, phi, 0.01);
  const sgal = buildSGalFx(R3, v3, p3, 0);

  const maxC = compound.flat().reduce((m, v) => Math.max(m, Math.abs(v)), 0.01);
  const maxS = sgal.flat().reduce((m, v) => Math.max(m, Math.abs(v)), 0.01);

  const [clicked, setClicked] = useState(null);
  const [highlightC, setHighlightC] = useState(null);
  const [highlightS, setHighlightS] = useState(null);

  function nonzero(M) { return M.flat().filter(v => Math.abs(v) > 0.001).length; }
  const nnzC = nonzero(compound), nnzS = nonzero(sgal);

  const compoundLabels = ["δφ₁","δφ₂","δφ₃","δv₁","δv₂","δv₃","δp₁","δp₂","δp₃","δb_g₁","δb_g₂","δb_g₃","δb_a₁","δb_a₂","δb_a₃"];
  const sgalLabels = ["δξ₁","δξ₂","δξ₃","δξ₄","δξ₅","δξ₆","δξ₇","δξ₈","δξ₉","δτ"];

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.cyan, marginBottom: 10 }}>
        DEMO 5 — F_x Matrix Structure Comparison
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <MatrixHeatmap data={compound} n={15} maxVal={maxC}
            onCellClick={(i,j,v) => setClicked({matrix:"Compound",i,j,v})}
            highlightCells={highlightC}
            title="Compound F_x (15×15)" color={C.blue} />
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginTop: 4 }}>
            Nonzero: {nnzC}/{15*15} cells ({(100*nnzC/225).toFixed(0)}%)
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <MatrixHeatmap data={sgal} n={10} maxVal={maxS}
            onCellClick={(i,j,v) => setClicked({matrix:"SGal(3)",i,j,v})}
            highlightCells={highlightS}
            title="SGal(3) F_x top-left 10×10" color={C.green} />
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginTop: 4 }}>
            Nonzero: {nnzS}/{10*10} cells ({(100*nnzS/100).toFixed(0)}%)
          </div>
        </div>
      </div>
      {clicked && (
        <div style={{ marginTop: 10, padding: 10, background: "#0a0e18", borderRadius: 6, fontSize: 12, color: C.dim, fontFamily: "monospace" }}>
          <span style={{ color: C.amber }}>{clicked.matrix}</span> [{clicked.i},{clicked.j}] ={" "}
          <span style={{ color: C.green }}>{clicked.val.toFixed(6)}</span>
          <br />
          {Math.abs(clicked.val) < 0.001
            ? <span style={{ color: C.muted }}>No error coupling between these components.</span>
            : <span style={{ color: C.text }}>
                Error in state[{clicked.j}] propagates to state[{clicked.i}] with factor{" "}
                <span style={{ color: C.amber }}>{clicked.val.toFixed(4)}</span> per prediction step.
              </span>}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 11, color: C.dim, lineHeight: 1.7 }}>
        <B color={C.blue}>Compound</B>: sparse — misses direct R→p coupling (rows 6-8, cols 0-2 are zero).<br />
        <B color={C.green}>SGal(3)</B>: denser — Adjoint includes R↔p, R↔v, v↔p, τ cross-terms.
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Demo 7 — Ellipse propagation comparison: Compound vs SGal(3)
// ══════════════════════════════════════════════════════════════════════════════

function Demo7() {
  const canvasRef = useRef(null);
  const [omega, setOmega] = useState(0.8);
  const [dt, setDt] = useState(0.05);
  const [steps, setSteps] = useState(0);
  const [overlay, setOverlay] = useState(false);
  const histRef = useRef({ compound: [], sgal: [] });

  const W = 500, H = 260, OX = 250, OY = 130, SCALE = 60;

  const Q2 = [[0.0005,0],[0,0.0005]];

  function initHist() {
    const P0 = [[0.05,0],[0,0.05]];
    histRef.current = { compound: [P0], sgal: [P0] };
    setSteps(0);
  }

  useEffect(() => { initHist(); }, []);

  function getFxCompound2(theta, v, dt2) {
    return [[1, -v*Math.sin(theta)*dt2],[0, 1]];
  }
  function getFxSGal2(theta, v, p, dt2) {
    // SGal includes direct R→p coupling: row 0 gets extra term
    const Rt = Math.cos(theta);
    const coupling = -Rt * p * dt2 * 0.3;
    return [[1+coupling, -v*Math.sin(theta)*dt2],[0.1*dt2, 1]];
  }

  function runSteps(n) {
    let theta = 0, vv = 1, p = 0;
    let cP = histRef.current.compound[histRef.current.compound.length - 1];
    let sP = histRef.current.sgal[histRef.current.sgal.length - 1];
    const newC = [...histRef.current.compound];
    const newS = [...histRef.current.sgal];
    for (let i = 0; i < n; i++) {
      const FxC = getFxCompound2(theta, vv, dt);
      const FxS = getFxSGal2(theta, vv, p, dt);
      cP = propagateP(cP, FxC, Q2);
      sP = propagateP(sP, FxS, Q2);
      newC.push(cP);
      newS.push(sP);
      theta += omega * dt;
      p += vv * dt;
    }
    histRef.current = { compound: newC.slice(-25), sgal: newS.slice(-25) };
    setSteps(s => s + n);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = C.border + "50"; ctx.lineWidth = 0.5;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(OX+i*SCALE,0); ctx.lineTo(OX+i*SCALE,H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,OY+i*SCALE); ctx.lineTo(W,OY+i*SCALE); ctx.stroke();
    }

    const { compound, sgal } = histRef.current;

    const drawHist = (hist, color) => hist.forEach((P, i) => {
      const alpha = (i+1)/hist.length;
      const Psc = [[P[0][0]*SCALE*SCALE, P[0][1]*SCALE*SCALE],[P[1][0]*SCALE*SCALE,P[1][1]*SCALE*SCALE]];
      drawEllipse(ctx, OX + i*8, OY - i*4, Psc, 1, color, alpha);
    });

    if (overlay) {
      drawHist(compound, C.red);
      drawHist(sgal, C.green);
    } else {
      // side by side: compound left, sgal right
      compound.forEach((P, i) => {
        const alpha = (i+1)/compound.length;
        const Psc = [[P[0][0]*SCALE*SCALE,P[0][1]*SCALE*SCALE],[P[1][0]*SCALE*SCALE,P[1][1]*SCALE*SCALE]];
        drawEllipse(ctx, 120+i*5, OY-i*3, Psc, 1, C.blue, alpha);
      });
      sgal.forEach((P, i) => {
        const alpha = (i+1)/sgal.length;
        const Psc = [[P[0][0]*SCALE*SCALE,P[0][1]*SCALE*SCALE],[P[1][0]*SCALE*SCALE,P[1][1]*SCALE*SCALE]];
        drawEllipse(ctx, 380-i*5, OY-i*3, Psc, 1, C.green, alpha);
      });
      ctx.fillStyle = C.blue; ctx.font = "bold 11px monospace";
      ctx.fillText("Compound", 60, 20);
      ctx.fillStyle = C.green;
      ctx.fillText("SGal(3)", 330, 20);
    }
  }, [steps, overlay]);

  const lastC = histRef.current.compound[histRef.current.compound.length - 1] || [[0.05,0],[0,0.05]];
  const lastS = histRef.current.sgal[histRef.current.sgal.length - 1] || [[0.05,0],[0,0.05]];
  const pppC = lastC[0][0], pppS = lastS[0][0];

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.purple, marginBottom: 8 }}>
        DEMO 7 — Covariance Ellipse: Compound vs SGal(3)
      </div>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ width: "100%", maxWidth: W, borderRadius: 6, display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <Slider label="ω (rad/s)" value={omega} min={0} max={2} step={0.05} onChange={v => { setOmega(v); initHist(); }} unit=" rad/s" />
        <Slider label="Δt (s)" value={dt} min={0.01} max={0.2} step={0.01} onChange={v => { setDt(v); initHist(); }} />
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn onClick={() => runSteps(1)} color={C.purple} active>▶ Step</Btn>
        <Btn onClick={() => runSteps(10)} color={C.blue}>▶▶ ×10</Btn>
        <Btn onClick={() => runSteps(20)} color={C.cyan}>▶▶▶ ×20</Btn>
        <Btn onClick={() => setOverlay(o => !o)} color={C.amber} active={overlay}>
          {overlay ? "Overlay ON" : "Overlay OFF"}
        </Btn>
        <Btn onClick={initHist} color={C.red}>Reset</Btn>
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          ["Compound P[pos,pos]", pppC.toFixed(4)+" m²", C.blue],
          ["SGal(3) P[pos,pos]", pppS.toFixed(4)+" m²", C.green],
          ["Difference", Math.abs(pppC-pppS).toFixed(4)+" m² ("+
            (pppC > 0.001 ? (100*Math.abs(pppC-pppS)/pppC).toFixed(1)+"%" : "—")+")", C.amber],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: "#0a0e18", borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: "monospace" }}>{label}</div>
            <div style={{ fontSize: 13, color, fontFamily: "monospace", fontWeight: 700 }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: C.dim }}>
        Higher ω → larger difference. Overlay mode: <span style={{ color: C.red }}>red = Compound</span>, <span style={{ color: C.green }}>green = SGal(3)</span>.
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Demo 9 — Degenerate vs Full-observation
// ══════════════════════════════════════════════════════════════════════════════

function Demo9() {
  const canvasRef = useRef(null);
  const [scenario, setScenario] = useState("B");
  const [measStrength, setMeasStrength] = useState(0.1);
  const [steps, setSteps] = useState(0);

  const W = 500, H = 260, SCALE = 55;

  // 2D state: (px, py). Compound uses diagonal P growth, SGal adds off-diagonal.
  function makePriorCompound(s) {
    const growth = 0.05 * s;
    return [[0.1+growth, 0.01*s],[0.01*s, 0.1+growth*0.2]];
  }
  function makePriorSGal(s) {
    const growth = 0.05 * s;
    return [[0.1+growth, 0.04*s],[0.04*s, 0.1+growth*0.5]];
  }

  // Kalman update: H measures only y (scenario B) or both (scenario A)
  function kalmanUpdate(P, measStr, scenA) {
    const r = scenA ? 0.01/Math.max(measStr,0.01) : 0.5/Math.max(measStr,0.01);
    const H = scenA ? [[1,0],[0,1]] : [[0,1]];
    if (scenA) {
      // Full 2×2 update
      const HPHT = [[P[0][0]+r,P[0][1]],[P[1][0],P[1][1]+r]];
      const K = [
        [P[0][0]/(P[0][0]+r), P[0][1]/(P[1][1]+r)],
        [P[1][0]/(P[0][0]+r), P[1][1]/(P[1][1]+r)],
      ];
      return [
        [(1-K[0][0])*P[0][0]-K[0][1]*P[1][0], (1-K[0][0])*P[0][1]-K[0][1]*P[1][1]],
        [-K[1][0]*P[0][0]+(1-K[1][1])*P[1][0], -K[1][0]*P[0][1]+(1-K[1][1])*P[1][1]],
      ];
    } else {
      // Only y measurement
      const HPHTr = P[1][1] + r;
      const K = [P[0][1]/HPHTr, P[1][1]/HPHTr];
      return [
        [P[0][0]-K[0]*P[1][0], P[0][1]-K[0]*P[1][1]],
        [P[1][0]-K[1]*P[1][0], P[1][1]-K[1]*P[1][1]],
      ];
    }
  }

  const scenA = scenario === "A";
  const PC = makePriorCompound(steps);
  const PS = makePriorSGal(steps);
  const PCu = kalmanUpdate(PC, measStrength, scenA);
  const PSu = kalmanUpdate(PS, measStrength, scenA);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    const OX = W/2, OY = H/2;

    ctx.strokeStyle = C.border+"50"; ctx.lineWidth=0.5;
    for (let i=-4;i<=4;i++){
      ctx.beginPath();ctx.moveTo(OX+i*SCALE,0);ctx.lineTo(OX+i*SCALE,H);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,OY+i*SCALE);ctx.lineTo(W,OY+i*SCALE);ctx.stroke();
    }
    ctx.strokeStyle=C.border;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(OX,0);ctx.lineTo(OX,H);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,OY);ctx.lineTo(W,OY);ctx.stroke();

    const toSc = P => [[P[0][0]*SCALE*SCALE,P[0][1]*SCALE*SCALE],[P[1][0]*SCALE*SCALE,P[1][1]*SCALE*SCALE]];

    // Prior ellipses (dim)
    drawEllipse(ctx, OX-60, OY, toSc(PC), 1, C.blue, 0.4);
    drawEllipse(ctx, OX+60, OY, toSc(PS), 1, C.green, 0.4);
    // Updated ellipses (bright)
    drawEllipse(ctx, OX-60, OY, toSc(PCu), 1, C.blue, 1.0);
    drawEllipse(ctx, OX+60, OY, toSc(PSu), 1, C.green, 1.0);

    // Labels
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = C.blue; ctx.fillText("Compound", OX-120, 18);
    ctx.fillStyle = C.green; ctx.fillText("SGal(3)", OX+20, 18);
    ctx.fillStyle = C.muted; ctx.font = "10px monospace";
    ctx.fillText("dim=prior, bright=updated", OX-80, H-8);

    if (!scenA) {
      ctx.strokeStyle = C.amber+"80"; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(0, OY); ctx.lineTo(W, OY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.amber; ctx.font = "9px monospace";
      ctx.fillText("← tunnel: y measured only →", OX-70, OY-6);
    }
  }, [scenario, measStrength, steps]);

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.pink, marginBottom: 8 }}>
        DEMO 9 — Degenerate vs Full-Observation
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Btn onClick={() => setScenario("A")} color={C.green} active={scenario==="A"}>
          Scenario A: Full obs
        </Btn>
        <Btn onClick={() => setScenario("B")} color={C.amber} active={scenario==="B"}>
          Scenario B: Tunnel (degenerate)
        </Btn>
      </div>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ width: "100%", maxWidth: W, borderRadius: 6, display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <Slider label="measurement str" value={measStrength} min={0.01} max={1} step={0.01}
          onChange={setMeasStrength} />
        <Slider label="prediction steps" value={steps} min={0} max={30} step={1}
          onChange={setSteps} unit=" steps" />
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: C.dim, lineHeight: 1.7 }}>
        {scenA
          ? <><B color={C.green}>Scenario A (feature-rich)</B>: Strong measurement pulls both ellipses to same small posterior. F_x quality nearly irrelevant.</>
          : <><B color={C.amber}>Scenario B (tunnel)</B>: Only lateral (y) measured. Along-tunnel (x) unconstrained — posterior = prior for x-DoF. <B color={C.blue}>Compound</B> P_prior is less accurate → stays less accurate. <B color={C.green}>SGal(3)</B> P_prior includes cross-terms → more accurate ellipse orientation.</>}
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Demo 10 — Step-by-step F_x numerical walkthrough
// ══════════════════════════════════════════════════════════════════════════════

function skew3(v) {
  return [[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]];
}
function expSO3(phi) {
  const th = Math.sqrt(phi[0]**2+phi[1]**2+phi[2]**2);
  if (th < 1e-8) return [[1,0,0],[0,1,0],[0,0,1]];
  const s=Math.sin(th)/th, c=(1-Math.cos(th))/(th*th);
  const K=skew3(phi);
  return [
    [1+c*(K[0][0]*K[0][0]+K[0][1]*K[1][0]+K[0][2]*K[2][0]),
     c*(K[0][0]*K[0][1]+K[0][1]*K[1][1]+K[0][2]*K[2][1])-s*phi[2]/th*th+s*phi[2]/th,
     s*phi[1]/th+c*(K[0][0]*K[0][2]+K[0][1]*K[1][2]+K[0][2]*K[2][2])],
    [s*phi[2]/th+c*(K[1][0]*K[0][0]+K[1][1]*K[1][0]+K[1][2]*K[2][0]),
     1+c*(K[1][0]*K[0][1]+K[1][1]*K[1][1]+K[1][2]*K[2][1]),
     c*(K[1][0]*K[0][2]+K[1][1]*K[1][2]+K[1][2]*K[2][2])-s*phi[0]/th],
    [c*(K[2][0]*K[0][0]+K[2][1]*K[1][0]+K[2][2]*K[2][0])-s*phi[1]/th,
     s*phi[0]/th+c*(K[2][0]*K[0][1]+K[2][1]*K[1][1]+K[2][2]*K[2][1]),
     1+c*(K[2][0]*K[0][2]+K[2][1]*K[1][2]+K[2][2]*K[2][2])],
  ];
}

function MiniMatrix({ data, n, highlightCells, title, color, cellSize = 36 }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {title && <div style={{ fontSize: 10, fontFamily: "monospace", color, marginBottom: 4 }}>{title}</div>}
      <svg width={n*cellSize} height={n*cellSize} style={{ display: "block" }}>
        {data.map((row, i) => row.map((val, j) => {
          const abs = Math.min(Math.abs(val), 2) / 2;
          const key = `${i},${j}`;
          const hl = highlightCells && highlightCells.has(key);
          const bg = abs < 0.01 ? "#182436" : `rgba(255,${Math.round(160*(1-abs))},${Math.round(50*(1-abs))},${0.3+abs*0.7})`;
          return (
            <g key={key}>
              <rect x={j*cellSize} y={i*cellSize} width={cellSize-1} height={cellSize-1}
                fill={bg} rx={2}
                stroke={hl ? C.amber : "transparent"} strokeWidth={hl ? 2 : 0} />
              <text x={j*cellSize+cellSize/2} y={i*cellSize+cellSize/2+3}
                textAnchor="middle" fontSize={8.5} fill={abs > 0.2 ? "#fff" : C.dim}
                fontFamily="monospace">
                {Math.abs(val) < 0.0001 ? "0" : val.toFixed(3)}
              </text>
            </g>
          );
        }))}
      </svg>
    </div>
  );
}

function Demo10() {
  const [step, setStep] = useState(0);
  const omega = [0, 0, 0.5]; const a = [2, 0, 0]; const dt = 0.01;
  const phi = omega.map(w => w * dt);
  const ExpPhi = expSO3(phi);

  const compound15 = buildCompoundFx([[1,0,0],[0,1,0],[0,0,1]],[1,0,0],[0,0,0],null,phi,dt);
  const sgal10 = buildSGalFx([[1,0,0],[0,1,0],[0,0,1]],[1,0,0],[0,0.5,0],0);

  const steps = [
    {
      label: "Step 1 — Compute φ = ω̃ · Δt",
      content: (
        <div style={{ fontFamily: "monospace", fontSize: 12, color: C.text, lineHeight: 2 }}>
          <div>ω̃ = [0, 0, 0.5] rad/s,   Δt = 0.01 s</div>
          <div style={{ color: C.amber }}>φ = ω̃ · Δt = [0, 0, <span style={{color:C.green}}>0.005</span>] rad</div>
          <div style={{ color: C.muted, fontSize: 11 }}>‖φ‖ = 0.005 rad ≈ 0.286°  (very small rotation)</div>
        </div>
      ),
    },
    {
      label: "Step 2 — Compute Exp_{SO(3)}(φ)",
      content: (
        <div>
          <div style={{ fontSize: 12, color: C.dim, fontFamily: "monospace", marginBottom: 8 }}>
            Rodrigues formula: I + sin(‖φ‖)/‖φ‖ · [φ]× + (1-cos(‖φ‖))/‖φ‖² · [φ]×²
          </div>
          <MiniMatrix data={ExpPhi} n={3} title="Exp_{SO(3)}(φ) ≈ I for small φ" color={C.amber} cellSize={70} />
        </div>
      ),
    },
    {
      label: "Step 3 — Compound F_x (15×15)",
      content: (
        <div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>
            Showing top 9×9 block (rotation, velocity, position):
          </div>
          <MiniMatrix data={compound15.slice(0,9).map(r=>r.slice(0,9))} n={9}
            highlightCells={new Set(["6,3","7,4","8,5"])}
            title="v→p: I·Δt diagonal (highlighted)" color={C.blue} cellSize={42} />
          <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", marginTop: 6 }}>
            R→p block [rows 6-8, cols 0-2]: all zero (no direct coupling in compound)
          </div>
        </div>
      ),
    },
    {
      label: "Step 4 — SGal(3) F_x top-left 10×10",
      content: (
        <div>
          <MiniMatrix data={sgal10} n={10}
            highlightCells={new Set(["3,0","4,1","5,2","6,0","7,1","8,2","9,0","9,1","9,2"])}
            title="R→p, R→v, τ couplings (highlighted)" color={C.green} cellSize={36} />
          <div style={{ fontSize: 11, color: C.dim, fontFamily: "monospace", marginTop: 6 }}>
            R→p: rows 3-5, cols 0-2 — <span style={{color:C.green}}>NONZERO</span> via -Rᵀ[p]×<br/>
            τ row 9: nonzero — <span style={{color:C.amber}}>time-space coupling</span>
          </div>
        </div>
      ),
    },
    {
      label: "Step 5 — Difference F_x^{SGal} − F_x^{compound}",
      content: (() => {
        const diff3 = sgal10.slice(0,9).map((row,i) =>
          row.slice(0,9).map((v,j) => {
            const cv = compound15[i] ? compound15[i][j] || 0 : 0;
            return v - cv;
          })
        );
        const significant = new Set();
        diff3.forEach((row,i) => row.forEach((v,j) => { if(Math.abs(v)>0.001) significant.add(`${i},${j}`); }));
        const frobNorm = Math.sqrt(diff3.flat().reduce((s,v)=>s+v*v,0));
        return (
          <div>
            <MiniMatrix data={diff3} n={9}
              highlightCells={significant}
              title="Conceptual diff (first 9×9, aligned dims)" color={C.amber} cellSize={42} />
            <div style={{ fontSize: 11, color: C.dim, fontFamily: "monospace", marginTop: 6 }}>
              Significant cells (|Δ| &gt; 0.001): <span style={{color:C.amber}}>{significant.size}</span><br/>
              ‖ΔF_x‖_F ≈ <span style={{color:C.green}}>{frobNorm.toFixed(4)}</span>
            </div>
          </div>
        );
      })(),
    },
  ];

  return (
    <Card>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: C.cyan, marginBottom: 10 }}>
        DEMO 10 — Step-by-step F_x Numerical Walkthrough
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {steps.map((s, i) => (
          <Btn key={i} onClick={() => setStep(i)} color={C.cyan} active={step === i}>
            [{i+1}]
          </Btn>
        ))}
      </div>
      <div style={{ padding: "12px 0", minHeight: 200 }}>
        <div style={{ fontSize: 13, color: C.amber, fontFamily: "monospace", fontWeight: 700, marginBottom: 12 }}>
          {steps[step].label}
        </div>
        {steps[step].content}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
        Given: R=I, v=[1,0,0] m/s, p=[0,0,0], ω̃=[0,0,0.5] rad/s, ã=[2,0,0] m/s², Δt=0.01 s
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════

export default function FxJacobian() {
  return (
    <div style={{
      background: C.bg, minHeight: "100vh", padding: "24px 16px 60px",
      fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text,
    }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: C.amber, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>
            SLAM Math Series
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px", color: C.text }}>
            F_x Jacobian & Covariance Propagation
          </h1>
          <div style={{ color: C.dim, fontSize: 13 }}>
            Error-state Jacobian: từ trực giác → toán → ứng dụng SLAM
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 4, fontFamily: "monospace" }}>
            Compound F_x · SGal(3) Adjoint · Covariance Ellipse · Degenerate Observation
          </div>
        </div>

        {/* §1 */}
        <Section n={1} title="F_x bằng trực giác: Error Propagation" />
        <P>
          F_x là ma trận Jacobian của hàm chuyển đổi trạng thái. Mỗi phần tử <B>F_x[i,j]</B> trả lời câu hỏi:
          "Nếu state component j sai 1 đơn vị, thì state component i sai bao nhiêu sau 1 bước predict?"
        </P>
        <P>
          1D robot: state = [pos, vel]. Model: <B color={C.cyan}>pos_{"{k+1}"} = pos_k + vel_k·Δt</B>.
          Velocity error lan truyền sang position error qua Δt — ellipse bị <B>shear</B>.
        </P>
        <Demo1 />

        {/* §2 */}
        <Section n={2} title="F_x cho 2D Robot (Unicycle Model)" />
        <P>
          State = [px, py, θ, v]. F_x có cột 3 phụ thuộc θ — linearization tại operating point.
          Covariance ellipse xoay và kéo giãn qua coupling <B color={C.green}>θ → (px, py)</B>.
        </P>
        <Demo4 />

        {/* §3 */}
        <Section n={3} title="F_x trong SLAM: SO(3)×ℝ⁶ vs SGal(3)" />
        <P>
          LIO state 15D (compound) vs 18D (SGal(3)). Key difference: <B color={C.green}>SGal(3) F_x</B> bao gồm
          direct R→p coupling qua Adjoint, trong khi <B color={C.blue}>compound F_x</B> chỉ có indirect
          (R→v→p).
        </P>
        <Demo5 />

        {/* §4 */}
        <Section n={4} title="Covariance Propagation: Tại sao F_x quan trọng?" />
        <P>
          Cùng initial state, cùng IMU inputs. Sau nhiều prediction steps:
          ellipse compound và SGal(3) có hình dạng khác nhau — impact trực tiếp lên Kalman gain K.
        </P>
        <Demo7 />

        {/* §5 */}
        <Section n={5} title="Khi nào F_x khác biệt THỰC SỰ quan trọng?" />
        <P>
          <B color={C.green}>Feature-rich</B>: measurement mạnh → posterior phụ thuộc chủ yếu vào R (measurement noise) → F_x quality gần như không quan trọng.
          <br />
          <B color={C.amber}>Degenerate (tunnel)</B>: measurement yếu → posterior = prior cho unconstrained DoFs → F_x quality quyết định drift rate.
        </P>
        <Demo9 />

        {/* §6 */}
        <Section n={6} title="Numerical Walkthrough: F_x with Real Numbers" />
        <P>
          R=I, v=[1,0,0], ω̃=[0,0,0.5] rad/s, ã=[2,0,0] m/s², Δt=0.01 s.
          So sánh từng block của Compound vs SGal(3).
        </P>
        <Demo10 />

        {/* §7 Summary */}
        <Section n={7} title="Summary" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 14 }}>
          {[
            {
              title: "F_x = Error Amplifier",
              color: C.amber,
              points: [
                "F_x[i,j]: error in j → error in i after 1 step",
                "Sparse F_x = misses propagation paths",
                "Dense F_x = captures more coupling",
              ],
            },
            {
              title: "F_x → P → K → Update Quality",
              color: C.green,
              points: [
                "F_x determines P_prior shape",
                "P_prior determines Kalman gain K",
                "Wrong P → wrong K → suboptimal update",
              ],
            },
            {
              title: "When F_x matters",
              color: C.cyan,
              points: [
                "Feature-rich: doesn't matter (measurement dominates)",
                "Degenerate: matters a lot (prediction dominates)",
                "High ω: bigger difference compound vs SGal(3)",
              ],
            },
          ].map(card => (
            <div key={card.title} style={{
              background: C.card, border: `1px solid ${card.color}30`,
              borderRadius: 10, padding: "16px 18px",
            }}>
              <div style={{ color: card.color, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{card.title}</div>
              {card.points.map((p, i) => (
                <div key={i} style={{ color: C.dim, fontSize: 12, lineHeight: 1.7, display: "flex", gap: 6 }}>
                  <span style={{ color: card.color, flexShrink: 0 }}>·</span>{p}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 48, color: C.muted, fontSize: 11, fontFamily: "monospace" }}>
          zerokhong1 · AI VIET NAM · FxJacobian
        </div>
      </div>
    </div>
  );
}
