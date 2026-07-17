import { useEffect, useRef, useState } from 'react'
import Overview from './modules/Overview'
import AccountTree from './modules/AccountTree'
import Materiality from './modules/Materiality'
import MetricEntry from './modules/MetricEntry'
import DisclosureReport from './modules/DisclosureReport'
import Scenario from './modules/Scenario'
import Dashboard from './modules/Dashboard'
import Instruments from './modules/Instruments'
import Budget from './modules/Budget'
import Accounting from './modules/Accounting'
import Backtest from './modules/Backtest'
import AuditTrail from './modules/AuditTrail'
import { SpineProvider } from './state/spine'
import { ErpProvider, useErp, ROLES, ROLE_LABEL } from './state/erp'
import { ToastProvider } from './components/Toast'
import Palette, { type Command } from './components/Palette'
import { MARKET, marketDate } from './state/market'
import { clearPersistedParams } from './state/persist'
import { useLang, useT, KO_DESC, KO_TOUR, type Lang } from './i18n'
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
      { id: 'decision', name: 'Decision Dashboard', desc: 'Optimal disclosure d* and hedge ratios h*, live from the frozen engine' },
      { id: 'budget', name: 'Hedge Budget', desc: 'Fixed budget → optimal WTI/FX coverage split (constrained minimum variance)' },
      { id: 'instruments', name: 'Hedge Instruments', desc: 'Vanilla library: swap · cap · collar · three-way · seagull (Black-76) + crack spread & FX benchmark · double-KO quanto (research)' },
      { id: 'accounting', name: 'Hedge Accounting', desc: 'IFRS 9 CFH designation: combined vs split (OCI, ineffectiveness, KO aftermath)' },
    ],
  },
  {
    title: 'Reporting layer',
    items: [
      { id: 'cosa', name: 'Chart of Accounts', desc: 'Sustainability account tree → framework datapoint mapping' },
      { id: 'materiality', name: 'Materiality', desc: 'IRO register → double materiality matrix (interactive)' },
      { id: 'metrics', name: 'Metrics Entry', desc: 'Quantitative metrics → validation rules → approval (mockup)' },
      { id: 'report', name: 'Disclosure report', desc: 'ISSB/KSSB four-pillar draft assembled live from approved metrics, the hedge book, and the decision layer' },
    ],
  },
  {
    title: 'What-if',
    items: [
      { id: 'scenario', name: 'Scenarios', desc: 'Division-level parameters → strategy comparison' },
    ],
  },
  {
    title: 'Validation',
    items: [
      { id: 'backtest', name: 'Out-of-sample', desc: 'Walk-forward hedge backtest on 40y of FRED data: realised variance reduction, not alpha' },
      { id: 'audittrail', name: 'Audit trail', desc: 'Append-only event ledger: every submit, approval, booking, and designation' },
    ],
  },
]

const ALL = GROUPS.flatMap((g) => g.items)

