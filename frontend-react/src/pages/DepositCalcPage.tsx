import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { depositCalcApi } from '../api'
import type { CalcResult, DeductionItem } from '../types'

interface FormData {
  deposit_amount: number
  rent_monthly: number
  rent_months: number
  city: string
  deductions: DeductionItem[]
}

const ITEM_TYPES = ['墙面涂料','壁纸','木地板','瓷砖地板','空调','热水器','冰箱','洗衣机','燃气灶','油烟机','沙发','床','窗帘','其他']

export default function DepositCalcPage() {
  const [result, setResult] = useState<CalcResult | null>(null)

  const { register, control, handleSubmit, watch } = useForm<FormData>({
    defaultValues: {
      deposit_amount: 0, rent_monthly: 0, rent_months: 12, city: '',
      deductions: [{ reason: '', claimed_amount: 0, is_natural_wear: false }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'deductions' })
  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) => depositCalcApi.calculate({
      ...data,
      deposit_amount: Number(data.deposit_amount),
      rent_monthly: Number(data.rent_monthly),
      rent_months: Number(data.rent_months),
      deductions: data.deductions.map(d => ({
        ...d, claimed_amount: Number(d.claimed_amount),
        item_age_years: d.item_age_years ? Number(d.item_age_years) : undefined,
        item_lifespan_years: d.item_lifespan_years ? Number(d.item_lifespan_years) : undefined,
      })),
    }),
    onSuccess: setResult,
  })

  const recoverPct = result
    ? Math.round((result.summary.recoverable_amount / result.summary.deposit_amount) * 100)
    : 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* 页头 */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <p className="section-label mb-1.5">维权工具</p>
          <h1 className="text-xl font-bold text-slate-900">押金折旧计算器</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            依据《民法典》第713条折旧原则，计算房东可合理扣除的金额
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit(d => mutate(d))}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">

            {/* 左：表单 */}
            <div className="space-y-4">

              {/* 基本信息 */}
              <div className="card p-5">
                <p className="section-label mb-4">基本信息</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">押金总额（元）</label>
                    <input type="number" {...register('deposit_amount')} className="input" placeholder="6000" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">月租金（元）</label>
                    <input type="number" {...register('rent_monthly')} className="input" placeholder="3000" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">实际租住月数</label>
                    <input type="number" {...register('rent_months')} className="input" placeholder="12" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">城市（可选）</label>
                    <select {...register('city')} className="input bg-white">
                      <option value="">不限</option>
                      {['beijing','shanghai','shenzhen','guangzhou','chengdu'].map(c => (
                        <option key={c} value={c}>{{ beijing:'北京',shanghai:'上海',shenzhen:'深圳',guangzhou:'广州',chengdu:'成都' }[c]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 扣押理由 */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="section-label">房东扣押理由</p>
                  <button type="button" onClick={() => append({ reason: '', claimed_amount: 0, is_natural_wear: false })}
                    className="btn-ghost text-[12px] py-1 px-2.5">
                    + 添加
                  </button>
                </div>
                <div className="space-y-3">
                  {fields.map((field, i) => (
                    <div key={field.id} className="rounded-xl border border-slate-200 p-4 relative">
                      <button type="button" onClick={() => remove(i)}
                        className="absolute top-3 right-3 w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">扣押理由</label>
                          <input {...register(`deductions.${i}.reason`)} placeholder="如：墙壁发黄需重新粉刷"
                            className="input" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">索赔金额（元）</label>
                          <input type="number" {...register(`deductions.${i}.claimed_amount`)} placeholder="2000" className="input" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">设施类型</label>
                          <select {...register(`deductions.${i}.item_type`)} className="input bg-white">
                            <option value="">自动识别</option>
                            {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">已使用年限</label>
                          <input type="number" step="0.5" {...register(`deductions.${i}.item_age_years`)}
                            placeholder={`${(Number(watch('rent_months')) / 12).toFixed(1)}`} className="input" />
                        </div>
                        <div className="flex items-center gap-2 pt-4">
                          <input type="checkbox" id={`nw-${i}`} {...register(`deductions.${i}.is_natural_wear`)}
                            className="w-4 h-4 rounded accent-[color:var(--teal-d)]" />
                          <label htmlFor={`nw-${i}`} className="text-[12px] text-slate-600 cursor-pointer">
                            标注为自然损耗
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={isPending}
                className="btn-primary w-full justify-center py-2.5">
                {isPending ? '计算中…' : '计算可追回金额'}
              </button>
            </div>

            {/* 右：结果 */}
            <div className="space-y-4">
              {result ? (
                <>
                  {/* 核心数据 */}
                  <div className="card p-5" style={{ background: 'var(--navy)', color: 'white' }}>
                    <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-3">计算结果</p>
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold mb-1">
                        ¥{result.summary.recoverable_amount.toLocaleString()}
                      </div>
                      <p className="text-sm opacity-70">预计可追回金额</p>
                    </div>
                    {/* 进度条 */}
                    <div className="bg-white/10 rounded-full h-2 mb-2">
                      <div className="h-2 rounded-full animate-bar-grow"
                        style={{ width: `${recoverPct}%`, background: 'var(--teal)' }} />
                    </div>
                    <div className="flex justify-between text-[11px] opacity-60">
                      <span>押金 ¥{result.summary.deposit_amount.toLocaleString()}</span>
                      <span>{recoverPct}% 可追回</span>
                    </div>
                  </div>

                  {/* 明细 */}
                  <div className="card p-5 space-y-3">
                    <p className="section-label">扣除明细</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">合理扣除</span>
                        <span className="font-semibold text-slate-700">¥{result.summary.valid_deductions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">不合理扣除</span>
                        <span className="font-semibold" style={{ color: 'var(--teal-d)' }}>¥{result.summary.invalid_deductions.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-3 space-y-3">
                      {result.deduction_details.map((d, i) => (
                        <div key={i} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-[12px] font-semibold text-slate-700">{d.reason}</span>
                            <div className="text-right shrink-0">
                              <div className="text-[11px] text-slate-400">索赔 ¥{d.claimed_amount}</div>
                              <div className="text-[11px] font-bold" style={{ color: 'var(--teal-d)' }}>合理 ¥{d.valid_amount}</div>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">{d.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.city_policy && (
                    <div className="card p-4" style={{ background: 'var(--coral-dim)', borderColor: 'var(--coral-border)' }}>
                      <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--coral-d)' }}>
                        城市特殊政策
                      </p>
                      <p className="text-[12px] text-slate-700">{result.city_policy.note}</p>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 text-center leading-relaxed px-2">
                    {result.legal_note}
                  </p>
                </>
              ) : (
                <div className="card p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 4v12M4 10h12" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600 mb-1">填写左侧信息</p>
                  <p className="text-xs text-slate-400">计算结果将在此显示</p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
