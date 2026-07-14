import { useState } from 'react'
import Overview from './modules/Overview'
import AccountTree from './modules/AccountTree'
import Materiality from './modules/Materiality'
import MetricEntry from './modules/MetricEntry'
import Scenario from './modules/Scenario'
import Dashboard from './modules/Dashboard'
import Instruments from './modules/Instruments'
import Budget from './modules/Budget'
import Accounting from './modules/Accounting'
import { SpineProvider } from './state/spine'
import './App.css'

// Sidebar = the product map. Groups tell a first-time visitor what kind of
// layer each module belongs to; order within "Decision layer" is the data flow.
const GROUPS: {
  title: string | null
  items: { id: string; name: string; desc: string }[]
}[] = [
  {
    title: null,
    items: [
      { id: 'overview', name: 'Overview', desc: '' },
    ],
  },
  {
    title: 'Decision layer',
    items: [
      { id: 'decision', name: 'Decision Dashboard', desc: 'Optimal disclosure d* and hedge ratios h* — live from the frozen engine' },
      { id: 'budget', name: 'Hedge Budget', desc: 'Fixed budget → optimal WTI/FX coverage split (constrained minimum variance)' },
      { id: 'instruments', name: 'Hedge Instruments', desc: 'Zero-cost collar (industry standard) · double-KO quanto (research) · forward baseline' },
      { id: 'accounting', name: 'Hedge Accounting', desc: 'IFRS 9 CFH designation: combined vs split — OCI, ineffectiveness, KO aftermath' },
    ],
  },
  {
    title: 'Reporting layer',
    items: [
      { id: 'cosa', name: 'Chart of Accounts', desc: 'Sustainability account tree → framework datapoint mapping' },
      { id: 'materiality', name: 'Materiality', desc: 'IRO register → double materiality matrix (interactive)' },
      { id: 'metrics', name: 'Metrics Entry', desc: 'Quantitative metrics → validation rules → approval (mockup)' },
    ],
  },
  {
    title: 'What-if',
    items: [
      { id: 'scenario', name: 'Scenarios', desc: 'Division-level parameters → strategy comparison' },
    ],
  },
]

const ALL = GROUPS.flatMap((g) => g.items)

// Guided walkthrough — five moves that show the whole system without any
// finance background. Each step lands on a module and says exactly what to drag.
const TOUR: { module: string; title: string; body: string }[] = [
  {
    module: 'decision',
    title: 'Force the disclosure floor',
    body: 'Drag "d̲ mandated floor" (Regulation, right end of the deck) past ~0.9. The badge flips to floor binding and both hedge bars shrink — forced disclosure buys penalty relief and crowds out hedging. That is the paper\'s §3.6 prediction, computed live.',
  },
  {
    module: 'budget',
    title: 'Squeeze the ₩45bn budget',
    body: 'Pull "Budget B" down toward ₩35bn. The optimum walks along the red cost boundary, but the 97/3 WTI-FX split barely moves — the asymmetry is structural (σ₁²/σ₂² ≈ 18×), not budgetary.',
  },
  {
    module: 'instruments',
    title: 'Price a free hedge',
    body: 'On the Zero-cost collar tab, raise "Cap strike Kc". The solver instantly finds the floor whose written put finances the bought call — net premium pinned at $0.00. This is how refiners actually hedge.',
  },
  {
    module: 'instruments',
    title: 'Walk into the barrier',
    body: 'Switch to the Double-KO quanto tab and push "WTI spot" toward $115. The Barrier Risk Monitor escalates to Critical, KO odds jump past 80%, and Δ flips sign — the exact place where textbook delta hedging breaks.',
  },
  {
    module: 'accounting',
    title: 'Watch the number travel',
    body: 'The KO odds you just set arrived here on their own — see the EXOTIC DESK chip at the top. That number decides how noisy the split designation\'s books get after a knock-out. The sidebar really is a data flow.',
  },
]

export default function App() {
  const [active, setActive] = useState<string>('overview')
  const [tour, setTour] = useState<number | null>(null)
  const mod = ALL.find((m) => m.id === active)!

  const startTour = () => {
    setTour(0)
    setActive(TOUR[0].module)
  }
  const stepTour = (dir: 1 | -1) => {
    if (tour === null) return
    const next = tour + dir
    if (next < 0) return
    if (next >= TOUR.length) {
      setTour(null)
      setActive('overview')
      return
    }
    setTour(next)
    setActive(TOUR[next].module)
  }

  return (
    <SpineProvider>
    <div className="app">
      <aside className="sidebar">
        <button className="brand" onClick={() => setActive('overview')}>
          <span className="brand-mark">홍</span>
          <div>
            <div className="brand-name">HongERP</div>
            <div className="brand-sub">ESG decision layer</div>
          </div>
        </button>
        <nav>
          {GROUPS.map((g) => (
            <div key={g.title ?? 'top'} className="nav-group">
              {g.title && <div className="nav-group-title">{g.title}</div>}
              {g.items.map((m) => (
                <button
                  key={m.id}
                  className={m.id === active ? 'nav-item active' : 'nav-item'}
                  onClick={() => setActive(m.id)}
                >
                  {m.name}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <footer className="sidebar-foot">
          v1 · <a href="https://github.com/JihongParker/hong-erp" target="_blank" rel="noreferrer">GitHub</a>
        </footer>
      </aside>

      <main className="content">
        {mod.id !== 'overview' && (
          <header>
            <h1>{mod.name}</h1>
            <p className="desc">{mod.desc}</p>
          </header>
        )}
        {mod.id === 'overview' ? (
          <Overview onNavigate={setActive} onStartTour={startTour} />
        ) : mod.id === 'decision' ? (
          <Dashboard />
        ) : mod.id === 'budget' ? (
          <Budget />
        ) : mod.id === 'instruments' ? (
          <Instruments />
        ) : mod.id === 'accounting' ? (
          <Accounting />
        ) : mod.id === 'cosa' ? (
          <AccountTree />
        ) : mod.id === 'materiality' ? (
          <Materiality />
        ) : mod.id === 'metrics' ? (
          <MetricEntry />
        ) : (
          <Scenario />
        )}
      </main>

      {tour !== null && (
        <aside className="tour-card" role="dialog" aria-label="Guided tour">
          <div className="tour-head">
            <span className="tour-step">Step {tour + 1} / {TOUR.length}</span>
            <button className="tour-close" onClick={() => setTour(null)} aria-label="End tour">✕</button>
          </div>
          <h4>{TOUR[tour].title}</h4>
          <p>{TOUR[tour].body}</p>
          <div className="tour-actions">
            {tour > 0 && (
              <button className="tour-btn ghost" onClick={() => stepTour(-1)}>← Back</button>
            )}
            <button className="tour-btn" onClick={() => stepTour(1)}>
              {tour === TOUR.length - 1 ? 'Finish' : 'Next →'}
            </button>
          </div>
        </aside>
      )}
    </div>
    </SpineProvider>
  )
}
