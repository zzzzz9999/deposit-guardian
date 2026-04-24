import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { documentsApi } from '../api'

type DocType = 'complaint_letter' | 'lawsuit_petition'
interface FormData {
  tenant_name: string; tenant_phone: string; landlord_name: string
  property_address: string; lease_start: string; lease_end: string
  deposit_amount: number; dispute_description: string
  target_department?: string; court_name?: string; claim_amount?: number
}

const DOC_TYPES: Record<DocType, string> = {
  complaint_letter: '投诉信',
  lawsuit_petition: '起诉状（小额诉讼）',
}

export default function DocumentGenPage() {
  const [docType, setDocType] = useState<DocType>('complaint_letter')
  const [content, setContent] = useState('')
  const { register, handleSubmit } = useForm<FormData>()

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) => documentsApi.generate(docType, {
      ...data,
      deposit_amount: Number(data.deposit_amount),
      claim_amount: data.claim_amount ? Number(data.claim_amount) : undefined,
    }),
    onSuccess: (res) => setContent(res.content),
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <p className="section-label mb-1.5">维权工具</p>
          <h1 className="text-xl font-bold text-slate-900">文书生成器</h1>
          <p className="text-sm text-slate-500 mt-0.5">填写信息，AI 自动生成格式规范的法律文书</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* 文书类型 */}
        <div className="flex gap-2 mb-5">
          {(Object.entries(DOC_TYPES) as [DocType, string][]).map(([type, label]) => (
            <button key={type} onClick={() => setDocType(type)}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border-2 transition-all ${
                docType === type
                  ? 'text-white border-transparent'
                  : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'
              }`}
              style={docType === type ? { background: 'var(--navy)', borderColor: 'var(--navy)' } : {}}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* 表单 */}
          <form onSubmit={handleSubmit(d => mutate(d))} className="card p-5 space-y-3">
            <p className="section-label">填写信息</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">你的姓名 *</label>
                <input {...register('tenant_name', { required: true })} placeholder="张三" className="input" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">联系电话 *</label>
                <input {...register('tenant_phone', { required: true })} placeholder="138xxxx1234" className="input" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">房东/中介姓名 *</label>
                <input {...register('landlord_name', { required: true })} placeholder="李四" className="input" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">押金金额（元）*</label>
                <input type="number" {...register('deposit_amount', { required: true })} placeholder="6000" className="input" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">入住日期</label>
                <input type="date" {...register('lease_start')} className="input" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">退租日期</label>
                <input type="date" {...register('lease_end')} className="input" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">房屋地址 *</label>
              <input {...register('property_address', { required: true })} placeholder="北京市朝阳区XX小区X号楼X室" className="input" />
            </div>
            {docType === 'complaint_letter' ? (
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">投诉对象</label>
                <input {...register('target_department')} placeholder="北京市住房和城乡建设委员会" className="input" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">法院名称</label>
                  <input {...register('court_name')} placeholder="朝阳区人民法院" className="input" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">诉讼请求金额</label>
                  <input type="number" {...register('claim_amount')} placeholder="6000" className="input" />
                </div>
              </div>
            )}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">纠纷经过 *</label>
              <textarea {...register('dispute_description', { required: true })} rows={4}
                placeholder="简述纠纷经过，如：退租时房东以墙壁发黄为由拒绝退还押金……"
                className="input resize-none" />
            </div>
            <button type="submit" disabled={isPending}
              className="btn-primary w-full justify-center py-2.5">
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  生成中（约15秒）…
                </span>
              ) : '生成文书'}
            </button>
          </form>

          {/* 预览 */}
          <div>
            {content ? (
              <div className="card overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                  <span className="text-[12px] font-semibold text-slate-700">{DOC_TYPES[docType]}</span>
                  <button onClick={() => navigator.clipboard.writeText(content)}
                    className="btn-ghost text-[12px] py-1 px-2.5">
                    复制全文
                  </button>
                </div>
                <div className="p-5 prose prose-sm max-w-none text-slate-800
                  prose-headings:font-bold prose-headings:text-slate-900
                  prose-strong:font-semibold">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="card p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="4" y="3" width="12" height="14" rx="2" stroke="#94a3b8" strokeWidth="1.4"/>
                    <path d="M7 7h6M7 10h6M7 13h4" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">填写左侧信息</p>
                <p className="text-xs text-slate-400">文书预览将在此显示</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
