// ⚠️ 잠정(PROVISIONAL) 엔진 — 논문 수식 동결 전의 임시 구현.
// Park ESG-disclosure 논문의 폐형해 구조를 단순 스칼라 버전으로 옮긴 것으로,
// 논문 개정에서 함수형이 바뀌면 이 파일만 교체한다 (UI는 이 인터페이스만 안다).
//
//   Λ(d) = φ + λ·e^(−kd)          잔존위험 그림자가격
//   d*:  2a·d = k·λ·e^(−kd)·R     공시강도 FOC (이분법으로 풂)
//   h* = clamp(1 − p / (2·Λ(d*)·σ²), 0, 1)   헤지비율 (스칼라 단순화)

export interface DivisionParams {
  name: string
  lambda: number // λ: 페널티 규모
  k: number // 공시의 페널티 감쇠 속도
  a: number // 공시 비용 계수
  phi: number // φ: 기저 위험가격
  R: number // 잔존위험 노출 규모
  sigma: number // σ: 노출 변동성
  p: number // 헤지 프리미엄(비용)
}

export interface DivisionSolution {
  dStar: number
  hStar: number
  lambdaAtD: number // Λ(d*)
  penaltySaved: number // 공시로 줄인 페널티: λR(1 − e^(−kd*))
  discCost: number // 공시 비용: a·d*²
}

export const ENGINE_VERSION = 'provisional-0.1 (논문 동결 전)'

export function lambdaOf(d: number, p: Pick<DivisionParams, 'phi' | 'lambda' | 'k'>): number {
  return p.phi + p.lambda * Math.exp(-p.k * d)
}

// FOC: g(d) = k·λ·e^(−kd)·R − 2a·d, 단조감소 → 이분법
export function solveDStar(p: DivisionParams): number {
  const g = (d: number) => p.k * p.lambda * Math.exp(-p.k * d) * p.R - 2 * p.a * d
  if (g(0) <= 0) return 0 // 공시의 한계편익이 시작부터 비용 이하
  let lo = 0
  let hi = 1
  while (g(hi) > 0 && hi < 1e6) hi *= 2
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (g(mid) > 0) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function solve(p: DivisionParams): DivisionSolution {
  const dStar = solveDStar(p)
  const lam = lambdaOf(dStar, p)
  const raw = 1 - p.p / (2 * lam * p.sigma * p.sigma)
  return {
    dStar,
    hStar: Math.min(1, Math.max(0, raw)),
    lambdaAtD: lam,
    penaltySaved: p.lambda * p.R * (1 - Math.exp(-p.k * dStar)),
    discCost: p.a * dStar * dStar,
  }
}
