# HongERP — Architecture

This document is the engine room. The [README](../README.md) says what the product shows; this says what it is made of: the layer map, the shared position state, the segregation-of-duties model, the data schema, and the verification chain. Everything below runs client-side — there is no backend.

## 1. The layer map

Four research papers were each reduced to a frozen computational engine; nine screens consume those engines through one shared position state.

```mermaid
flowchart TB
    subgraph P["Research layer (frozen results)"]
        P1["P1 · budget allocation<br/>constrained min-variance"]
        P2["P2 · barrier hedging<br/>jump-diffusion MC surface"]
        P3["P3 · IFRS 9 CFH<br/>designation ledgers"]
        P4["P4 · disclosure & hedging<br/>closed-form equilibrium"]
    end
    subgraph E["Engine layer — src/engine/ (pure functions, no React)"]
        E1["budget.ts"]
        E2["instruments.ts (Black-76)<br/>lattice.ts · quanto.ts<br/>+ precomputed exotic_surface.json"]
        E3["cfh_summary.json<br/>(paper-engine ledger export)"]
        E4["model.ts (Λ, d*, h*)"]
        E5["backtest.ts<br/>(walk-forward, 486 months)"]
    end
    subgraph S["State layer"]
        SP["spine.tsx — shared position state<br/>(publish / read across screens)"]
        ERP["erp.tsx — ledgers & roles<br/>(metrics, blotter, audit trail, closes)"]
    end
    subgraph M["Screens (9 modules)"]
        M1["Materiality"] --> M2["Decision Dashboard"] --> M3["Budget"] --> M4["Instruments / Exotic Desk"] --> M5["Accounting"]
        M6["CoA · Metrics · Report · Scenario · Backtest · Audit trail"]
    end
    P1 --> E1
    P2 --> E2
    P3 --> E3
    P4 --> E4
    E1 & E2 & E3 & E4 & E5 --> M
    M <--> SP
    M <--> ERP
```

Engines are **frozen**: `model.ts` is a line-by-line transcription of the paper's equations, `exotic_surface.json` is precomputed by the paper's own Monte Carlo (`modeling/python/02_delta/export_erp_surface.py`) under the paper calibration. The UI can move *observable state* (spot, FX) but never the calibration. That boundary — live market state on top of frozen research parameters — is deliberate and enforced by construction: the surface is data, not code.

## 2. The position spine (data flow)

One firm-level position is shared by every screen through `src/state/spine.tsx` — a publish/read context. The sidebar order is a rendering of this graph. Labels on the arrows are the actual state fields.

```mermaid
flowchart LR
    MAT["Materiality<br/>(IRO register)"] -- "materialCount → Σ" --> DEC["Disclosure problem<br/>d*, Λ(d*)"]
    DEC -- "dStar · lambdaStar<br/>(the risk price)" --> BUD["Budget<br/>allocator"]
    BUD -- "budgetW1 / budgetW2" --> DESK["Desks<br/>collar · quanto"]
    DESK -- "trades · exoticKo" --> ACC["Hedge accounting<br/>designation"]
    ACC -. "designation mix<br/>(the H2 outcome)" .-> DEC
    DEC -- "dStar (target)" --> MET["Metrics entry"]
```

The loop is the point: the disclosure problem prices residual risk (Λ), every layer downstream trades at that price, and the hedge-accounting election flows back as the outcome variable the disclosure research measures. Each screen renders provenance chips ("BUDGET · allocator split 97.0 / 2.9") so a number's origin is always one glance away.

## 3. Segregation of duties

Four roles gate every state-changing action. The gates are enforced in the reducers, not just hidden in the UI — a disabled button is a courtesy; the dispatch guard is the control.

| Action | Division head | Treasury desk | Audit | CFO |
| --- | :-: | :-: | :-: | :-: |
| Submit a metric (상신) | ✓ | – | – | – |
| Approve / reject (승인·반려) | – | – | ✓ | – |
| Book a trade (체결) | – | ✓ | – | – |
| Designate CFH-A / CFH-B / FVTPL (지정) | – | – | – | ✓ |
| Close a fiscal year (기말 마감) | – | – | – | ✓ |
| Bulk CSV import | ✓ | – | – | – |

No single role can both file a figure and sign it off; nothing reaches the model unsigned. A fiscal-year close locks its period — corrections after close must be booked as new events, never edits to history.

## 4. Data schema

`src/state/erp.tsx` is the ledger layer (client-side; persisted to `localStorage` under a versioned key, `hongerp-v1`).

| Store | Shape | Rules |
| --- | --- | --- |
| `divisions` | id, name, head, model params per division | Scenario edits persist and flow to the Dashboard's division book |
| `metrics` | datapoint, FY, value, submitter, ts, `pending → approved / rejected` | duplicate pending submissions are no-ops; approved values feed d* |
| `trades` | instrument, terms, notional, booked-by, ts, designation | 40-row cap; 5-second duplicate-booking guard; designation is mutable only by the CFO |
| `events` | actor, action, detail, ts | append-only — the audit trail renders this store verbatim |
| `closes` | FY, closedAt, signed-off counts | one close per year, irreversible in-app |

The metric taxonomy (`src/data/taxonomy.ts`) is a hierarchical account tree — 65 datapoints mapped to GRI / KSSB / KCGS / MSCI at the datapoint level — and the IRO register (`src/data/iro.ts`) feeds the double-materiality matrix.

## 5. Verification chain

Every headline number is checked by an independent path before it ships.

| Layer | Check | Where |
| --- | --- | --- |
| Equilibrium engine | closed form vs multi-start numeric minimizer, 200 draws, gap ≤ 3×10⁻⁶ | `scripts/verify-engine.mjs`, CI (`verify.yml`) |
| Collar solver | put–call parity to 1×10⁻¹⁴; zero-cost residual at solver root | `scripts/verify-engine.mjs` |
| Exotic surface | knock-out rate 43.5% vs paper anchor 43.7%; homogeneity rescale for live FX | anchors stored in-file with the surface |
| CFH ledgers | A-vs-B ineffectiveness ratio against the paper engine's export | `scripts/verify-cfh.mjs` |
| Backtest | walk-forward on 486 months of FRED data, monthly auto-refresh | `backtest.yml` + in-browser re-run |
| UI flows | submit → approve → book → designate → reload persistence, end to end | Playwright (`scripts/shot-*.mjs`) |

Market data: `market.yml` (weekday cron) pulls WTI and USD/KRW from FRED, commits a snapshot, and dispatches the Pages deploy — the API key lives in repo secrets and never reaches the client.

## 6. Constraints that shaped the design

- **Client-only.** No backend, no database server: the ledger semantics (append-only trail, period locks, role gates) are implemented in reducers over a persisted store. The point is that governance is a *design property*, not an infrastructure purchase.
- **No chart, state, or CSS frameworks.** Every visualization is hand-built SVG; state is React context; styling is plain CSS with light/dark theming and `prefers-reduced-motion` fallbacks throughout.
- **Two languages, one source of truth.** English strings in the JSX are the keys; the Korean layer (`i18n.ts` + per-layer dictionaries) is a pure dictionary lookup with inline branches only where live numbers interleave.
