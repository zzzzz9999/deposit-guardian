import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import AuthModal from '../auth/AuthModal'

const NAV_LINKS = [
  { to: '/',              label: '案例库' },
  { to: '/chat',          label: 'AI 维权' },
  { to: '/tools',         label: '法律工具' },
  { to: '/deposit-calc',  label: '押金计算' },
  { to: '/cities',        label: '城市信息' },
  { to: '/blacklist',     label: '黑名单' },
]

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const [showAuth, setShowAuth] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <nav className="sticky top-0 z-50 glass border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 gap-6">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ background: 'var(--navy)' }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L3 5v5.5c0 4.2 2.8 8.1 7 9.5 4.2-1.4 7-5.3 7-9.5V5L10 2z"
                    fill="white" fillOpacity=".92"/>
                  <path d="M7 10.2l2.2 2.2 4-4" stroke="var(--navy)"
                    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-bold text-slate-800 text-[15px] tracking-tight">租客卫士</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5 flex-1">
              {NAV_LINKS.map(({ to, label }) => (
                <NavLink key={to} to={to} end={to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                      isActive
                        ? 'text-[color:var(--navy)] bg-[color:var(--navy-dim)]'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`
                  }>
                  {label}
                </NavLink>
              ))}
            </div>

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Link to="/progress"
                    className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M6.5 3.5v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    维权进度
                  </Link>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 cursor-pointer"
                    style={{ background: 'var(--navy)' }}
                    title={user?.username}>
                    {user?.username?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <button onClick={() => logout()}
                    className="hidden md:block text-[12px] text-slate-400 hover:text-slate-600 transition-colors px-1">
                    退出
                  </button>
                </>
              ) : (
                <button onClick={() => setShowAuth(true)}
                  className="btn-primary text-[13px] py-1.5 px-3.5">
                  登录
                </button>
              )}

              {/* Mobile menu toggle */}
              <button className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  {mobileOpen
                    ? <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    : <path d="M3 5h12M3 9h12M3 13h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  }
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 animate-slide-up">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium my-0.5 transition-colors ${
                    isActive
                      ? 'text-[color:var(--navy)] bg-[color:var(--navy-dim)]'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`
                }>
                {label}
              </NavLink>
            ))}
            {isAuthenticated && (
              <NavLink to="/progress" onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 my-0.5">
                维权进度
              </NavLink>
            )}
          </div>
        )}
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