// Guided walkthrough — five moves that show the whole system without any
// finance background. Each step lands on a module and says exactly what to drag.
// insTab drives the Hedge Instruments inner tab when the step activates — the
// barrier step must actually open the quanto desk, not ask the reader to.
const TOUR: { module: string; title: string; body: string; target: string; lift?: string; scrollSel?: string; scrollBlock?: ScrollLogicalPosition; insTab?: 'collar' | 'exotic' }[] = [
  {
    module: 'materiality',
    target: '.mat-controls',
    lift: '.mat-grid',
    title: 'Decide what counts',
    body: 'Slide the materiality threshold. Every risk that clears it turns material and lights up the matrix, and the count you land on rides the top of every downstream screen as the exposure the model hedges. This is where the ERP starts.',
  },
  {
    module: 'metrics',
    target: '[data-tour="me-submit"]',
    lift: '[data-tour="me-queue"]',
    title: 'Enter a number, sign it off',
    body: 'A division head files a metric here; it drops into the approval queue on the right for audit to approve. Only approved values set the disclosure intensity d* the decision layer runs on: nothing reaches the model unsigned.',
  },
  {
    module: 'decision',
    target: '.db-params',
    lift: '.db-tiles',
    title: 'Turn up forced disclosure',
    body: 'Drag the mandated floor slider to the right and watch the numbers above. The hedge ratios fall. When a regulator forces a company to disclose more, hedging quietly follows it down.',
  },
  {
    module: 'budget',
    target: '.bg-deck',
    lift: '.bg-tiles',
    title: 'Loosen the budget',
    body: 'Raise the budget slider. Even with far more cash to spend, the split between oil and currency barely moves off 97 / 3: once the budget stops binding, the shape of the market fixes the allocation, not the size of the wallet.',
  },
  {
    module: 'instruments',
    target: '.ins-deck',
    lift: '.ins-tabs, .ins-strat, .ins-tiles',
    scrollSel: '.ins-tabs',
    scrollBlock: 'start',
    insTab: 'collar',
    title: 'Build a free hedge',
    body: 'This is the Vanilla desk (top): five structures refiners actually run, in the strip below. Zero-cost collar is up: raise the cap slider and the desk instantly finds the floor that pays for it, net premium zero. The Quanto desk next door is the research side.',
  },
  {
    module: 'instruments',
    target: '.ins-tabs',
    lift: '.ex-deck',
    insTab: 'exotic',
    title: 'Walk into the barrier',
    body: 'The quanto desk just opened for you. Push the WTI spot slider in the left panel toward the upper barrier: the risk monitor climbs to Critical and the delta starts working backwards — the exact place where textbook methods break.',
  },
  {
    module: 'accounting',
    target: '[data-tour="chips"]',
    title: 'Follow the number',
    body: 'The knock-out odds you just set traveled here by themselves, to the top of the screen. One shared state, every screen connected. That is the whole idea.',
  },
  {
    module: 'backtest',
    target: '.bt-controls',
    lift: '.bt-hero, .bt-table-wrap',
    scrollSel: '.bt-controls',
    scrollBlock: 'start',
    title: 'Prove it out of sample',
    body: 'Everything so far was one snapshot. Here the same hedge is replayed across 40 years of real oil and currency data, month by month, deciding each move using only the past. Nudge any slider and the whole history recomputes, and the hedge still erases about 89% of the swings in the import bill. That is the point: not a bet that makes money, just a hedge that holds up.',
  },
]

// Spotlight overlay: instead of dimming everything and trying to lift the
// highlighted controls above the wash with z-index (which fails whenever the
// target sits inside a stacking context), measure the glow/lift targets and
// cut real holes in the dim layer with an SVG mask. The targets stay at full
// brightness by construction.
function TourSpotlight({ active }: { active: boolean }) {
  const [holes, setHoles] = useState<{ x: number; y: number; w: number; h: number }[]>([])
  useEffect(() => {
    if (!active) {
      setHoles([])
      return
    }
    let raf = 0
    const tick = () => {
      const els = document.querySelectorAll('.tour-glow, .tour-lift')
      const next = Array.from(els).map((el) => {
        const r = el.getBoundingClientRect()
        return { x: r.left - 10, y: r.top - 10, w: r.width + 20, h: r.height + 20 }
      })
      setHoles((prev) =>
        prev.length === next.length &&
        prev.every(
          (p, i) =>
            Math.abs(p.x - next[i].x) < 0.5 &&
            Math.abs(p.y - next[i].y) < 0.5 &&
            Math.abs(p.w - next[i].w) < 0.5 &&
            Math.abs(p.h - next[i].h) < 0.5,
        )
          ? prev
          : next,
      )
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])
  if (!active) return null
  return (
    <svg className="tour-spot" aria-hidden="true">
      <defs>
        <mask id="tour-spot-mask">
          <rect width="100%" height="100%" fill="#fff" />
          {holes.map((h, i) => (
            <rect key={i} x={h.x} y={h.y} width={h.w} height={h.h} rx={16} fill="#000" />
          ))}
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(30, 34, 32, 0.46)" mask="url(#tour-spot-mask)" />
    </svg>
  )
}

// Acting-role selector: who is at the desk. Drives which write actions are
// enabled across the modules — the org chart, made switchable for the demo.
function RoleSwitch() {
  const { role, setRole } = useErp()
  const t = useT()
  return (
    <label className="role-switch">
      <span className="role-switch-label">{t('Acting as')}</span>
      <select
        className="role-switch-select"
        value={role}
        onChange={(e) => setRole(e.target.value as typeof role)}
        title={t('Switch acting role — gates who can submit, approve, book and designate')}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
        ))}
      </select>
    </label>
  )
}

