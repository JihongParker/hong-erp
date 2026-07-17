// Circled "?" with a plain-language tooltip — shared by parameter rows and the
// strategy/structure selectors so the help affordance looks identical
// everywhere. Hover shows the tip; click/tap toggles it (propagation stopped,
// so a wrapping button or label is never activated). The tip is absolutely
// positioned against the nearest positioned ancestor and spans its width,
// dropping below the row instead of clipping against scrollable rails.
import { useState } from 'react'

export default function HelpDot({ text, subject }: { text: string; subject?: string }) {
  const [open, setOpen] = useState(false)
  const toggle = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen((o) => !o)
  }
  return (
    <span className={open ? 'p-help open' : 'p-help'}>
      <span
        className="p-help-btn"
        role="button"
        tabIndex={0}
        aria-label={subject ? `${subject} — ${text}` : text}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') toggle(e)
        }}
        onBlur={() => setOpen(false)}
      >
        ?
      </span>
      <span className="p-help-tip" role="tooltip">
        {text}
      </span>
    </span>
  )
}
