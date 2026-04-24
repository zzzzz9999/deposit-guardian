import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useMutation } from '@tanstack/react-query'
import { submissionsApi } from '../api'
import AuthModal from '../components/auth/AuthModal'

export default function SubmitCasePage() {
  const { isAuthenticated } = useAuthStore()
  const [showAuth, setShowAuth] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', city: '', category_id: '',
    deposit_amount: '', rent_months: '', outcome: '', recovered_amount: '',
    is_anonymous: false, contact_email: '',
  })
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => submissionsApi.submit({
      ...form,
      deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : undefined,
      rent_months: form.rent_months ? Number(form.rent_months) : undefined,
      recovered_amount: form.recovered_amount ? Number(form.recovered_amount) : undefined,
    }),
    onSuccess: () => setSubmitted(true),
  })

  if (!isAuthenticated) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h2 className="text-xl font-black text-slate-900 mb-2">需要登录</h2>
      <p className="text-slate-500 text-sm mb-6">登录后才能投稿案例</p>
      <button onClick={() => setShowAuth(true)} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md">
        登录 / 注册
      </button>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )

  if (submitted) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-xl font-black text-slate-900 mb-2">投稿成功！</h2>
      <p className="text-slate-500 text-sm">感谢你的贡献！审核通过后，你的案例将加入案例库，帮助更多租客维权。</p>
      <button onClick={() => { setSubmitted(false); setForm({ title:'',description:'',city:'',category_id:'',deposit_amount:'',rent_months:'',outcome:'',recovered_amount:'',is_anonymous:false,contact_email:'' }) }}
        className="mt-6 px-6 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50">
        再次投稿
      </button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 mb-2">📝 投稿真实案例</h1>
        <p className="text-slate-500 text-sm">分享你的维权经历，帮助其他租客少走弯路。审核通过后将加入案例库。</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">案例标题 *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="简洁描述你的遭遇，如：房东以地板划痕扣全部押金"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">详细经过 *</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={6}
            placeholder="详细描述：入住时间、退租时间、房东的理由、你的维权过程、最终结果……越详细越有参考价值"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">城市</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="如：上海"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">押金金额（元）</label>
            <input type="number" value={form.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} placeholder="6000"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">租住月数</label>
            <input type="number" value={form.rent_months} onChange={e => set('rent_months', e.target.value)} placeholder="12"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">最终结果</label>
            <select value={form.outcome} onChange={e => set('outcome', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white">
              <option value="">请选择</option>
              <option value="won">维权成功</option>
              <option value="settled">协商和解</option>
              <option value="lost">维权失败</option>
              <option value="ongoing">仍在进行</option>
            </select>
          </div>
          {form.outcome === 'won' || form.outcome === 'settled' ? (
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">追回金额（元）</label>
              <input type="number" value={form.recovered_amount} onChange={e => set('recovered_amount', e.target.value)} placeholder="6000"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          ) : null}
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">联系邮箱（审核时联系，不公开）</label>
          <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="可选"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={form.is_anonymous} onChange={e => set('is_anonymous', e.target.checked)} className="w-4 h-4 accent-blue-600" />
          匿名发布（不展示用户名）
        </label>
        <button onClick={() => mutate()} disabled={!form.title || !form.description || isPending}
          className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md">
          {isPending ? '提交中…' : '📝 提交案例'}
        </button>
      </div>
    </div>
  )
}
