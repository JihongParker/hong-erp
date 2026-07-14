import { useMemo, useState } from 'react'
import { TAXONOMY, countDatapoints, type Account } from '../data/taxonomy'
import './AccountTree.css'

const FRAMEWORK_LABELS = {
  gri: 'GRI',
  kssb: 'KSSB',
  kcgs: 'KCGS',
  msci: 'MSCI',
} as const

export default function AccountTree() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(['E', 'E-01']), // 첫 화면에서 기후변화 카테고리를 펼쳐 보여준다
  )
  const [selected, setSelected] = useState<Account | null>(
    TAXONOMY[0].categories[0].accounts[0],
  )

  const q = query.trim().toLowerCase()

  // 검색 시: 매칭되는 계정만 남긴 필터된 트리 (코드·이름·datapoint 이름 대상)
  const filtered = useMemo(() => {
    if (!q) return TAXONOMY
    return TAXONOMY.map((p) => ({
      ...p,
      categories: p.categories
        .map((c) => ({
          ...c,
          accounts: c.accounts.filter(
            (a) =>
              a.name.toLowerCase().includes(q) ||
              a.code.toLowerCase().includes(q) ||
              a.datapoints.some(
                (d) =>
                  d.name.toLowerCase().includes(q) ||
                  d.code.toLowerCase().includes(q),
              ),
          ),
        }))
        .filter((c) => c.accounts.length > 0),
    })).filter((p) => p.categories.length > 0)
  }, [q])

  const toggle = (code: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })

  const isOpen = (code: string) => (q ? true : open.has(code))

  return (
    <div className="cosa">
      <div className="cosa-tree">
        <div className="cosa-toolbar">
          <input
            type="search"
            placeholder="계정·데이터포인트 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="cosa-count">{countDatapoints()} datapoints</span>
        </div>

        {filtered.length === 0 && <p className="cosa-empty">검색 결과 없음</p>}

        {filtered.map((pillar) => (
          <div key={pillar.code}>
            <button className="tree-row pillar" onClick={() => toggle(pillar.code)}>
              <span className="chev">{isOpen(pillar.code) ? '▾' : '▸'}</span>
              <span className={`pillar-tag p-${pillar.code}`}>{pillar.code}</span>
              {pillar.name}
            </button>
            {isOpen(pillar.code) &&
              pillar.categories.map((cat) => (
                <div key={cat.code}>
                  <button className="tree-row category" onClick={() => toggle(cat.code)}>
                    <span className="chev">{isOpen(cat.code) ? '▾' : '▸'}</span>
                    <code>{cat.code}</code> {cat.name}
                  </button>
                  {isOpen(cat.code) &&
                    cat.accounts.map((acc) => (
                      <button
                        key={acc.code}
                        className={
                          selected?.code === acc.code
                            ? 'tree-row account selected'
                            : 'tree-row account'
                        }
                        onClick={() => setSelected(acc)}
                      >
                        <code>{acc.code}</code> {acc.name}
                        <span className="dp-count">{acc.datapoints.length}</span>
                      </button>
                    ))}
                </div>
              ))}
          </div>
        ))}
      </div>

      <div className="cosa-detail">
        {selected ? (
          <>
            <h2>
              <code>{selected.code}</code> {selected.name}
            </h2>
            <div className="dp-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>코드</th>
                    <th>데이터포인트</th>
                    <th>단위</th>
                    <th>프레임워크 매핑</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.datapoints.map((d) => (
                    <tr key={d.code}>
                      <td>
                        <code>{d.code}</code>
                      </td>
                      <td>{d.name}</td>
                      <td>{d.unit ?? '—'}</td>
                      <td>
                        <div className="fw-chips">
                          {(
                            Object.keys(FRAMEWORK_LABELS) as Array<
                              keyof typeof FRAMEWORK_LABELS
                            >
                          ).map((k) =>
                            d.frameworks[k] ? (
                              <span key={k} className={`fw-chip fw-${k}`}>
                                {FRAMEWORK_LABELS[k]} {d.frameworks[k]}
                              </span>
                            ) : null,
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="cosa-note">
              데모 taxonomy — 매핑의 실무 정합성은 검증되지 않았다. 구조(계층코드
              → 다중 프레임워크 datapoint 매핑)를 보여주는 것이 목적.
            </p>
          </>
        ) : (
          <p className="cosa-empty">좌측에서 계정을 선택하세요</p>
        )}
      </div>
    </div>
  )
}
