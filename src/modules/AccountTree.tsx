import { useMemo, useState } from 'react'
import { TAXONOMY, countDatapoints, type Account } from '../data/taxonomy'
import { useT, useLang } from '../i18n'
import './AccountTree.css'

const FRAMEWORK_LABELS = {
  gri: 'GRI',
  kssb: 'KSSB',
  kcgs: 'KCGS',
  msci: 'MSCI',
} as const

export default function AccountTree() {
  const t = useT()
  const [lang] = useLang()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(['E', 'E-01']), // open the Climate category on first paint
  )
  const [selected, setSelected] = useState<Account | null>(
    TAXONOMY[0].categories[0].accounts[0],
  )

  const q = query.trim().toLowerCase()

  // search: filter tree to matching accounts (code, name, datapoint names)
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
            placeholder={t('Search accounts & datapoints')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="cosa-count">
            {lang === 'ko' ? `데이터포인트 ${countDatapoints()}개` : `${countDatapoints()} datapoints`}
          </span>
        </div>

        {filtered.length === 0 && <p className="cosa-empty">{t('No results')}</p>}

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
                    <th>{t('Code')}</th>
                    <th>{t('Datapoint')}</th>
                    <th>{t('Unit')}</th>
                    <th>{t('Framework mapping')}</th>
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
              {t(
                'Demo taxonomy. Mappings are not validated for practice. The point is the structure: hierarchical codes mapped to multiple frameworks at the datapoint level.',
              )}
            </p>
          </>
        ) : (
          <p className="cosa-empty">{t('Select an account on the left')}</p>
        )}
      </div>
    </div>
  )
}
