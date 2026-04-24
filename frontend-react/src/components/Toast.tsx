import { useToastStore, type ToastItem, type ToastType } from '../stores/toastStore'

const ICONS: Record<ToastType, JSX.Element> = {
  success: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6.5" fill="#10b981" />
      <path d="M4.5 7.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6.5" fill="#ef4444" />
      <path d="M5 5l5 5M10 5l-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6.5" fill="#3b82f6" />
      <path d="M7.5 5v1M7.5 7.5v3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
}

const BG: Record<ToastType, string> = {
  success: 'bg-white border-l-4 border-emerald-500',
  error:   'bg-white border-l-4 border-red-500',
  info:    'bg-white border-l-4 border-blue-500',
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const remove = useToastStore((s) => s.remove)
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg max-w-sm w-full pointer-events-auto animate-slide-up ${BG[toast.type]}`}>
      <span className="shrink-0 mt-0.5">{ICONS[toast.type]}</span>
      <p className="text-sm text-slate-700 flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => remove(toast.id)}
        className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors mt-0.5"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

export default function Toast() {
  const toasts = useToastStore((s) => s.toasts)
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  )
}
