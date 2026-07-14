import { useEffect, useState } from 'react'
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
import Backdrop from './components/Backdrop'
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
const TOUR: { module: string; title: string; body: string; target: string; lift?: string }[] = [
  {
    module: 'decision',
    target: '[data-tour="floor"]',
    lift: '.db-tiles',
    title: 'Turn up forced disclosure',
    body: 'Drag the mandated floor slider to the right and watch the numbers above. The hedge ratios fall — when a regulator forces a company to disclose more, hedging quietly follows it down.',
  },
  {
    module: 'budget',
    target: '[data-tour="budget-b"]',
    lift: '.bg-tiles',
    title: 'Tighten the budget',
    body: 'Pull the budget slider down. The plan spends less, but the split between oil and currency barely moves — the shape of the market decides it, not the size of the wallet.',
  },
  {
    module: 'instruments',
    target: '[data-tour="cap"]',
    lift: '.ins-tiles',
    title: 'Build a free hedge',
    body: 'Raise the cap slider. The desk instantly finds the floor that pays for it — and the net premium stays at zero. This is how oil refiners actually hedge.',
  },
  {
    module: 'instruments',
    target: '[data-tour="exotic-tab"]',
    title: 'Walk into the barrier',
    body: 'Open this tab, then push the WTI spot slider up. The risk monitor climbs to Critical and the hedge starts working backwards — the exact place where textbook methods break.',
  },
  {
    module: 'accounting',
    target: '[data-tour="chips"]',
    title: 'Follow the number',
    body: 'The knock-out odds you just set traveled here by themselves — top of the screen. One shared state, every screen connected. That is the whole idea.',
  },
]

export default function App() {
  const [active, setActive] = useState<string>('overview')
  const [tour, setTour] = useState<number | null>(null)
  const mod = ALL.find((m) => m.id === active)!

  // spotlight the tour step's control: soft glow + arrow, scrolled into view
  useEffect(() => {
    document.querySelectorAll('.tour-glow').forEach((el) => el.classList.remove('tour-glow'))
    document.querySelectorAll('.tour-lift').forEach((el) => el.classList.remove('tour-lift'))
    if (tour === null) return
    const t = setTimeout(() => {
      const el = document.querySelector(TOUR[tour].target)
      if (el) {
        el.classList.add('tour-glow')
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      const lift = TOUR[tour].lift
      if (lift) document.querySelector(lift)?.classList.add('tour-lift')
    }, 420)
    return () => clearTimeout(t)
  }, [tour, active])

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
      <Backdrop />
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

      {tour !== null && <div className="tour-backdrop" />}
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