// Guide-language toggle: flips the sidebar module blurbs and the guided-tour
// copy between English and Korean (explanation layer only — banners, charts, and
// numbers stay English). A compact two-button segment under the role selector.
function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const t = useT()
  return (
    <div className="lang-switch" role="group" aria-label={t('Guide language')}>
      {(['en', 'ko'] as const).map((l) => (
        <button
          key={l}
          className={l === lang ? 'lang-btn active' : 'lang-btn'}
          aria-pressed={l === lang}
          onClick={() => setLang(l)}
        >
          {l === 'en' ? 'EN' : '한국어'}
        </button>
      ))}
    </div>
  )
}

function ResetDemo() {
  const { dispatch } = useErp()
  const t = useT()
  return (
    <button
      className="sidebar-reset"
      title={t('Restore the seeded demo ledgers')}
      onClick={() => {
        dispatch({ type: 'reset' })
        clearPersistedParams()
      }}
    >
      {t('Reset demo data (all divisions)')}
    </button>
  )
}

// live count of metrics awaiting audit — only on the Metrics Entry nav item
function PendingBadge({ id }: { id: string }) {
  const { state } = useErp()
  const [lang] = useLang()
  if (id !== 'metrics') return null
  const n = state.metrics.filter((m) => m.status === 'pending').length
  if (n === 0) return null
  return <span className="nav-badge" title={lang === 'ko' ? `검토 대기 ${n}건` : `${n} awaiting review`}>{n}</span>
}

// Command palette wiring. Rendered inside the providers (like ResetDemo) so it
// can reach the ERP dispatch + role setter; navigation and the guided tour are
// passed down from App. Cmd/Ctrl+K toggles it from anywhere on the page.
function CommandK({ go, startTour }: { go: (id: string) => void; startTour: () => void }) {
  const { dispatch, setRole } = useErp()
  const [open, setOpen] = useState(false)
  const t = useT()
  const [lang] = useLang()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const commands: Command[] = [
    // module jumps — every sidebar entry, tagged with its layer
    ...GROUPS.flatMap((g) =>
      g.items.map((m) => ({
        id: `go-${m.id}`,
        label: lang === 'ko' ? `${t(m.name)} 이동` : `Go to ${m.name}`,
        hint: g.title ? t(g.title) : undefined,
        run: () => go(m.id),
      })),
    ),
    { id: 'tour', label: t('Start guided tour'), hint: t('Walkthrough'), run: startTour },
    { id: 'reset', label: t('Reset demo data'), hint: t('All divisions'), run: () => dispatch({ type: 'reset' }) },
    // role switches — same setter the sidebar selector uses
    ...ROLES.map((r) => ({
      id: `role-${r}`,
      label: lang === 'ko' ? `${ROLE_LABEL[r]} 역할로 전환` : `Act as ${ROLE_LABEL[r]}`,
      hint: t('Role'),
      run: () => setRole(r),
    })),
  ]

  return <Palette open={open} onClose={() => setOpen(false)} commands={commands} />
}

