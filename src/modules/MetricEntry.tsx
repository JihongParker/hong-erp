import { useMemo, useState } from 'react'
import { TAXONOMY, type Datapoint } from '../data/taxonomy'
import './MetricEntry.css'

// 지표 입력 목업 — 상태는 브라우저 메모리뿐이다 (백엔드 없음).
// 보여주려는 것: 입력값이 검증 규칙을 통과해야 결재선에 오르는 흐름.

interface Row {
  year: number
  value: string // 입력 그대로 보관, 검증 시 파싱
  evidence: boolean
}

type Stage = 'draft' | 'review' | 'approved'

const YEARS = [2024, 2025, 2026]

const STAGE_LABELS: Record<Stage, string> = {
  draft: '작성',
  review: '검토',
  approved: '승인',
}

function flatDatapoints(): { dp: Datapoint; path: string }[] {
  const out: { dp: Datapoint; path: string }[] = []
  for (const p of TAXONOMY)
    for (const c of p.categories)
      for (const a of c.accounts)
        for (const dp of a.datapoints)
          out.push({ dp, path: `${p.name} › ${c.name} › ${a.name}` })
  return out
}

const ALL_DPS = flatDatapoints()

interface Violation {
  level: 'error' | 'warn'
  msg: string
}

// 검증 규칙 — 데모용 3종. 실제 제품이라면 datapoint별 규칙 테이블이 된다.
function validate(rows: Row[]): Violation[] {
  const v: Violation[] = []
  const nums = rows.map((r) => (r.value.trim() === '' ? null : Number(r.value)))

  rows.forEach((r, i) => {
    if (r.value.trim() === '') {
      v.push({ level: 'error', msg: `${r.year}년 값이 비어 있음` })
      return
    }
    const n = nums[i]
    if (n === null || Number.isNaN(n))
      v.push({ level: 'error', msg: `${r.year}년 값이 숫자가 아님` })
    else if (n < 0) v.push({ level: 'error', msg: `${r.year}년 값이 음수 — 절대량 지표는 음수 불가` })
    if (!r.evidence) v.push({ level: 'error', msg: `${r.year}년 증빙 미첨부 — 증빙 없는 값은 제출 불가` })
  })

  for (let i = 1; i < rows.length; i++) {
    const prev = nums[i - 1]
    const cur = nums[i]
    if (prev != null && cur != null && !Number.isNaN(prev) && !Number.isNaN(cur) && prev > 0) {
      const chg = (cur - prev) / prev
      if (Math.abs(chg) > 0.5)
        v.push({
          level: 'warn',
          msg: `${rows[i].year}년 값이 전년 대비 ${(chg * 100).toFixed(0)}% 변동 — 사유 소명 필요`,
        })
    }
  }
  return v
}

export default function MetricEntry() {
  const [dpCode, setDpCode] = useState(ALL_DPS[0].dp.code)
  const [rows, setRows] = useState<Row[]>(
    YEARS.map((year) => ({ year, value: '', evidence: false })),
  )
  const [stage, setStage] = useState<Stage>('draft')

  const sel = ALL_DPS.find((d) => d.dp.code === dpCode)!
  const violations = useMemo(() => validate(rows), [rows])
  const errors = violations.filter((v) => v.level === 'error')

  const setRow = (i: number, patch: Partial<Row>) => {
    setStage('draft') // 값이 바뀌면 결재는 처음부터
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  const pickDp = (code: string) => {
    setDpCode(code)
    setRows(YEARS.map((year) => ({ year, value: '', evidence: false })))
    setStage('draft')
  }

  return (
    <div className="me">
      <div className="me-head">
        <label className="me-select">
          데이터포인트
          <select value={dpCode} onChange={(e) => pickDp(e.target.value)}>
            {ALL_DPS.map(({ dp }) => (
              <option key={dp.code} value={dp.code}>
                {dp.code} · {dp.name}
              </option>
            ))}
          </select>
        </label>
        <div className="me-path">
          {sel.path} {sel.dp.unit && <span className="me-unit">단위: {sel.dp.unit}</span>}
        </div>
      </div>

      <div className="me-grid">
        <div className="me-panel">
          <h3>연도별 입력</h3>
          <table>
            <thead>
              <tr>
                <th>연도</th>
                <th>값 {sel.dp.unit && `(${sel.dp.unit})`}</th>
                <th>증빙</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.year}>
                  <td>{r.year}</td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={r.value}
                      placeholder="0"
                      disabled={stage === 'approved'}
                      onChange={(e) => setRow(i, { value: e.target.value })}
                    />
                  </td>
                  <td>
                    <label className="me-evidence">
                      <input
                        type="checkbox"
                        checked={r.evidence}
                        disabled={stage === 'approved'}
                        onChange={(e) => setRow(i, { evidence: e.target.checked })}
                      />
                      첨부됨 (목업)
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="me-validations">
            {violations.length === 0 ? (
              <p className="ok">✓ 검증 규칙 3종 통과</p>
            ) : (
              violations.map((v, i) => (
                <p key={i} className={v.level}>
                  {v.level === 'error' ? '✕' : '△'} {v.msg}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="me-panel">
          <h3>결재</h3>
          <ol className="me-stepper">
            {(['draft', 'review', 'approved'] as Stage[]).map((s, i) => {
              const idx = ['draft', 'review', 'approved'].indexOf(stage)
              const state = i < idx ? 'done' : i === idx ? 'now' : 'todo'
              return (
                <li key={s} className={state}>
                  <span className="step-dot">{i + 1}</span>
                  {STAGE_LABELS[s]}
                </li>
              )
            })}
          </ol>

          {stage === 'draft' && (
            <button
              className="me-btn"
              disabled={errors.length > 0}
              onClick={() => setStage('review')}
            >
              검토 요청
            </button>
          )}
          {stage === 'review' && (
            <div className="me-btnrow">
              <button className="me-btn" onClick={() => setStage('approved')}>
                승인
              </button>
              <button className="me-btn ghost" onClick={() => setStage('draft')}>
                반려
              </button>
            </div>
          )}
          {stage === 'approved' && (
            <p className="me-approved">
              승인 완료 — 값이 잠겼습니다. 수정하려면 새 버전을 작성해야 합니다
              (Audit Trail 개념의 목업).
            </p>
          )}
          {stage === 'draft' && errors.length > 0 && (
            <p className="me-hint">오류 {errors.length}건을 해소해야 검토 요청이 가능합니다.</p>
          )}
        </div>
      </div>

      <p className="me-note">
        검증 규칙 데모 3종: 숫자·음수 검사, 증빙 필수, 전년 대비 ±50% 변동 경고.
        기존 솔루션의 정량 모듈이 하는 일이 정확히 이 층이다 — 홍ERP는 여기서
        멈추지 않고, 승인된 값이 결정 대시보드의 입력이 되도록 연결한다.
      </p>
    </div>
  )
}
