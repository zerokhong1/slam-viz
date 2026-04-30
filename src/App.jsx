import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const LIMOncelloExplainer = lazy(() => import('./pages/LIMOncelloExplainer'))
const SGalDeepDive = lazy(() => import('./pages/SGalDeepDive'))
const OctreeVsIOctree = lazy(() => import('./pages/OctreeVsIOctree'))
const TreeComparison = lazy(() => import('./pages/TreeComparison'))

const C = {
  bg: '#06090f', card: '#0d1420', border: '#182436',
  blue: '#4a9eff', amber: '#ffb347', green: '#4ade80',
  purple: '#c084fc', text: '#dfe6ee', dim: '#8899ad', muted: '#4a5a6e',
}

const pages = [
  {
    path: '/limoncello',
    title: 'LIMOncello Explainer',
    desc: 'Full paper walkthrough: pipeline, SGal(3), IESKF, i-Octree',
    color: C.amber,
    tag: 'SYSTEM',
  },
  {
    path: '/sgal3',
    title: 'SGal(3) vs SO(3)×R\u2076',
    desc: 'Deep dive: V\u2081 approximation, drift simulation, interactive examples',
    color: C.green,
    tag: 'MATH',
  },
  {
    path: '/octree',
    title: 'Octree vs i-Octree',
    desc: 'Memory layout, insert/delete, Morton code, downsampling',
    color: C.blue,
    tag: 'DATA STRUCTURE',
  },
  {
    path: '/trees',
    title: 'ikd-Tree vs i-Octree',
    desc: 'KNN search, rebalance, latency profiles, benchmarks',
    color: C.purple,
    tag: 'COMPARISON',
  },
]

function Home() {
  return (
    <div style={{
      background: C.bg, minHeight: '100vh', padding: '48px 16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text,
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            fontSize: 11, fontFamily: 'monospace', color: C.amber,
            letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8,
          }}>ICRA 2027 Preparation</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
            SLAM Research
          </h1>
          <div style={{ color: C.dim, fontSize: 14 }}>
            Interactive visualizations for LiDAR-Inertial Odometry
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
            LIMOncello \u00b7 HP\u00b2-SLAM \u00b7 FAST-LIO2
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {pages.map((p) => (
            <Link key={p.path} to={p.path} style={{ textDecoration: 'none' }}>
              <div style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '20px 24px', cursor: 'pointer',
                transition: 'border-color 0.2s, transform 0.15s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = p.color + '60'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = C.border
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: p.color, fontSize: 16, fontWeight: 700 }}>{p.title}</span>
                  <span style={{
                    fontSize: 9, fontFamily: 'monospace', color: p.color, fontWeight: 700,
                    background: `${p.color}15`, padding: '2px 8px', borderRadius: 4,
                    border: `1px solid ${p.color}30`,
                  }}>{p.tag}</span>
                </div>
                <div style={{ color: C.dim, fontSize: 13 }}>{p.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        <div style={{
          textAlign: 'center', marginTop: 48, color: C.muted, fontSize: 11,
          fontFamily: 'monospace',
        }}>
          zerokhong1 \u00b7 AI VIET NAM \u00b7 github.com/zerokhong1
        </div>
      </div>
    </div>
  )
}

function NavBar() {
  const location = useLocation()
  if (location.pathname === '/') return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(6,9,15,0.9)', backdropFilter: 'blur(8px)',
      borderBottom: `1px solid ${C.border}`, padding: '8px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <Link to="/" style={{
        color: C.amber, textDecoration: 'none', fontSize: 13,
        fontFamily: 'monospace', fontWeight: 700,
      }}>\u2190 Home</Link>
      <span style={{ color: C.muted, fontSize: 12 }}>\u00b7</span>
      <span style={{ color: C.dim, fontSize: 12, fontFamily: 'monospace' }}>
        {pages.find(p => location.pathname === p.path)?.title || ''}
      </span>
    </div>
  )
}

function Loading() {
  return (
    <div style={{
      background: C.bg, minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      color: C.dim, fontFamily: 'monospace', fontSize: 14,
    }}>Loading...</div>
  )
}

export default function App() {
  return (
    <>
      <NavBar />
      <div style={{ paddingTop: useLocation().pathname === '/' ? 0 : 44 }}>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/limoncello" element={<LIMOncelloExplainer />} />
            <Route path="/sgal3" element={<SGalDeepDive />} />
            <Route path="/octree" element={<OctreeVsIOctree />} />
            <Route path="/trees" element={<TreeComparison />} />
          </Routes>
        </Suspense>
      </div>
    </>
  )
}
