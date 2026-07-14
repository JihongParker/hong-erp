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

export default function App() {
  const [active, setActive] = useState<string>('overview')
  const mod = ALL.find((m) => m.id === active)!

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
          <Overview onNavigate={setActive} />
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
    </div>
    </SpineProvider>
  )
}
