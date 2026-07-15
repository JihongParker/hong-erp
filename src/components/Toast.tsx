import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import './Toast.css'

// One success-feedback surface for the whole app: a top-right stack of toasts
// that slide in, hold, and fade themselves out. Replaces the per-module inline
// flashes so booking a trade, submitting a metric, etc. all speak the same way.
const ToastCtx = createContext<(msg: string) => void>(() => {})

export const useToast = () => useContext(ToastCtx)

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([])
  const show = useCallback((msg: string) => {
    const id = ++seq
    setToasts((t) => [...t, { id, msg }])
    // the toast animates its own fade-out over 3.5s; drop it from state just after
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="toast-stack" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span className="toast-tick">✓</span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
