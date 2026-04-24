import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { useNavigate } from 'react-router-dom'

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: 'var(--bg)' }}>
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4M12 17h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-2">页面出现了问题</h2>
      <p className="text-sm text-slate-500 mb-1 max-w-sm">{error instanceof Error ? error.message : '未知错误'}</p>
      <p className="text-xs text-slate-400 mb-6">请尝试刷新页面，或返回首页</p>
      <div className="flex gap-3">
        <button
          onClick={resetErrorBoundary}
          className="btn-primary"
        >
          重新加载
        </button>
        <button
          onClick={() => { resetErrorBoundary(); navigate('/') }}
          className="btn-ghost"
        >
          返回首页
        </button>
      </div>
    </div>
  )
}

export default function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  )
}
