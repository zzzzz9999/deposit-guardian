import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../../stores/authStore'

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
})

const registerSchema = z.object({
  username: z.string().min(2, '用户名至少2个字').max(20, '用户名最多20个字'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string()
    .min(8, '密码至少8位')
    .regex(/[A-Za-z]/, '密码需包含字母')
    .regex(/[0-9]/, '密码需包含数字'),
  phone: z.string().regex(/^(1[3-9]\d{9})?$/, '手机号格式不正确').optional(),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

interface Props { onClose: () => void }

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-red-500 text-[11px] mt-1 ml-1">{msg}</p>
}

export default function AuthModal({ onClose }: Props) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [serverError, setServerError] = useState('')
  const { login, register, isLoading } = useAuthStore()

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const handleLogin = loginForm.handleSubmit(async (data) => {
    setServerError('')
    try {
      await login(data.email, data.password)
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || '邮箱或密码错误')
    }
  })

  const handleRegister = registerForm.handleSubmit(async (data) => {
    setServerError('')
    try {
      await register({ username: data.username, email: data.email, password: data.password, phone: data.phone || undefined })
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || '注册失败，请重试')
    }
  })

  const switchTab = (t: 'login' | 'register') => {
    setTab(t)
    setServerError('')
    loginForm.clearErrors()
    registerForm.clearErrors()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-slide-up" onClick={e => e.stopPropagation()}>

        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--navy)' }}>
              <ShieldIcon />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {tab === 'login' ? '欢迎回来' : '创建账号'}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => switchTab(t)}
              className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        {/* 登录表单 */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <input type="email" placeholder="邮箱" {...loginForm.register('email')}
                className="input" />
              <FieldError msg={loginForm.formState.errors.email?.message} />
            </div>
            <div>
              <input type="password" placeholder="密码" {...loginForm.register('password')}
                className="input" />
              <FieldError msg={loginForm.formState.errors.password?.message} />
            </div>

            {serverError && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{serverError}</p>
            )}

            <button type="submit" disabled={isLoading}
              className="btn-primary w-full justify-center py-3 mt-1 disabled:opacity-50">
              {isLoading ? '登录中…' : '登录'}
            </button>
          </form>
        )}

        {/* 注册表单 */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <input type="text" placeholder="用户名（2-20字）" {...registerForm.register('username')}
                className="input" />
              <FieldError msg={registerForm.formState.errors.username?.message} />
            </div>
            <div>
              <input type="email" placeholder="邮箱" {...registerForm.register('email')}
                className="input" />
              <FieldError msg={registerForm.formState.errors.email?.message} />
            </div>
            <div>
              <input type="password" placeholder="密码（至少8位，含字母和数字）" {...registerForm.register('password')}
                className="input" />
              <FieldError msg={registerForm.formState.errors.password?.message} />
            </div>
            <div>
              <input type="tel" placeholder="手机号（选填）" {...registerForm.register('phone')}
                className="input" />
              <FieldError msg={registerForm.formState.errors.phone?.message} />
            </div>

            {serverError && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{serverError}</p>
            )}

            <button type="submit" disabled={isLoading}
              className="btn-primary w-full justify-center py-3 mt-1 disabled:opacity-50">
              {isLoading ? '注册中…' : '注册'}
            </button>
          </form>
        )}

        <p className="text-center text-[11px] text-slate-400 mt-5">
          登录后可保存对话历史 · 追踪维权进度 · 投稿案例
        </p>
      </div>
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L3 5v5.5c0 4.2 2.8 8.1 7 9.5 4.2-1.4 7-5.3 7-9.5V5L10 2z" fill="white" fillOpacity=".92"/>
      <path d="M7 10.2l2.2 2.2 4-4" stroke="var(--navy)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
