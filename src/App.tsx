import { useState } from 'react'
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

// The module map is the product roadmap. Keep status honest:
// planned (design agreed) → building → live.
const MODULES = [
  {
    id: 'decision',
    name: 'Decision Dashboard',
    desc: 'Optimal disclosure d* and hedge ratios h* — live from the frozen engine',
    status: 'live',
    note: '',
  },
  {
    id: 'budget',
    name: 'Hedge Budget',
    desc: 'Fixed budget → optimal WTI/FX coverage split (constrained minimum variance)',
    status: 'live',
    note: '',
  },
  {
    id: 'instruments',
    name: 'Hedge Instruments',
    desc: 'Zero-cost collar (industry standard) · double-KO quanto (research) · forward baseline',
    status: 'live',
    note: '',
  },
  {
    id: 'accounting',
    name: 'Hedge Accounting',
    desc: 'IFRS 9 CFH designation: combined vs split — OCI, ineffectiveness, KO aftermath',
    status: 'live',
    note: '',
  },
  {
    id: 'cosa',
    name: 'Chart of Accounts',
    desc: 'Sustainability account tree → framework datapoint mapping',
    status: 'live',
    note: '',
  },
  {
    id: 'materiality',
    name: 'Materiality',
    desc: 'IRO register → double materiality matrix (interactive)',
    status: 'live',
    note: '',
  },
  {
    id: 'metrics',
    name: 'Metrics Entry',
    desc: 'Quantitative metrics → validation rules → approval (mockup)',
    status: 'live',
    note: '',
  },
  {
    id: 'scenario',
    name: 'Scenarios',
    desc: 'Division-level parameters → strategy comparison',
    status: 'live',
    note: '',
  },
] as const

export default function App() {
  const [active, setActive] = useState<string>('decision')
  const mod = MODULES.find((m) => m.id === active)!

  return (
    <SpineProvider>
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">홍</span>
          <div>
            <div className="brand-name">HongERP</div>
            <div className="brand-sub">ESG decision layer</div>
          </div>
        </div>
        <nav>
          {MODULES.map((m) => (
            <button
              key={m.id}
              className={m.id === active ? 'nav-item active' : 'nav-item'}
              onClick={() => setActive(m.id)}
            >
              {m.name}
              <span className={`badge ${m.status}`}>{m.status}</span>
            </button>
          ))}
        </nav>
        <footer className="sidebar-foot">
          v1 · <a href="https://github.com">GitHub</a>
        </footer>
      </aside>

      <main className="content">
        <header>
          <h1>{mod.name}</h1>
          <p className="desc">{mod.desc}</p>
        </header>
        {mod.id === 'decision' ? (
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
