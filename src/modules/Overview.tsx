import { useEffect, useRef } from 'react'
import AppPreview from '../components/AppPreview'
import SceneBackground from '../components/SceneBackground'
import { useT, useLang } from '../i18n'
import './Overview.css'

// A scroll-told landing: the headline lives first, then the reader descends
// through the chain of four papers (a droplet travels the spine as they
// scroll), watches the screens move, sees how the modules connect, and lands
// on the two calls to action. Nothing is crammed into one screen.

const PAPERS = [
  {
    n: 'P1',
    title: 'Optimal WTI–FX hedge ratios under a fixed budget',
    plain: 'Given a fixed premium budget, how much of the oil leg and the currency leg should a Korean importer actually cover?',
    result: 'Vertex optimum 97.0% / 2.9% reproduced live, budget-exact at ₩45bn',
    module: 'budget',
    moduleName: 'Hedge Budget',
  },
  {
    n: 'P2',
    title: 'Covariance-aware delta hedging of a double-KO quanto',
    plain: 'Run a dynamic hedge on an exotic barrier option written on that same exposure, then watch where textbook deltas break.',
    result: 'Paper engine surfaces, KO probability anchored 43.5% vs 43.7%',
    module: 'instruments',
    moduleName: 'Hedge Instruments',
  },
  {
    n: 'P3',
    title: 'IFRS 9 cash-flow-hedge accounting: combined vs split',
    plain: 'Book the resulting hedge two legal ways. Same economics, very different earnings.',
    result: 'Designation ledgers verbatim: ineffectiveness ₩23.4bn vs ₩6.4bn',
    module: 'accounting',
    moduleName: 'Hedge Accounting',
  },
  {
    n: 'P4',
    title: 'ESG disclosure mandates and corporate hedging',
    plain: 'Ask what sets the decision to hedge in the first place, and prove disclosure moves it only through the price of risk.',
    result: 'Closed form certified vs independent minimizer, 200 draws, gap ≤3×10⁻⁶',
    module: 'decision',
    moduleName: 'Decision Dashboard',
  },
]

