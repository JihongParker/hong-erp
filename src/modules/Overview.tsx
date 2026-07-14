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

export default function Overview({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <div className="ov">
      <section className="ov-hero">
        <p className="ov-kicker">One position · four papers · one operating system</p>
        <h2>
          The decision layer that ESG platforms{' '}
          <span className="ov-accent">leave empty</span>
        </h2>
        <p className="ov-lede">
          Incumbent ESG software collects disclosures and stops. HongERP treats
          disclosure as a <strong>control variable</strong> that lowers the
          shadow price of residual risk, Λ(d) = φ + λe<sup>−kd</sup>, and solves
          the optimal hedge and the optimal disclosure as{' '}
          <strong>one problem</strong> — for a Korean crude-oil importer's joint
          WTI × USD/KRW exposure, on the actual engines of a four-paper research
          program.
        </p>
        <div className="ov-cta">
          <button className="ov-btn primary" onClick={() => onNavigate('decision')}>
            Open the Decision Dashboard →
          </button>
          <a className="ov-btn" href="https://github.com/JihongParker/hong-erp" target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </div>
      </section>

      <section className="ov-flow">
        <h3>The sidebar is a data flow, not a menu</h3>
        <div className="ov-flow-row">
          {FLOW.map((f, i) => (
            <div key={f.id} className="ov-flow-item">
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

      <section className="ov-proof">
        <h3>Nothing is invented</h3>
        <div className="ov-proof-row">
          <div className="ov-proof-item">
            <span className="ov-proof-big">3×10⁻⁶</span>
            worst gap, closed form vs independent minimizer (200 random draws)
          </div>
          <div className="ov-proof-item">
            <span className="ov-proof-big">43.5% ≈ 43.7%</span>
            exotic surface KO rate vs the paper's own European engine
          </div>
          <div className="ov-proof-item">
            <span className="ov-proof-big">10⁻¹⁴</span>
            Black-76 put–call parity residual on the collar desk
          </div>
          <div className="ov-proof-item">
            <span className="ov-proof-big">(0.9705, 0.0295)</span>
            the budget paper's vertex optimum, reproduced at defaults
          </div>
        </div>
        <p className="ov-flow-note">
          Every number on every screen is anchored to the papers' own engines —
          frozen formula transcriptions, precomputed simulation surfaces, or the
          papers' published ledgers. Values are illustrative, never advice.
        </p>
      </section>
    </div>
  )
}
