import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import AppErrorBoundary from './components/ErrorBoundary'
import Toast from './components/Toast'
import { useAuthStore } from './stores/authStore'

import HomePage from './pages/HomePage'
import ChatPage from './pages/ChatPage'
import CaseDetailPage from './pages/CaseDetailPage'
import ToolsPage from './pages/ToolsPage'
import DepositCalcPage from './pages/DepositCalcPage'
import LandlordScriptPage from './pages/LandlordScriptPage'
import DocumentGenPage from './pages/DocumentGenPage'
import ProgressPage from './pages/ProgressPage'
import BlacklistPage from './pages/BlacklistPage'
import CityInfoPage from './pages/CityInfoPage'
import SubmitCasePage from './pages/SubmitCasePage'
import ProfilePage from './pages/ProfilePage'

function NotFoundPage() {
  return (
    <div className="flex items-center justify-center h-[60vh] text-center px-4">
      <div>
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="13" cy="13" r="9" stroke="#94a3b8" strokeWidth="1.6"/>
            <path d="M20 20l6 6" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">页面不存在</h1>
        <a href="/" className="btn-primary inline-flex">返回首页</a>
      </div>
    </div>
  )
}

export default function App() {
  const { restoreSession } = useAuthStore()

  useEffect(() => {
    restoreSession()
  }, [])

  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/cases/:caseId" element={<CaseDetailPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat/:sessionId" element={<ChatPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/deposit-calc" element={<DepositCalcPage />} />
              <Route path="/landlord-scripts" element={<LandlordScriptPage />} />
              <Route path="/document-gen" element={<DocumentGenPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/blacklist" element={<BlacklistPage />} />
              <Route path="/cities" element={<CityInfoPage />} />
              <Route path="/cities/:cityId" element={<CityInfoPage />} />
              <Route path="/submit-case" element={<SubmitCasePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <footer className="bg-slate-900 text-slate-400 py-8 px-6 text-center text-sm">
            <div className="font-bold text-white mb-2">租客卫士</div>
            <div className="flex justify-center gap-6 mb-3 flex-wrap">
              {[['/', '案例库'], ['/chat', 'AI维权'], ['/tools', '法律工具'], ['/deposit-calc', '押金计算'], ['/blacklist', '黑名单']].map(([to, l]) => (
                <a key={to} href={to} className="hover:text-white transition-colors">{l}</a>
              ))}
            </div>
            <p className="text-xs text-slate-500">本网站仅提供法律知识参考和维权指引，不构成正式法律意见。具体案件建议咨询专业律师。</p>
          </footer>
        </div>
        <Toast />
      </AppErrorBoundary>
    </BrowserRouter>
  )
}
