import { createContext, useContext, useState, type ReactNode } from 'react'
import { solveEquilibrium } from '../engine/model'
import { solveBudget, P1_INPUTS } from '../engine/budget'
import { IRO_ITEMS } from '../data/iro'

// The position spine — one firm-level state shared by every module, so the
// sidebar order becomes an actual data flow:
//   Materiality (risks) → Decision Dashboard (d*) → Budget (split) →
//   Instruments (coverage) → Exotic Desk (KO odds) → Accounting (books).
// Modules PUBLISH what they decide and READ what upstream modules decided.

export interface Spine {
  materialCount: number
  materialityThreshold: number
  dStar: number
  floorBinding: boolean
  budgetW1: number
  budgetW2: number
  budgetRegime: 'european' | 'american'
  exoticKo: number
  exoticSpot: number
  publish: (patch: Partial<Omit<Spine, 'publish'>>) => void
}

// initial values = each module's own defaults, so chips are meaningful
// before the user has visited the source module
const DEFAULT_MAT_THRESHOLD = 3.5
const initialMaterial = IRO_ITEMS.filter(
  (i) => i.financial >= DEFAULT_MAT_THRESHOLD || i.impact >= DEFAULT_MAT_THRESHOLD,
).length

const eq0 = solveEquilibrium({
  sigmaF: 1.0, sigmaC: 0.6, rho: 0.3, pF: 3.0, pC: 1.8,
  a: 0.4, phi: 0.5, lambda: 6, k: 0.8, dFloor: 0,
})

const budget0 = solveBudget({
  regime: 'european', B: P1_INPUTS.B, stressWTI: 113, stressKRW: 1550,
})

const SpineContext = createContext<Spine | null>(null)

export function SpineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<Spine, 'publish'>>({
    materialCount: initialMaterial,
    materialityThreshold: DEFAULT_MAT_THRESHOLD,
    dStar: eq0.dStar,
    floorBinding: false,
    budgetW1: budget0.w1,
    budgetW2: budget0.w2,
    budgetRegime: 'european',
    exoticKo: 0.435,
    exoticSpot: 78.94,
  })
  const publish = (patch: Partial<Omit<Spine, 'publish'>>) =>
    setState((prev) => ({ ...prev, ...patch }))
  return <SpineContext.Provider value={{ ...state, publish }}>{children}</SpineContext.Provider>
}

export function useSpine(): Spine {
  const ctx = useContext(SpineContext)
  if (!ctx) throw new Error('useSpine outside SpineProvider')
  return ctx
}

export function Chip({ from, children }: { from: string; children: ReactNode }) {
  return (
    <span className="spine-chip">
      <span className="spine-from">{from}</span> <span className="spine-body">{children}</span>
    </span>
  )
}
