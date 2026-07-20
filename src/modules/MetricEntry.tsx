import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { TAXONOMY, type Datapoint } from '../data/taxonomy'
import { Chip, useSpine } from '../state/spine'
import { useErp } from '../state/erp'
import Activity from '../components/Activity'
import { useToast } from '../components/Toast'
import { useT, useLang } from '../i18n'
import { agoKo } from '../i18n.ko-reporting'
import './MetricEntry.css'

// Division-level metrics operations: submit → validation → approval queue →
// ledger. All records live in the ERP store (seeded history + your actions),
// and every step lands in the audit trail.

function flatDatapoints(): { dp: Datapoint; path: string }[] {
  const out: { dp: Datapoint; path: string }[] = []
  for (const p of TAXONOMY)
    for (const c of p.categories)
      for (const a of c.accounts)
        for (const dp of a.datapoints) out.push({ dp, path: `${p.name} › ${c.name} › ${a.name}` })
  return out
}
const ALL_DPS = flatDatapoints()
// code → datapoint, for validating CSV rows against the frozen taxonomy
const DP_BY_CODE = new Map(ALL_DPS.map(({ dp }) => [dp.code, dp]))

const STATUS_LABEL = { pending: 'Pending review', approved: 'Approved', rejected: 'Rejected' } as const

