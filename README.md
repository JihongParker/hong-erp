# HongERP

An ESG ERP prototype with the **decision layer** incumbent platforms leave empty.
Static SPA (Vite + React + TS) → GitHub Pages.

Grounded in a four-paper research program on one economic position — a Korean
crude-oil importer's joint WTI × USD/KRW exposure. Where incumbent ESG software
treats disclosure as a cost center and stops at reporting, HongERP treats
disclosure as a control variable that lowers the shadow price of residual risk,
Λ(d) = φ + λe^(−kd), and solves the optimal hedge h\* and optimal disclosure d\*
as one problem.

## Modules

| Module | Paper | Status |
|---|---|---|
| Decision Dashboard — d\*, h\* live from the frozen engine, mandated-floor regime | ESG disclosure & hedging | live |
| Chart of Accounts — sustainability account tree → framework datapoint mapping | — | live |
| Materiality — IRO register → double materiality matrix | — | live |
| Metrics Entry — validation rules → approval (mockup) | — | live |
| Scenarios — division-level parameters → strategy comparison | ESG disclosure & hedging | live |
| Hedge Instruments — zero-cost collar (industry standard) · double-KO quanto (research) · forward baseline | Budget allocation · Delta hedging | building |
| Hedge Accounting — IFRS 9 CFH designation, effectiveness, OCI split | IFRS 9 CFH | planned |

## Engine

`src/engine/model.ts` is a frozen transcription of the paper's §3: closed-form
hedge ratios 2Λ(d)Σu = p with KKT corner handling, the voluntary disclosure
fixed point, and the mandate floor d ≥ d̲. Certified against an independent
numerical minimizer on 200 random draws (`scripts/verify-engine.mjs`, worst
objective gap 3×10⁻⁶). Formula changes must come from a new frozen paper
revision — the UI never embeds math of its own.

## Principles

- No imitation of any firm's branding; structures only.
- No backend — all computation in the browser. Auth/DB/approval are mockups.
- Module status (planned/building/live) stays honest.
- Numbers shown are illustrative, never advice.

## Development

```bash
npm install
npm run dev       # local dev server
npm run build     # production build (dist/)
node --experimental-strip-types scripts/verify-engine.mjs   # engine certification
node scripts/shot.mjs <outdir>                              # headless render check
```

Pushing `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`
(currently disabled while the repo is private).
