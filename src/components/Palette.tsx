import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../i18n'
import './Palette.css'

// A command the palette can run. `hint` is the muted right-aligned tag
// (group name for a jump, "Role" for a role switch, etc.).
export interface Command {
  id: string
  label: string
  hint?: string
  run: () => void
}

// Self-contained Cmd/Ctrl+K command palette — no library. The parent owns the
// open flag and the command list; this component owns the query, the keyboard
// selection, and focus handling. Filter is a lowercase substring match on the
// label with startsWith results floated to the top (stable within each rank).
export default function Palette({
  open,
  onClose,
  commands,
}: {
  open: boolean
  onClose: () => void
  commands: Command[]
}) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const prevFocus = useRef<HTMLElement | null>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands
      .filter((c) => c.label.toLowerCase().includes(q))
      .sort((a, b) => {
        const ar = a.label.toLowerCase().startsWith(q) ? 0 : 1
        const br = b.label.toLowerCase().startsWith(q) ? 0 : 1
        return ar - br
      })
  }, [query, commands])

  // selection clamped into range — safe even if results shrink under the cursor
  const sel = results.length ? Math.min(active, results.length - 1) : -1

  // latest nav state + onClose kept in a ref so the key listener binds once per
  // open, not on every keystroke
  const navRef = useRef<{ results: Command[]; sel: number; onClose: () => void }>({ results, sel, onClose })
  navRef.current = { results, sel, onClose }

  // on open: remember the outgoing focus, reset the query/cursor, focus input.
  // on close (effect cleanup): restore focus to wherever it was.
  useEffect(() => {
    if (!open) return
    prevFocus.current = document.activeElement as HTMLElement | null
    setQuery('')
    setActive(0)
    const raf = requestAnimationFrame(() => inputRef.current?.focus())
    return () => {
      cancelAnimationFrame(raf)
      prevFocus.current?.focus?.()
    }
  }, [open])

  // modal key handling at the document level so Esc / arrows / Enter work no
  // matter where focus sits (same approach as the guided-tour dialog). Character
  // keys are left alone and reach the focused input normally.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const { results, sel, onClose } = navRef.current
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => Math.min((results.length || 1) - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = results[sel]
        if (cmd) {
          cmd.run()
          onClose()
        }
      } else if (e.key === 'Tab') {
        // single focusable field — keep the modal trap by staying put
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // keep the highlighted row scrolled into view as the cursor moves
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>('[data-sel="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, query, active])

  if (!open) return null

  return (
    <div className="cmdk-overlay">
      <div className="cmdk-scrim" onClick={onClose} />
      <div className="cmdk-card" role="dialog" aria-modal="true" aria-label={t('Command palette')}>
        <input
          ref={inputRef}
          className="cmdk-input"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          placeholder={t('Type a command — jump to a module, switch role, start the tour…')}
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-autocomplete="list"
          aria-activedescendant={sel >= 0 ? `cmdk-opt-${sel}` : undefined}
          spellCheck={false}
          autoComplete="off"
        />
        <div className="cmdk-list" id="cmdk-list" role="listbox" ref={listRef}>
          {results.length === 0 ? (
            <div className="cmdk-empty">{t('No matches')}</div>
          ) : (
            results.map((c, i) => (
              <div
                key={c.id}
                id={`cmdk-opt-${i}`}
                role="option"
                aria-selected={i === sel}
                data-sel={i === sel}
                className={i === sel ? 'cmdk-item active' : 'cmdk-item'}
                onMouseMove={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  c.run()
                  onClose()
                }}
              >
                <span className="cmdk-label">{c.label}</span>
                {c.hint && <span className="cmdk-hint">{c.hint}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
