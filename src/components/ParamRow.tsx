// One parameter row: serif-italic math symbol, muted description, filled-track
// slider, and an accent value chip. Shared by every control deck so they read
// and behave identically. A circled "?" after the name opens a plain-language
// explanation of the parameter (hover or click/tap) for readers without a
// finance background.
import { useState } from 'react'
import type { CSSProperties } from 'react'

// keyed by the descriptor that follows the symbol in the label — both the
// English descriptor and its Korean rendering, since ParamRow receives the
// already-translated label
const HELP: Record<string, string> = {
  // decision dashboard / scenario
  'financial vol': 'How much the oil / financial price swings',
  '재무 변동성': '유가·재무 가격이 얼마나 크게 출렁이는지',
  'climate vol': 'How much the climate exposure swings',
  '기후 변동성': '기후 익스포저가 얼마나 크게 출렁이는지',
  correlation: 'How much the two risks move together',
  상관계수: '두 리스크가 얼마나 같이 움직이는지',
  financial: 'Cost to hedge the financial (oil) leg',
  재무: '재무(유가) 레그를 헤지하는 데 드는 비용',
  climate: 'Cost to hedge the climate leg',
  기후: '기후 레그를 헤지하는 데 드는 비용',
  'hedge premium': 'Cost to hedge the financial leg',
  '헤지 프리미엄': '재무 레그를 헤지하는 데 드는 비용',
  'disclosure cost': 'How expensive disclosure is for this firm',
  '공시 비용': '이 기업에 공시가 얼마나 부담스러운지',
  'distress price': 'Baseline price the firm puts on residual risk',
  '디스트레스 가격': '잔여 리스크에 기업이 매기는 기본 가격',
  stringency: 'How strict the disclosure regime is',
  '규제 강도': '공시 규제가 얼마나 엄격한지',
  attenuation: 'How fast disclosure relieves the penalty',
  감쇠: '공시가 페널티를 얼마나 빨리 덜어 주는지',
  'mandated floor': 'Regulator-required minimum disclosure',
  '의무 하한': '규제가 요구하는 최소 공시 수준',
  // instruments desk
  forward: 'Expected future oil price',
  선도: '시장이 보는 미래 유가',
  volatility: 'How much the price swings',
  변동성: '가격이 얼마나 크게 출렁이는지',
  maturity: 'Time until the option expires',
  만기: '옵션이 만료될 때까지 남은 기간',
  rate: 'Risk-free interest rate',
  금리: '무위험 이자율',
  'cap strike': 'Ceiling price the collar locks in',
  '캡 행사가': '칼라가 잠그는 상한 가격',
  'sold sub-floor': 'Strike of the extra written put that funds the lower floor',
  '매도 서브플로어': '낮은 플로어의 재원이 되는 추가 매도 풋의 행사가',
  'sold ceiling': 'Strike of the sold far call — protection ends above it',
  '매도 실링': '매도한 외가격 콜의 행사가 — 그 위로는 보호가 없음',
  // budget / backtest
  budget: 'Total premium you can spend',
  예산: '쓸 수 있는 총 프리미엄',
  'stress WTI': 'Oil price in the stress scenario',
  '스트레스 WTI': '스트레스 시나리오에서의 유가',
  window: 'How many months of past data estimate Σ',
  윈도: 'Σ 추정에 쓰는 과거 데이터 개월 수',
  'per turnover': 'Trading cost charged on each rebalance',
  비용: '리밸런싱 때마다 부과되는 거래 비용',
}

export default function ParamRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  fmt,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  fmt?: (v: number) => string
}) {
  const [sym, ...rest] = label.split(' ')
  const desc = rest.join(' ')
  // render "p_f" / "h_c" with a true subscript so the math reads like a paper
  const [base, subMark] = sym.split('_')
  const fill = `${((value - min) / (max - min)) * 100}%`
  const help = HELP[desc]
  const [helpOpen, setHelpOpen] = useState(false)
  return (
    <label className="param-row">
      <span className="param-name">
        <span className="p-sym">
          {base}
          {subMark && <sub className="p-sub">{subMark}</sub>}
        </span>
        <span className="p-desc">{desc}</span>
        {help && (
          <span className={helpOpen ? 'p-help open' : 'p-help'}>
            <button
              type="button"
              aria-label={`${desc} — ${help}`}
              aria-expanded={helpOpen}
              onClick={(e) => {
                // keep the wrapping <label> from focusing the slider
                e.preventDefault()
                e.stopPropagation()
                setHelpOpen((o) => !o)
              }}
              onBlur={() => setHelpOpen(false)}
            >
              ?
            </button>
            <span className="p-help-tip" role="tooltip">
              {help}
            </span>
          </span>
        )}
      </span>
      <span className="p-track">
        <input
          type="range"
          className="fancy"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={help ? `${desc} — ${help}` : desc}
          style={{ '--f': fill } as CSSProperties}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="p-range">
          <span>{fmt ? fmt(min) : min}</span>
          <span>{fmt ? fmt(max) : max}</span>
        </span>
      </span>
      <span className="p-val">{fmt ? fmt(value) : value.toFixed(2)}</span>
    </label>
  )
}