export default function MetricEntry() {
  const spine = useSpine()
  const { state, dispatch, role } = useErp()
  const t = useT()
  const [lang] = useLang()
  const [division, setDivision] = useState(state.divisions[0].id)
  const [dpCode, setDpCode] = useState(ALL_DPS[0].dp.code)
  const [year, setYear] = useState(2026)
  const [value, setValue] = useState('')
  const [evidence, setEvidence] = useState(false)
  const toast = useToast()
  // queue items collapse+fade out before they leave the ledger, not snap away
  const [leaving, setLeaving] = useState<Record<string, boolean>>({})
  const canReview = role === 'audit'
  const fileRef = useRef<HTMLInputElement>(null)
  const closedYears = useMemo(() => new Set(state.closes.map((c) => c.year)), [state.closes])
  const isClosed = (y: number) => closedYears.has(y)
  const review = (id: string, status: 'approved' | 'rejected') => {
    if (leaving[id] || !canReview) return
    const m = state.metrics.find((x) => x.id === id)
    if (m && closedYears.has(m.year)) return // closed FY — adjustments must be new events
    setLeaving((l) => ({ ...l, [id]: true }))
    setTimeout(() => {
      dispatch({ type: 'reviewMetric', id, status, actor: 'J. Kim (audit)' })
      setLeaving((l) => {
        const n = { ...l }
        delete n[id]
        return n
      })
    }, 240)
  }

  const div = state.divisions.find((d) => d.id === division)!
  const sel = ALL_DPS.find((d) => d.dp.code === dpCode)!
  const numeric = value.trim() !== '' && !Number.isNaN(Number(value)) && Number(value) >= 0
  const canSubmit = numeric && evidence

  const pending = state.metrics.filter((m) => m.status === 'pending')
  const ledger = useMemo(
    () => state.metrics.filter((m) => m.division === division).slice(0, 8),
    [state.metrics, division],
  )

  const submit = () => {
    if (isClosed(year)) return
    dispatch({
      type: 'submitMetric',
      rec: {
        division,
        datapoint: sel.dp.code,
        name: sel.dp.name,
        year,
        value: Number(value),
        unit: sel.dp.unit ?? '',
        by: div.head,
      },
    })
    setValue('')
    setEvidence(false)
    toast(
      lang === 'ko'
        ? `상신 완료 — ${sel.dp.name} FY${year} 결재함 등록`
        : `Submitted — ${sel.dp.name} FY${year} is now in the approval queue`,
    )
  }

  const closePeriod = () => {
    if (role !== 'cfo' || isClosed(year)) return
    dispatch({ type: 'closePeriod', year })
    toast(
      lang === 'ko'
        ? `FY${year} 마감 완료. 이후 기표 불가`
        : `FY${year} closed — the period is locked to new events`,
    )
  }

  // ── CSV: file-API only, no libraries ──
  const downloadCsv = (filename: string, text: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  // quote only when a cell would otherwise break the row (export side)
  const csvCell = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const downloadTemplate = () =>
    downloadCsv(
      'metrics-template.csv',
      ['division,datapoint,year,value', 'refining,E-01-01-01,2026,1850000', 'materials,E-01-03-02,2026,7.5'].join('\n') + '\n',
    )

  // simple line-split parse — no quoted fields. Each row must name a real
  // division id and taxonomy code, an open FY in 2024–2026, and a non-negative
  // value; everything else is skipped and tallied.
  const importCsv = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
    let imported = 0
    let skipped = 0
    for (const line of lines) {
      const cols = line.split(',').map((c) => c.trim())
      if (cols[0]?.toLowerCase() === 'division' && cols[1]?.toLowerCase() === 'datapoint') continue // header
      const [divId, code, yearStr, valStr] = cols
      const div = state.divisions.find((d) => d.id === divId)
      const dp = DP_BY_CODE.get(code)
      const y = Number(yearStr)
      const val = Number(valStr)
      const yearOk = Number.isInteger(y) && y >= 2024 && y <= 2026 && !closedYears.has(y)
      const valOk = (valStr ?? '') !== '' && !Number.isNaN(val) && val >= 0
      if (cols.length < 4 || !div || !dp || !yearOk || !valOk) {
        skipped++
        continue
      }
      dispatch({
        type: 'submitMetric',
        rec: { division: div.id, datapoint: dp.code, name: dp.name, year: y, value: val, unit: dp.unit ?? '', by: div.head },
      })
      imported++
    }
    toast(
      lang === 'ko'
        ? `${imported}건 가져옴 · ${skipped}행 건너뜀`
        : `Imported ${imported} submissions · skipped ${skipped} rows`,
    )
  }

  const onImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // let the same file be re-selected later
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => importCsv(String(reader.result ?? ''))
    reader.readAsText(f)
  }

  const exportApproved = () => {
    const approved = state.metrics.filter((m) => m.status === 'approved')
    const header = 'division,datapoint,name,year,value,unit,by'
    const rows = approved.map((m) =>
      [m.division, m.datapoint, csvCell(m.name), m.year, m.value, csvCell(m.unit), csvCell(m.by)].join(','),
    )
    downloadCsv('metrics-approved.csv', [header, ...rows].join('\n') + '\n')
  }

  return (
    <div className="me">
      <div className="spine-row">
        <Chip from={lang === 'ko' ? '의사결정 대시보드' : 'Decision Dashboard'}>
          {lang === 'ko' ? (
            <>승인 값이 공시 강도에 반영 — 현재 목표 d* = <strong>{spine.dStar.toFixed(2)}</strong></>
          ) : (
            <>approved values feed disclosure intensity — current target d* = <strong>{spine.dStar.toFixed(2)}</strong></>
          )}
        </Chip>
        <Chip from={lang === 'ko' ? '감사 추적' : 'Audit trail'}>
          {lang === 'ko' ? (
            <>{state.divisions.length}개 사업부에서 상신 <strong>{pending.length}</strong>건 결재 대기 중</>
          ) : (
            <><strong>{pending.length}</strong> submissions awaiting review across {state.divisions.length} divisions</>
          )}
        </Chip>
      </div>

      <div className="me-closehead">
        <button
          className="me-btn"
          disabled={role !== 'cfo' || isClosed(year)}
          title={
            role !== 'cfo'
              ? lang === 'ko'
                ? '기말 마감하려면 CFO 역할로 전환'
                : 'Switch to the CFO role to close the period'
              : isClosed(year)
                ? lang === 'ko'
                  ? `FY${year} 이미 마감됨`
                  : `FY${year} is already closed`
                : lang === 'ko'
                  ? `FY${year} 잠금: 승인 지표와 체결된 딜 동결`
                  : `Lock FY${year}: freeze its approved metrics and trades on book`
          }
          onClick={closePeriod}
        >
          {lang === 'ko' ? `FY${year} 마감` : `Close FY${year}`}
        </button>
        {[...state.closes]
          .sort((a, b) => a.year - b.year)
          .map((c) => (
            <span
              key={c.year}
              className="me-lock"
              title={
                lang === 'ko'
                  ? `${new Date(c.closedAt).toLocaleString()} 잠금 · 승인 ${c.approved}건, 체결 딜 ${c.tradeCount}건`
                  : `Locked ${new Date(c.closedAt).toLocaleString()} · ${c.approved} approved, ${c.tradeCount} trades on book`
              }
            >
              {lang === 'ko'
                ? `FY${c.year} 마감 · ${new Date(c.closedAt).toLocaleDateString()}`
                : `FY${c.year} closed · ${new Date(c.closedAt).toLocaleDateString()}`}
            </span>
          ))}
      </div>

      <div className="me-grid">
        {/* ── submit ── */}
        <div className="me-panel" data-tour="me-submit">
          <h3>{t('New submission')}</h3>
          <div className="me-tabs">
            {state.divisions.map((d) => (
              <button key={d.id} className={d.id === division ? 'me-tab active' : 'me-tab'} onClick={() => setDivision(d.id)}>
                {t(d.name)}
              </button>
            ))}
          </div>
          <label className="me-select">
            {t('Datapoint')}
            <select value={dpCode} onChange={(e) => setDpCode(e.target.value)}>
              {ALL_DPS.map(({ dp }) => (
                <option key={dp.code} value={dp.code}>
                  {dp.code} · {dp.name}
                </option>
              ))}
            </select>
          </label>
          <p className="me-path">
            {sel.path} {sel.dp.unit && <span className="me-unit">{lang === 'ko' ? '단위: ' : 'Unit: '}{t(sel.dp.unit)}</span>}
          </p>
          <div className="me-formrow">
            <label className="me-inline">
              {t('Year')}
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[2024, 2025, 2026].map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="me-inline">
              {t('Value')}
              <input
                type="text"
                inputMode="decimal"
                value={value}
                placeholder="0"
                aria-invalid={value.trim() !== '' && !numeric}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
            <label className="me-evidence">
              <input type="checkbox" checked={evidence} onChange={(e) => setEvidence(e.target.checked)} />
              {t('Evidence attached (mockup)')}
            </label>
          </div>
          {!numeric && value.trim() !== '' && <p className="me-err">{t('✕ Value must be a non-negative number')}</p>}
          <button
            className="me-btn"
            disabled={!canSubmit || role !== 'division' || isClosed(year)}
            title={
              isClosed(year)
                ? lang === 'ko'
                  ? `FY${year} 마감됨`
                  : `FY${year} is closed`
                : role !== 'division'
                  ? lang === 'ko'
                    ? '상신하려면 사업부장 역할로 전환'
                    : 'Switch to the Division head role to submit'
                  : !canSubmit
                    ? !numeric
                      ? lang === 'ko'
                        ? '0 이상의 숫자 입력'
                        : 'Enter a non-negative number'
                      : lang === 'ko'
                        ? '상신하려면 증빙 첨부'
                        : 'Attach evidence to submit'
                    : undefined
            }
            onClick={submit}
          >
            {t('Submit for review')}
          </button>
          <p className="me-note">
            {lang === 'ko' ? (
              <>
                {div.head}({t(div.name)}) 명의로 상신합니다. 승인된 값은 해당
                사업부의 익스포저 파라미터와 전사 공시 강도에 반영됩니다.
              </>
            ) : (
              <>
                Submitted as {div.head} ({div.name}). Approved values feed the
                division's exposure parameters and the firm's disclosure intensity.
              </>
            )}
          </p>
          <div className="me-csvrow">
            <button
              className="me-btn ghost sm"
              disabled={role !== 'division'}
              title={
                role !== 'division'
                  ? t('Switch to the Division head role to import')
                  : t('Bulk submit from a CSV (division,datapoint,year,value) — simple CSV, no quoted fields')
              }
              onClick={() => fileRef.current?.click()}
            >
              {t('Import CSV')}
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onImportFile} />
            <button type="button" className="me-link" onClick={downloadTemplate}>
              {t('Download template')}
            </button>
          </div>
        </div>

        {/* ── approval queue + heartbeat ── */}
        <div className="me-panel" data-tour="me-queue">
          <h3>
            {t('Approval queue')} <span className="me-count">{pending.length}</span>
          </h3>
          {pending.length === 0 ? (
            <p className="me-empty">{t('Queue is clear.')}</p>
          ) : (
            pending.map((m) => {
              const qClosed = isClosed(m.year)
              return (
              <div key={m.id} className={leaving[m.id] ? 'me-qslot leaving' : 'me-qslot'}>
                <div className="me-qitem">
                  <div className="me-qbody">
                    <strong>{t(state.divisions.find((d) => d.id === m.division)?.name ?? '')}</strong> · {m.name} FY{m.year}
                    <span className="me-qval">
                      {m.value.toLocaleString()} {t(m.unit)}
                    </span>
                    <span className="me-qmeta">
                      {lang === 'ko' ? `상신: ${m.by}` : `by ${m.by}`} · {agoKo(m.ts, lang)}
                    </span>
                  </div>
                  <div className="me-qact">
                    <button
                      className="me-btn sm"
                      disabled={!canReview || qClosed}
                      title={qClosed ? t('FY closed — adjustments must be new events') : !canReview ? t('Switch to the Audit role to approve') : undefined}
                      onClick={() => review(m.id, 'approved')}
                    >
                      {t('Approve')}
                    </button>
                    <button
                      className="me-btn sm ghost"
                      disabled={!canReview || qClosed}
                      title={qClosed ? t('FY closed — adjustments must be new events') : !canReview ? t('Switch to the Audit role to reject') : undefined}
                      onClick={() => review(m.id, 'rejected')}
                    >
                      {t('Reject')}
                    </button>
                  </div>
                </div>
              </div>
              )
            })
          )}
          <h3 className="me-h3gap">{t('Recent activity')}</h3>
          <Activity limit={5} />
        </div>

        {/* ── division ledger: compact list, fits its column ── */}
        <div className="me-panel">
          <div className="me-panelhead">
            <h3>{lang === 'ko' ? `${t(div.name)} 상신 원장` : `${div.name} submission ledger`}</h3>
            <button
              className="me-btn ghost sm"
              title={t('Download every approved metric (all divisions) as CSV')}
              onClick={exportApproved}
            >
              {t('Export CSV')}
            </button>
          </div>
          <div className="me-ledger">
            {ledger.map((m) => (
              <div key={m.id} className="me-lrow">
                <div className="me-lmain">
                  <span className="me-lname">{m.name}</span>
                  <span className={`me-status ${m.status}`}>{t(STATUS_LABEL[m.status])}</span>
                </div>
                <div className="me-lmeta">
                  <span className="me-lval">
                    {m.value.toLocaleString()} {t(m.unit)}
                  </span>
                  <span>FY{m.year} · {m.by} · {agoKo(m.ts, lang)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
