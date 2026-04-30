"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toolsApi } from "@/lib/api-client";

type Tab = "calculator" | "documents" | "blacklist" | "cities";

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("calculator");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">🧰 维权工具箱</h1>
        <p className="text-gray-600 dark:text-gray-400">押金计算 · 文书生成 · 黑名单查询</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "calculator" && <DepositCalculator />}
      {activeTab === "documents" && <DocumentGenerator />}
      {activeTab === "blacklist" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">
          <div className="text-4xl mb-3">🚧</div>
          <p>黑名单功能即将上线</p>
        </div>
      )}
      {activeTab === "cities" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">
          <div className="text-4xl mb-3">🗺️</div>
          <p>城市政策功能即将上线</p>
        </div>
      )}
    </div>
  );
}

const tabs = [
  { id: "calculator", icon: "💰", label: "押金计算器" },
  { id: "documents", icon: "📄", label: "文书生成" },
  { id: "blacklist", icon: "⚠️", label: "黑名单" },
  { id: "cities", icon: "🗺️", label: "城市政策" },
];

// ── Deposit Calculator ────────────────────────────────────────────────────────

function DepositCalculator() {
  const [deposit, setDeposit] = useState("");
  const [rentMonthly, setRentMonthly] = useState("");
  const [rentMonths, setRentMonths] = useState("12");
  const [city, setCity] = useState("");
  const [deductions, setDeductions] = useState([
    { reason: "", claimed_amount: "", is_natural_wear: false },
  ]);

  const mutation = useMutation({
    mutationFn: (data: object) => toolsApi.calculateDeposit(data),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      deposit_amount: parseFloat(deposit),
      rent_monthly: rentMonthly ? parseFloat(rentMonthly) : undefined,
      rent_months: parseInt(rentMonths),
      city: city || undefined,
      deductions: deductions
        .filter((d) => d.reason && d.claimed_amount)
        .map((d) => ({
          ...d,
          claimed_amount: parseFloat(d.claimed_amount),
        })),
    });
  };

  const result = mutation.data as {
    summary: {
      deposit_amount: number;
      recoverable_amount: number;
      valid_deductions: number;
      invalid_deductions: number;
    };
    legal_note: string;
  } | undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">输入押金信息</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">押金金额（元）*</label>
            <input
              type="number"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              required
              placeholder="如：3000"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">月租金（元）</label>
            <input
              type="number"
              value={rentMonthly}
              onChange={(e) => setRentMonthly(e.target.value)}
              placeholder="如：1500"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">租住时长（月）</label>
            <input
              type="number"
              value={rentMonths}
              onChange={(e) => setRentMonths(e.target.value)}
              placeholder="如：12"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">城市（可选）</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="如：beijing"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">房东的扣费项目</label>
          {deductions.map((d, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                value={d.reason}
                onChange={(e) => {
                  const next = [...deductions];
                  next[i] = { ...next[i], reason: e.target.value };
                  setDeductions(next);
                }}
                placeholder="扣费原因"
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="number"
                value={d.claimed_amount}
                onChange={(e) => {
                  const next = [...deductions];
                  next[i] = { ...next[i], claimed_amount: e.target.value };
                  setDeductions(next);
                }}
                placeholder="金额"
                className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={d.is_natural_wear}
                  onChange={(e) => {
                    const next = [...deductions];
                    next[i] = { ...next[i], is_natural_wear: e.target.checked };
                    setDeductions(next);
                  }}
                />
                自然损耗
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setDeductions([...deductions, { reason: "", claimed_amount: "", is_natural_wear: false }])
            }
            className="text-sm text-blue-600 hover:underline"
          >
            + 添加扣费项目
          </button>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-medium transition-colors"
        >
          {mutation.isPending ? "计算中…" : "💰 计算可追回金额"}
        </button>
      </form>

      {/* Result */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {result ? (
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">计算结果</h2>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-4 text-center">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                ¥ {result.summary.recoverable_amount.toFixed(0)}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300 mt-1">预计可追回金额</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">原始押金</span>
                <span>¥ {result.summary.deposit_amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">合理扣除</span>
                <span className="text-orange-500">- ¥ {result.summary.valid_deductions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">违规扣除</span>
                <span className="text-red-500">- ¥ {result.summary.invalid_deductions} （可追回）</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">{result.legal_note}</p>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-3">💰</div>
              <p className="text-sm">填写左侧信息后点击计算</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Document Generator ────────────────────────────────────────────────────────

function DocumentGenerator() {
  const [docType, setDocType] = useState("complaint_letter");
  const [formData, setFormData] = useState({
    tenant_name: "",
    landlord_name: "",
    deposit_amount: "",
    property_address: "",
    issue_description: "",
    contact_info: "",
  });

  const mutation = useMutation({
    mutationFn: (data: object) => toolsApi.generateDocument(data as { doc_type: string; form_data: object }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ doc_type: docType, form_data: formData });
  };

  const result = mutation.data as { content: string } | undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">生成法律文书</h2>

        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">文书类型</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900"
          >
            <option value="complaint_letter">投诉信</option>
            <option value="lawsuit_petition">小额诉讼起诉状</option>
          </select>
        </div>

        {Object.entries(fieldLabels).map(([key, label]) => (
          <div key={key}>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</label>
            {key === "issue_description" ? (
              <textarea
                value={formData[key as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            ) : (
              <input
                value={formData[key as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-medium transition-colors"
        >
          {mutation.isPending ? "AI 生成中…" : "📄 生成文书"}
        </button>
        <p className="text-xs text-gray-400">需要登录后使用</p>
      </form>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 overflow-auto max-h-[600px]">
        {result ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm dark:prose-invert max-w-none">
            {result.content}
          </ReactMarkdown>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-3">📄</div>
              <p className="text-sm">AI 将在这里生成文书内容</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const fieldLabels: Record<string, string> = {
  tenant_name: "租客姓名",
  landlord_name: "房东/中介姓名",
  deposit_amount: "押金金额（元）",
  property_address: "房屋地址",
  issue_description: "纠纷经过（详细描述）",
  contact_info: "联系方式",
};