export default function App() {
  const [active, setActive] = useState<string>('overview')
  const [tour, setTour] = useState<number | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [lang, setLang] = useLang()
  const t = useT()
  const mod = ALL.find((m) => m.id === active)!

  // on mobile, choosing a screen closes the drawer
  const go = (id: string) => {
    setActive(id)
    setNavOpen(false)
  }

  // the app always opens on the Overview landing. A deep-link hash left in the
  // URL by a previous visit (e.g. #decision) must not drop a fresh load straight
  // into a sub-screen — clear it on mount. In-session navigation still syncs the
  // hash below, so the current screen shows in the URL and back/forward work.
  useEffect(() => {
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search)
    const fromHash = () => {
      const id = window.location.hash.replace('#', '')
      if (id && ALL.some((m) => m.id === id)) setActive(id)
      else if (!id) setActive('overview')
    }
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  useEffect(() => {
    const current = window.location.hash.replace('#', '')
    if (active === 'overview') {
      if (current) history.replaceState(null, '', window.location.pathname + window.location.search)
    } else if (current !== active) {
      history.replaceState(null, '', `#${active}`)
    }
  }, [active])

  // tour dialog: Esc to close, focus moves in on open and is trapped, restored
  // on close (aria-modal announced to screen readers)
  const tourCardRef = useRef<HTMLElement | null>(null)
  // mobile: swipe the open drawer left to close it
  const drawerTouchX = useRef<number | null>(null)
  useEffect(() => {
    if (tour === null) return
    const prevFocus = document.activeElement as HTMLElement | null
    const card = tourCardRef.current
    card?.querySelector<HTMLElement>('button, [href], input, select')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTour(null)
        return
      }
      if (e.key !== 'Tab' || !card) return
      const f = Array.from(card.querySelectorAll<HTMLElement>('button, [href], input, select')).filter(
        (el) => !el.hasAttribute('disabled'),
      )
      if (f.length === 0) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prevFocus?.focus?.()
    }
  }, [tour])

  // spotlight the tour step's control: soft glow + arrow, scrolled into view
  useEffect(() => {
    document.querySelectorAll('.tour-glow').forEach((el) => el.classList.remove('tour-glow'))
    document.querySelectorAll('.tour-lift').forEach((el) => el.classList.remove('tour-lift'))
    if (tour === null) return
    // steps that need a specific Hedge Instruments tab open it themselves —
    // the overlay must never instruct the reader to click something it covers
    if (TOUR[tour].insTab) {
      window.dispatchEvent(new CustomEvent('hongerp-instab', { detail: TOUR[tour].insTab }))
    }
    let tries = 0
    let scrolled = false
    const apply = () => {
      const step = TOUR[tour]
      const el = document.querySelector(step.target)
      if (el && !el.classList.contains('tour-glow')) {
        el.classList.add('tour-glow')
        if (!scrolled) {
          // some steps highlight elements above the glow (tabs, selector); scroll
          // a chosen anchor to the top so every highlighted region stays on-screen
          const anchor = step.scrollSel ? document.querySelector(step.scrollSel) : el
          anchor?.scrollIntoView({ behavior: 'smooth', block: step.scrollBlock ?? 'center' })
          scrolled = true
        }
      }
      // lift may be a comma-separated list of selectors — cut a spotlight hole in each
      if (step.lift) document.querySelectorAll(step.lift).forEach((l) => l.classList.add('tour-lift'))
    }
    const t = setInterval(() => {
      apply()
      if (++tries > 25) clearInterval(t)
    }, 400)
    return () => clearInterval(t)
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
    <ErpProvider>
    <SpineProvider>
    <ToastProvider>
    <a href="#main-content" className="skip-link">{t('Skip to content')}</a>
    <div className={tour !== null ? 'app touring' : 'app'}>

      {/* mobile top bar — brand + hamburger; hidden on desktop */}
      <div className="mobile-bar">
        <button className="brand" onClick={() => go('overview')}>
          <span className="brand-mark">홍</span>
          <span className="brand-name">HongERP</span>
        </button>
        <button
          className="nav-toggle"
          aria-label={navOpen ? t('Close menu') : t('Open menu')}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((v) => !v)}
        >
          <span className={navOpen ? 'nav-burger open' : 'nav-burger'} />
        </button>
      </div>
      {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} />}

      <aside
        className={navOpen ? 'sidebar open' : 'sidebar'}
        onTouchStart={(e) => { drawerTouchX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (drawerTouchX.current !== null && e.changedTouches[0].clientX - drawerTouchX.current < -55) setNavOpen(false)
          drawerTouchX.current = null
        }}
      >
        <button className="brand brand-desktop" onClick={() => go('overview')}>
          <span className="brand-mark">홍</span>
          <div>
            <div className="brand-name">HongERP</div>
            <div className="brand-sub">{t('ESG decision layer')}</div>
          </div>
        </button>
        <RoleSwitch />
        <LangSwitch lang={lang} setLang={setLang} />
        <nav>
          {GROUPS.map((g) => (
            <div key={g.title ?? 'top'} className="nav-group">
              {g.title && <div className="nav-group-title">{t(g.title)}</div>}
              {g.items.map((m) => (
                <button
                  key={m.id}
                  className={m.id === active ? 'nav-item active' : 'nav-item'}
                  onClick={() => go(m.id)}
                >
                  {t(m.name)}
                  <PendingBadge id={m.id} />
                </button>
              ))}
            </div>
          ))}
        </nav>
        <footer className="sidebar-foot">
          <div className="sidebar-market" title={lang === 'ko' ? `FRED 스냅샷 · GitHub Actions가 평일마다 갱신 · ${MARKET.fetchedAt} 취득` : `FRED snapshot · refreshed weekdays by GitHub Actions · fetched ${MARKET.fetchedAt}`}>
            <span className="market-dot" /> WTI <strong>${MARKET.wti.value.toFixed(2)}</strong> · ₩
            <strong>{MARKET.usdkrw.value.toLocaleString()}</strong>
            <span className="market-date">FRED {marketDate}</span>
          </div>
          <ResetDemo />
          <div className="sidebar-cmdk"><kbd className="kbd">⌘K</kbd> {t('commands')}</div>
          v1 · <a href="https://github.com/JihongParker/hong-erp" target="_blank" rel="noreferrer">GitHub</a>
        </footer>
      </aside>

      <main className="content" id="main-content">
        {mod.id !== 'overview' && (
          <header>
            <h1>{t(mod.name)}</h1>
            {mod.desc && (
              <p className="mod-desc">{lang === 'ko' ? KO_DESC[mod.id] ?? mod.desc : mod.desc}</p>
            )}
          </header>
        )}
        <div key={mod.id} className={mod.id === 'overview' ? undefined : 'screen'}>
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
        ) : mod.id === 'report' ? (
          <DisclosureReport />
        ) : mod.id === 'backtest' ? (
          <Backtest />
        ) : mod.id === 'audittrail' ? (
          <AuditTrail />
        ) : (
          <Scenario />
        )}
        </div>
      </main>

      <CommandK go={go} startTour={startTour} />
      <TourSpotlight active={tour !== null} />
      {tour !== null && (
        <aside className="tour-card" role="dialog" aria-modal="true" aria-label={t('Guided tour')} ref={tourCardRef}>
          <div className="tour-head">
            <span className="tour-step">{lang === 'ko' ? `${tour + 1} / ${TOUR.length} 단계` : `Step ${tour + 1} / ${TOUR.length}`}</span>
            <button className="tour-close" onClick={() => setTour(null)} aria-label={t('End tour')}>✕</button>
          </div>
          <h4>{lang === 'ko' ? KO_TOUR[tour]?.title ?? TOUR[tour].title : TOUR[tour].title}</h4>
          <p>{lang === 'ko' ? KO_TOUR[tour]?.body ?? TOUR[tour].body : TOUR[tour].body}</p>
          <div className="tour-actions">
            {tour > 0 && (
              <button className="tour-btn ghost" onClick={() => stepTour(-1)}>{t('← Back')}</button>
            )}
            <button className="tour-btn" onClick={() => stepTour(1)}>
              {tour === TOUR.length - 1 ? t('Finish') : t('Next →')}
            </button>
          </div>
        </aside>
      )}
    </div>
    </ToastProvider>
    </SpineProvider>
    </ErpProvider>
  )
}
