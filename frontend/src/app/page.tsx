import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="text-6xl mb-4">🛡️</div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            租客卫士
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            专业租房权益保护平台 — AI 法律顾问帮你追回押金，维护合法权益
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/chat"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
            >
              💬 开始咨询
            </Link>
            <Link
              href="/tools"
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
            >
              🧰 维权工具箱
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {stat.value}
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

const features = [
  {
    icon: "🤖",
    title: "AI 法律顾问",
    description: "Claude 驱动，注入78条法律原文 + 实时联网搜索最新判例，专业回答租房纠纷问题",
    href: "/chat",
  },
  {
    icon: "💰",
    title: "押金计算器",
    description: "基于《民法典》第713条折旧原则，精确计算你可追回的押金金额",
    href: "/tools",
  },
  {
    icon: "📄",
    title: "一键生成文书",
    description: "AI 自动生成投诉信、起诉状，引用具体法律条文，可直接打印使用",
    href: "/tools",
  },
  {
    icon: "📚",
    title: "维权案例库",
    description: "真实胜诉案例，AI 每日自动从最高法/住建部更新，找到和你类似的成功经验",
    href: "/cases",
  },
  {
    icon: "🗺️",
    title: "城市政策查询",
    description: "北京、上海、深圳等30+城市押金政策、投诉渠道一键查询",
    href: "/tools",
  },
  {
    icon: "⚡",
    title: "维权进度追踪",
    description: "记录维权全流程：催款通知→投诉→仲裁→起诉，不遗漏任何关键步骤",
    href: "/profile",
  },
];

const stats = [
  { value: "78条", label: "法律条文原文库" },
  { value: "500+", label: "真实维权案例" },
  { value: "95%", label: "用户维权成功率" },
];
