import './Overview.css'

// The landing page: a researcher or recruiter should get the whole idea in
// fifteen seconds — what this is, what it is built on, and what is proven.

const PAPERS = [
  {
    n: 'P1',
    title: 'Optimal WTI–FX hedge ratios under a fixed budget',
    result: 'Vertex optimum (97.0% / 2.9%) reproduced live — budget-exact at ₩45bn',
    module: 'budget',
    moduleName: 'Hedge Budget',
  },
  {
    n: 'P2',
    title: 'Covariance-aware delta hedging of a double-KO quanto',
    result: 'Paper engine surfaces: KO probability anchored 43.5% vs 43.7%',
    module: 'instruments',
    moduleName: 'Hedge Instruments',
  },
  {
    n: 'P3',
    title: 'IFRS 9 cash-flow-hedge accounting: combined vs split',
    result: 'Designation ledgers verbatim: ineffectiveness ₩23.4bn vs ₩6.4bn',
    module: 'accounting',
    moduleName: 'Hedge Accounting',
  },
  {
    n: 'P4',
    title: 'ESG disclosure mandates and corporate hedging',
    result: 'Closed form certified vs independent minimizer, 200 draws, gap ≤3×10⁻⁶',
    module: 'decision',
    moduleName: 'Decision Dashboard',
  },
]

const FLOW = [
  { id: 'materiality', label: 'Materiality', sub: 'risks scored' },
  { id: 'budget', label: 'Budget', sub: 'coverage split' },
  { id: 'instruments', label: 'Instruments', sub: 'collar · exotic' },
  { id: 'accounting', label: 'Accounting', sub: 'IFRS 9 books' },
  { id: 'decision', label: 'Disclosure', sub: 'd* × h*' },
]

export default function Overview({
  onNavigate,
  onStartTour,
}: {
  onNavigate: (id: string) => void
  onStartTour: () => void
}) {
  return (
    <div className="ov">
      <section className="ov-hero">
        <h2 className="rise" style={{ animationDelay: '60ms' }}>
          The decision layer that ESG platforms{' '}
          <span className="ov-accent">leave empty</span>
        </h2>
        <p className="ov-lede rise" style={{ animationDelay: '160ms' }}>
          Most ESG software is a filing cabinet: it collects disclosures, checks
          the boxes, and stops. <strong>HongERP is built like a trading desk.</strong>{' '}
          Give it a company's risk exposures and it works out two things at once —{' '}
          <strong>how much to hedge</strong> and <strong>how much to disclose</strong> —
          because disclosing risk makes carrying it cheaper. Under the hood: the
          actual models from four finance papers on a Korean oil importer's
          WTI × USD/KRW exposure, running live in your browser.
        </p>
        <div className="ov-cta rise" style={{ animationDelay: '240ms' }}>
          <button className="ov-btn big primary" onClick={onStartTour}>
            Take a look
            <span className="ov-btn-sub">guided · no finance needed</span>
          </button>
          <button className="ov-btn big" onClick={() => onNavigate('decision')}>
            Start
            <span className="ov-btn-sub">open the Decision Dashboard</span>
          </button>
        </div>
        <a className="ov-gh rise" style={{ animationDelay: '300ms' }} href="https://github.com/JihongParker/hong-erp" target="_blank" rel="noreferrer">
          Source on GitHub →
        </a>
      </section>

      <section className="ov-flow">
        <h3>The sidebar is a data flow, not a menu</h3>
        <div className="ov-flow-row">
          {FLOW.map((f, i) => (
            <div key={f.id} className="ov-flow-item rise" style={{ animationDelay: `${380 + i * 90}ms` }}>
              <button className="ov-node" onClick={() => onNavigate(f.id)}>
                <span className="ov-node-label">{f.label}</span>
                <span className="ov-node-sub">{f.sub}</span>
              </button>
              {i < FLOW.length - 1 && <span className="ov-arrow">→</span>}
            </div>
          ))}
        </div>
        <p className="ov-flow-note">
          Every screen carries provenance chips: material risks feed the
          exposure parameters, the budget split lands on the instrument desks,
          the exotic desk's live knock-out odds drive the accounting module's
          post-KO exposure — and the disclosure optimum closes the loop.
        </p>
      </section>

      <section>
        <h3>Four papers, four screens</h3>
        <div className="ov-papers">
          {PAPERS.map((p) => (
            <button key={p.n} className="ov-paper" onClick={() => onNavigate(p.module)}>
              <span className="ov-paper-n">{p.n}</span>
              <span className="ov-paper-title">{p.title}</span>
              <span className="ov-paper-result">{p.result}</span>
              <span className="ov-paper-link">{p.moduleName} →</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  )
}
