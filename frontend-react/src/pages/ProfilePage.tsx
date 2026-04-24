import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../api'
import { useToastStore } from '../stores/toastStore'

const usernameSchema = z.object({
  username: z.string().min(2, '至少2字').max(20, '最多20字'),
})

const passwordSchema = z.object({
  old_password: z.string().min(1, '请输入原密码'),
  new_password: z.string()
    .min(8, '至少8位')
    .regex(/[A-Za-z]/, '需包含字母')
    .regex(/[0-9]/, '需包含数字'),
  confirm_password: z.string().min(1, '请确认新密码'),
}).refine((d) => d.new_password === d.confirm_password, {
  message: '两次输入的密码不一致',
  path: ['confirm_password'],
})

type UsernameForm = z.infer<typeof usernameSchema>
type PasswordForm = z.infer<typeof passwordSchema>

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-red-500 text-[11px] mt-1 ml-1">{msg}</p>
}

export default function ProfilePage() {
  const { user, logout, restoreSession } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToastStore()
  const [editingName, setEditingName] = useState(false)

  const nameForm = useForm<UsernameForm>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: user?.username ?? '' },
  })

  const pwForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const updateNameMutation = useMutation({
    mutationFn: (data: UsernameForm) => authApi.updateMe({ username: data.username }),
    onSuccess: async () => {
      await restoreSession()
      setEditingName(false)
      toast.add({ type: 'success', message: '用户名已更新' })
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      authApi.changePassword(data.old_password, data.new_password, data.confirm_password),
    onSuccess: () => {
      pwForm.reset()
      toast.add({ type: 'success', message: '密码已修改，下次登录请使用新密码' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      pwForm.setError('old_password', { message: msg || '修改失败' })
    },
  })

  const handleLogout = async () => {
    await logout()
    navigate('/')
    toast.add({ type: 'info', message: '已退出登录' })
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 mb-4">请先登录</p>
        <Link to="/" className="btn-primary">返回首页</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* 页头 */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <p className="section-label mb-1.5">账号</p>
          <h1 className="text-xl font-bold text-slate-900">个人中心</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* 头像 & 基本信息 */}
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0"
              style={{ background: 'var(--navy)' }}>
              {user.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-lg">{user.username}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
              {user.created_at && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  注册于 {new Date(user.created_at).toLocaleDateString('zh-CN')}
                </p>
              )}
            </div>
          </div>

          {/* 修改用户名 */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold text-slate-500">用户名</p>
              {!editingName && (
                <button onClick={() => setEditingName(true)} className="btn-ghost text-[11px] py-1 px-2.5">
                  修改
                </button>
              )}
            </div>
            {editingName ? (
              <form onSubmit={nameForm.handleSubmit(d => updateNameMutation.mutate(d))} className="flex gap-2">
                <div className="flex-1">
                  <input {...nameForm.register('username')} className="input" autoFocus />
                  <FieldError msg={nameForm.formState.errors.username?.message} />
                </div>
                <button type="submit" disabled={updateNameMutation.isPending} className="btn-primary shrink-0">
                  {updateNameMutation.isPending ? '保存中…' : '保存'}
                </button>
                <button type="button" onClick={() => setEditingName(false)} className="btn-ghost shrink-0">取消</button>
              </form>
            ) : (
              <p className="text-sm text-slate-700">{user.username}</p>
            )}
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { to: '/progress', label: '我的案件', desc: '维权进度追踪', icon: (
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            )},
            { to: '/submit-case', label: '我的投稿', desc: '案例投稿记录', icon: (
              <><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 3l-8 8M15 3h4v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></>
            )},
          ].map(({ to, label, desc, icon }) => (
            <Link key={to} to={to} className="card p-4 hover:shadow-card-hover transition-all group">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--navy-dim)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--navy)' }}>
                  {icon}
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-slate-800 group-hover:text-[color:var(--navy)] transition-colors">{label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>

        {/* 修改密码 */}
        <div className="card p-6">
          <p className="section-label mb-4">修改密码</p>
          <form onSubmit={pwForm.handleSubmit(d => changePasswordMutation.mutate(d))} className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">原密码</label>
              <input type="password" {...pwForm.register('old_password')} className="input" placeholder="请输入原密码" />
              <FieldError msg={pwForm.formState.errors.old_password?.message} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">新密码</label>
              <input type="password" {...pwForm.register('new_password')} className="input" placeholder="至少8位，含字母和数字" />
              <FieldError msg={pwForm.formState.errors.new_password?.message} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">确认新密码</label>
              <input type="password" {...pwForm.register('confirm_password')} className="input" placeholder="再次输入新密码" />
              <FieldError msg={pwForm.formState.errors.confirm_password?.message} />
            </div>
            <button type="submit" disabled={changePasswordMutation.isPending}
              className="btn-primary disabled:opacity-50">
              {changePasswordMutation.isPending ? '修改中…' : '修改密码'}
            </button>
          </form>
        </div>

        {/* 退出登录 */}
        <div className="card p-5">
          <p className="text-[13px] text-slate-500 mb-3">退出后需重新登录才能查看历史记录</p>
          <button onClick={handleLogout}
            className="text-[13px] px-4 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors font-medium">
            退出登录
          </button>
        </div>
      </div>
    </div>
  )
}