// nodes step from blue (first paper) to sea-green (last), matching the descent
const nodeColor = (i: number, n: number) => {
  const t = n > 1 ? i / (n - 1) : 0
  const a = [0x3f, 0x79, 0xad]
  const b = [0x2e, 0x8b, 0x57]
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * t))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

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
  const chainRef = useRef<HTMLElement | null>(null)
  const t = useT()
  const [lang] = useLang()

  // reveal-on-scroll for anything marked .reveal
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.16 },
    )
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // drive the chain droplet down the spine as the section scrolls through view
  useEffect(() => {
    const sec = chainRef.current
    if (!sec) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = sec.getBoundingClientRect()
        const vh = window.innerHeight
        const p = Math.max(0, Math.min(1, (vh * 0.72 - r.top) / (r.height * 0.8)))
        sec.style.setProperty('--chain', String(p))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="ov">
      <SceneBackground />

      {/* ── 1 · hero ── */}
      <section className="ov-hero">
        <div className="ov-hero-copy">
          <div className="ov-kicker reveal in">HongERP · {t('ESG decision layer')}</div>
          <h2 className="ov-title reveal in">
            {lang === 'ko' ? (
              <>
                ESG 플랫폼이{' '}
                <span className="ov-accent-wrap">
                  <span className="ov-accent">비워 둔</span>
                  <span className="ov-underflow" aria-hidden />
                </span>{' '}
                의사결정 레이어
              </>
            ) : (
              <>
                The decision layer that ESG platforms{' '}
                <span className="ov-accent-wrap">
                  <span className="ov-accent">leave empty</span>
                  <span className="ov-underflow" aria-hidden />
                </span>
              </>
            )}
          </h2>
          <p className="ov-lede reveal in">
            {lang === 'ko' ? (
              <>
                ESG 도구는 기업이 공시하는 내용을 기록하고는 거기서 <strong>멈춘다</strong>.
                HongERP는 그 리스크를 트레이딩 데스크처럼 다룬다. <strong>얼마나 헤지할지</strong>와{' '}
                <strong>얼마나 공시할지</strong>를 함께 계산한다. 리스크를 공시하면 떠안는 비용이
                낮아지므로, 두 결정은 결국 하나다.
              </>
            ) : (
              <>
                ESG tools record what a company discloses, then <strong>stop</strong>.
                HongERP treats that risk like a trading desk: it computes{' '}
                <strong>how much to hedge</strong> and <strong>how much to disclose</strong>.
                Disclosing a risk makes it cheaper to carry, so the two are one decision.
              </>
            )}
          </p>
          <div className="ov-hero-cta reveal in">
            <button className="ov-btn big primary" onClick={() => onNavigate('decision')}>
              {t('Open the app')}
              <span className="ov-btn-sub">{t('go to the Decision Dashboard')}</span>
            </button>
            <button className="ov-btn big" onClick={onStartTour}>
              {t('Take a tour')}
              <span className="ov-btn-sub">{t('guided · no finance needed')}</span>
            </button>
          </div>
          <button className="ov-scrollcue reveal in" onClick={() => chainRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            {t('or follow the chain')} <span className="ov-cue-arrow">↓</span>
          </button>
        </div>
      </section>

      {/* ── 2 · the research chain ── */}
      <section className="ov-chain" ref={chainRef}>
        <div className="ov-chain-head reveal">
          <h3>{t('One position, four papers, one chain.')}</h3>
          <p>
            {t("Four papers, one Korean oil importer's WTI × USD/KRW exposure. Each picks up where the last leaves off.")}
          </p>
        </div>

        <div className="chain-track">
          <div className="chain-spine">
            <span className="chain-fill" />
            <span className="chain-drop" />
          </div>

          {PAPERS.map((p, i) => (
            <article
              key={p.n}
              className="chain-item reveal"
              style={{ ['--node-c' as string]: nodeColor(i, PAPERS.length), ['--i' as string]: i }}
            >
              <span className="chain-node">{p.n}</span>
              <button className="chain-card" onClick={() => onNavigate(p.module)}>
                <span className="chain-title">{t(p.title)}</span>
                <span className="chain-plain">{t(p.plain)}</span>
                <span className="chain-result">{t(p.result)}</span>
                <span className="chain-link">{p.moduleName} →</span>
              </button>
              <span className="ice-bubbles" aria-hidden />
            </article>
          ))}
        </div>

        <p className="chain-note reveal">
          {t('+ two applied notes: KIKO forensics (P5) · the benign vs. the lethal barrier (P6)')}
        </p>
      </section>

      <div className="ov-divider" aria-hidden />

      {/* ── 3 · live screens ── */}
      <section className="ov-live reveal">
        <div className="ov-live-head">
          <h3>{t('And it all moves.')}</h3>
          <p>{t('Drag a dial, the equilibrium recomputes. Flip through, or let them play.')}</p>
        </div>
        <AppPreview />
      </section>

      <div className="ov-divider" aria-hidden />

      {/* ── 4 · data-flow map ── */}
      <section className="ov-flow reveal">
        <h3>{t('The sidebar is a data flow, not a menu.')}</h3>
        <div className="ov-flow-row">
          {FLOW.map((f, i) => (
            <div key={f.id} className="ov-flow-item reveal" style={{ ['--i' as string]: i }}>
              <button className="ov-node" onClick={() => onNavigate(f.id)}>
                <span className="ov-node-label">{t(f.label)}</span>
                <span className="ov-node-sub">{t(f.sub)}</span>
              </button>
              <span className="ice-bubbles" aria-hidden />
              {i < FLOW.length - 1 && <span className="ov-arrow">→</span>}
            </div>
          ))}
        </div>
        <p className="ov-flow-note">
          {t("Risks set the exposure, the budget hits the desks, the desks' knock-out odds drive the books, and disclosure closes the loop.")}
        </p>
      </section>

      <div className="ov-divider" aria-hidden />

      {/* ── 5 · culmination ── */}
      <section className="ov-cta reveal">
        <h3 className="ov-cta-h">{t('See where the decision gets made.')}</h3>
        <div className="ov-cta-btns">
          <button className="ov-btn big primary" onClick={onStartTour}>
            {t('Take a look')}
            <span className="ov-btn-sub">{t('guided · no finance needed')}</span>
          </button>
          <button className="ov-btn big" onClick={() => onNavigate('decision')}>
            {t('Start')}
            <span className="ov-btn-sub">{t('open the Decision Dashboard')}</span>
          </button>
        </div>
        <a className="ov-gh" href="https://github.com/JihongParker/hong-erp" target="_blank" rel="noreferrer">
          {t('Source on GitHub →')}
        </a>
      </section>
    </div>
  )
}
