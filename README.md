<div align="center">

# HongERP

### The decision layer that ESG platforms leave empty.

Most ESG software records what a company discloses and stops there. **HongERP treats that risk like a trading desk** — give it a company's exposures and it computes two answers at once: *how much to hedge* and *how much to disclose*. It runs entirely in the browser, with the financial models solving live as you drag a dial.

**[▶ Open the live app](https://jihongparker.github.io/hong-erp/)**  ·  no login, no finance background needed

![HongERP overview](docs/overview.png)

</div>

---

## Why this is worth a look

This is a **single-page product**, built end to end — design, front-end engineering, financial modelling, live data, and CI — with no backend and no UI framework beyond React. Everything you see is computed on the client from first principles.

- **Real models, running live.** Nine modules, each solving an actual optimization in the browser: constrained minimum-variance hedge allocation, a Black-76 zero-cost collar solver, an IFRS 9 hedge-accounting ledger, and a disclosure–hedging equilibrium. Move a slider and the answer recomputes at 60 fps.
- **One connected system.** A shared position state (the "spine") links every screen, so the sidebar is a genuine data flow: material risks feed the exposure parameters, the budget split lands on the instrument desk, the exotic desk's knock-out odds drive the accounting module. Each screen shows *where every number came from*.
- **Live market data, zero backend.** A scheduled GitHub Action pulls WTI and USD/KRW from the U.S. Federal Reserve (FRED) each weekday and commits a snapshot; the app opens on the latest close. No server, no exposed keys.
- **Verified numerics.** Every headline figure is checked against an independent solver in the build — the equilibrium engine agrees with a multi-start minimizer to 1e-8; the exotic-option surfaces reproduce the reference knock-out rate to 0.5%.
- **Designed, not just built.** A hand-drawn animated hero (HTML-canvas surf, a working port, scroll-driven colour), a guided tour, full light/dark theming, responsive down to mobile, and `prefers-reduced-motion` support throughout.

## What's inside

| Module | What it does |
| --- | --- |
| **Decision Dashboard** | Optimal disclosure *d\** and hedge ratios *h\** solved live; shows how forced disclosure crowds out hedging |
| **Hedge Budget** | Splits a fixed premium budget across the oil and currency legs (constrained min-variance) |
| **Hedge Instruments** | Zero-cost collar desk (Black-76) and a double-knock-out quanto barrier monitor |
| **Hedge Accounting** | IFRS 9 cash-flow-hedge designation: combined vs split, with OCI and ineffectiveness ledgers |
| **Materiality** | Interactive double-materiality matrix from an IRO register |
| **Metrics Entry** | Submit → validate → approval queue → ledger, with an audit trail |
| **Chart of Accounts** | Sustainability account tree mapped to reporting-framework datapoints |
| **Scenarios** | Division-level parameters and side-by-side strategy comparison |

<div align="center">

![Decision Dashboard](docs/dashboard.png)

</div>

## Tech stack

**React 18** · **TypeScript** · **Vite** · SVG + HTML **Canvas** for the visuals · React Context for state · `localStorage` persistence · **GitHub Actions** for the market-data pipeline and Pages deploy · **Playwright** for render checks. No chart library, no state library, no CSS framework — the visualizations, animations, and layout are all hand-built.

## Engineering notes

- **Client-only architecture.** All computation lives in `src/engine/*`; the UI is a thin, reactive layer over pure functions.
- **Numerical trust.** `scripts/verify-engine.mjs` re-solves the equilibrium against an independent optimizer; precomputed option surfaces carry their calibration and anchor checks in-file.
- **Automated market data.** `.github/workflows/market.yml` runs on a weekday cron, fetches FRED series, commits the snapshot, and triggers the Pages deploy — a small, real data pipeline with the secret held server-side.
- **Accessibility & polish.** Semantic markup, keyboard-reachable controls, theme-aware colour with validated contrast, and reduced-motion fallbacks for every animation.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
```

## Grounding

The models aren't decorative. Each module implements the actual result from a four-part research program on one economic position — a Korean crude-oil importer's joint WTI × USD/KRW exposure — spanning budget allocation, dynamic hedging of an exotic barrier option, IFRS 9 hedge accounting, and the effect of mandatory ESG disclosure on hedging. The product's job is to make those results something you can *touch*. Figures shown are illustrative, and no real firm's branding is used.

<div align="center">
<br>
<a href="https://jihongparker.github.io/hong-erp/"><b>Open the live app →</b></a>
</div>
