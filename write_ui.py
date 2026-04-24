
import pathlib
HTML = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>租客维权平台 — 案件管理中心</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { font-family: 'Noto Sans SC', sans-serif; }
  :root {
    --navy: #1e3a8a;
    --navy-l: #1d4ed8;
    --teal: #2dd4bf;
    --teal-d: #0d9488;
    --coral: #fb923c;
    --coral-d: #ea580c;
    --bg: #f0f4f8;
    --card: rgba(255,255,255,0.92);
  }
  body { background: var(--bg); }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

  /* Pulse animation for active step */
  @keyframes pulse-ring {
    0% { box-shadow: 0 0 0 0 rgba(29,78,216,0.4); }
    70% { box-shadow: 0 0 0 8px rgba(29,78,216,0); }
    100% { box-shadow: 0 0 0 0 rgba(29,78,216,0); }
  }
  .pulse-active { animation: pulse-ring 2s infinite; }

  /* Ring progress */
  .ring-progress { transform: rotate(-90deg); }

  /* Ripple */
  @keyframes ripple {
    0% { transform: scale(0); opacity: 0.6; }
    100% { transform: scale(4); opacity: 0; }
  }
  .ripple-el {
    position: absolute; border-radius: 50%;
    background: rgba(45,212,191,0.4);
    animation: ripple 0.8s ease-out forwards;
    pointer-events: none;
  }

  /* Slide-in panel */
  .panel { display: none; }
  .panel.active { display: block; animation: fadeSlide 0.3s ease; }
  @keyframes fadeSlide {
    from { opacity: 0; transform: translateX(12px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* Highlight flash */
  @keyframes hlFlash {
    0%,100% { background: transparent; }
    30%,70% { background: rgba(251,146,60,0.15); border-radius: 4px; }
  }
  .hl-flash { animation: hlFlash 1.2s ease; }

  /* Metro line */
  .metro-line { position: relative; }
  .metro-line::before {
    content: '';
    position: absolute; top: 50%; left: 0; right: 0;
    height: 3px; background: #cbd5e1;
    transform: translateY(-50%);
    z-index: 0;
  }

  /* Drag zone */
  .drag-zone.over { border-color: var(--teal) !important; background: rgba(45,212,191,0.06) !important; }

  /* Modal */
  .modal-overlay { display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); backdrop-filter:blur(4px); z-index:50; align-items:center; justify-content:center; }
  .modal-overlay.open { display:flex; }

  /* Tooltip */
  .tooltip { position:relative; }
  .tooltip-box {
    visibility:hidden; opacity:0; position:absolute; bottom:calc(100% + 6px); left:50%;
    transform:translateX(-50%); background:#1e293b; color:#f1f5f9;
    font-size:11px; padding:4px 8px; border-radius:6px; white-space:nowrap;
    transition: opacity 0.15s; pointer-events:none; z-index:10;
  }
  .tooltip:hover .tooltip-box { visibility:visible; opacity:1; }

  /* Progress bar animate */
  @keyframes barGrow { from { width: 0; } }
  .bar-animate { animation: barGrow 1.2s cubic-bezier(0.4,0,0.2,1) forwards; }

  /* Doc preview highlight */
  .doc-field { transition: background 0.25s, color 0.25s; }
  .doc-field.active { background: rgba(251,146,60,0.18); color: #c2410c; font-weight:600; border-radius:3px; }

  /* Glass card */
  .glass {
    background: var(--card);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(30,58,138,0.08);
  }
</style>
</head>
<body class="min-h-screen">

<!-- ═══ TOP HEADER ═══ -->
<header class="sticky top-0 z-30 glass border-b border-slate-200/60">
  <div class="flex items-center justify-between px-6 h-14">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-xl flex items-center justify-center" style="background:var(--navy)">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 2L3 5v5c0 3.5 2.5 6.7 6 7.5 3.5-.8 6-4 6-7.5V5L9 2z" fill="white" opacity=".9"/>
          <path d="M6 9l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="font-semibold text-slate-800 text-[15px] tracking-tight">租客维权平台</span>
      <span class="text-slate-300 text-sm">|</span>
      <span class="text-slate-500 text-sm">案件 #2024-0892</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-xs px-2.5 py-1 rounded-full font-medium" style="background:rgba(251,146,60,0.12);color:var(--coral-d)">
        进行中
      </span>
      <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">张</div>
    </div>
  </div>
</header>

<!-- ═══ MAIN LAYOUT ═══ -->
<div class="flex h-[calc(100vh-56px)] overflow-hidden">

  <!-- ══ LEFT SIDEBAR: Progress Tracker ══ -->
  <aside class="w-64 shrink-0 glass border-r border-slate-200/60 flex flex-col overflow-y-auto">
    <div class="px-5 pt-5 pb-3">
      <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">维权进度</p>

      <!-- Steps -->
      <div id="steps-list" class="space-y-1">
        <!-- Step items injected by JS -->
      </div>
    </div>

    <!-- Case summary -->
    <div class="mt-auto px-4 pb-5">
      <div class="rounded-2xl p-4 text-white" style="background:linear-gradient(135deg,var(--navy),var(--navy-l))">
        <p class="text-[11px] opacity-70 mb-1">押金金额</p>
        <p class="text-2xl font-bold tracking-tight">¥ 8,500</p>
        <div class="mt-3 flex items-center gap-1.5">
          <div class="flex-1 bg-white/20 rounded-full h-1.5">
            <div class="h-1.5 rounded-full" style="width:40%;background:var(--teal)"></div>
          </div>
          <span class="text-[11px] opacity-80">40%</span>
        </div>
        <p class="text-[11px] opacity-60 mt-1">维权进度</p>
      </div>
    </div>
  </aside>

  <!-- ══ MAIN CONTENT ══ -->
  <main class="flex-1 overflow-y-auto p-6">

    <!-- Panel 1: 合同分析 -->
    <div id="panel-0" class="panel active space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-800">合同分析</h2>
          <p class="text-sm text-slate-500 mt-0.5">系统已识别 3 处潜在违规条款</p>
        </div>
        <button class="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style="background:var(--coral)" onclick="nextStep()">
          确认并继续 →
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Contract preview -->
        <div class="glass rounded-2xl p-5">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">合同预览</p>
          <div class="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 leading-relaxed space-y-2 border border-slate-200" id="contract-preview">
            <p class="text-slate-400 text-xs mb-2">租房合同 · 第3条款</p>
            <p id="clause-1" class="doc-field p-1">乙方（租客）须在租期届满前30日提出退租申请，否则视为自动续租，押金不予退还。</p>
            <p id="clause-2" class="doc-field p-1">房屋出现任何损耗，包括正常使用磨损，均由乙方负责赔偿，甲方有权从押金中扣除。</p>
            <p id="clause-3" class="doc-field p-1">甲方有权在退租后60日内退还押金，期间不计利息。</p>
            <p class="text-slate-400 text-xs mt-2">... 共12条款</p>
          </div>
        </div>

        <!-- Legal Assessment Card -->
        <div class="glass rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">法律评估报告</p>
            <span class="text-xs px-2 py-0.5 rounded-full font-medium" style="background:rgba(251,146,60,0.12);color:var(--coral-d)">高风险</span>
          </div>

          <!-- Ring chart -->
          <div class="flex items-center gap-5 mb-5">
            <div class="relative w-20 h-20 shrink-0">
              <svg width="80" height="80" class="ring-progress">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" stroke-width="8"/>
                <circle id="ring-circle" cx="40" cy="40" r="32" fill="none" stroke="var(--coral)" stroke-width="8"
                  stroke-linecap="round" stroke-dasharray="201" stroke-dashoffset="201"/>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span id="ring-pct" class="text-lg font-bold text-slate-800">0%</span>
                <span class="text-[9px] text-slate-400">违规概率</span>
              </div>
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-slate-700 mb-1">恶意扣费可能性</p>
              <p class="text-xs text-slate-500 leading-relaxed">根据《民法典》第713条，正常损耗不应扣押金。检测到3处违规条款，建议立即采取行动。</p>
            </div>
          </div>

          <!-- Violation list -->
          <div class="space-y-2">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">违规条款</p>
            <div id="vio-1" class="violation-item flex items-start gap-3 p-3 rounded-xl border border-transparent cursor-pointer transition-all hover:border-orange-200 hover:bg-orange-50/50"
              data-clause="clause-1">
              <div class="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold text-white" style="background:var(--coral)">!</div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="text-xs font-semibold text-slate-700">第3条 · 自动续租押金不退</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style="background:rgba(239,68,68,0.1);color:#dc2626">高</span>
                </div>
                <p class="text-xs text-slate-500">违反《民法典》第710条，押金须无条件返还</p>
              </div>
            </div>
            <div id="vio-2" class="violation-item flex items-start gap-3 p-3 rounded-xl border border-transparent cursor-pointer transition-all hover:border-orange-200 hover:bg-orange-50/50"
              data-clause="clause-2">
              <div class="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold text-white" style="background:var(--coral)">!</div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="text-xs font-semibold text-slate-700">第3条 · 正常损耗扣押金</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style="background:rgba(251,146,60,0.12);color:#c2410c">中</span>
                </div>
                <p class="text-xs text-slate-500">正常使用磨损属自然损耗，不应由租客赔偿</p>
              </div>
            </div>
            <div id="vio-3" class="violation-item flex items-start gap-3 p-3 rounded-xl border border-transparent cursor-pointer transition-all hover:border-orange-200 hover:bg-orange-50/50"
              data-clause="clause-3">
              <div class="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold text-white" style="background:#f59e0b">!</div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="text-xs font-semibold text-slate-700">第3条 · 60日退款期限</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style="background:rgba(234,179,8,0.12);color:#854d0e">低</span>
                </div>
                <p class="text-xs text-slate-500">超出合理期限，应在退租后15日内退还</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel 2: 证据锁定 -->
    <div id="panel-1" class="panel space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-800">证据保险箱</h2>
          <p class="text-sm text-slate-500 mt-0.5">上传并管理所有维权证据材料</p>
        </div>
        <button class="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style="background:var(--teal-d)" onclick="nextStep()">
          证据已锁定 →
        </button>
      </div>

      <!-- 4 categories -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" id="evidence-grid">
        <!-- injected by JS -->
      </div>

      <!-- Uploaded files -->
      <div class="glass rounded-2xl p-5">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">已上传材料</p>
        <div id="file-list" class="space-y-2">
          <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:rgba(45,212,191,0.12)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="#0d9488" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="#0d9488" stroke-width="1.5" stroke-linecap="round"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-700 truncate">租房合同扫描件.pdf</p>
              <p class="text-xs text-slate-400">2.3 MB · 已验证</p>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style="background:rgba(45,212,191,0.12);color:var(--teal-d)">有效</span>
          </div>
          <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="#1d4ed8" stroke-width="1.5"/><path d="M5 6h6M5 9h4" stroke="#1d4ed8" stroke-width="1.5" stroke-linecap="round"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-700 truncate">微信催款记录截图.jpg</p>
              <p class="text-xs text-slate-400">1.1 MB · 聊天记录</p>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style="background:rgba(45,212,191,0.12);color:var(--teal-d)">有效</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel 3: 法律评估 (route map) -->
    <div id="panel-2" class="panel space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-800">维权路线图</h2>
          <p class="text-sm text-slate-500 mt-0.5">选择最适合你的维权路径</p>
        </div>
        <button class="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style="background:var(--navy-l)" onclick="nextStep()">
          开始行动 →
        </button>
      </div>

      <div class="glass rounded-2xl p-6">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-6">完整维权路径 · 点击站点查看详情</p>

        <!-- Metro map -->
        <div class="relative">
          <!-- Line 1: Main path -->
          <div class="flex items-center gap-0 mb-8 overflow-x-auto pb-2" id="metro-main">
            <!-- injected by JS -->
          </div>
        </div>

        <!-- Stats row -->
        <div class="grid grid-cols-3 gap-4 mt-2">
          <div class="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
            <p class="text-2xl font-bold text-slate-800">7–14</p>
            <p class="text-xs text-slate-500 mt-1">预计天数（协商）</p>
          </div>
          <div class="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
            <p class="text-2xl font-bold" style="color:var(--teal-d)">85%</p>
            <p class="text-xs text-slate-500 mt-1">协商成功率</p>
          </div>
          <div class="rounded-xl p-4 text-center" style="background:rgba(30,58,138,0.06);border:1px solid rgba(30,58,138,0.12)">
            <p class="text-2xl font-bold" style="color:var(--navy)">¥ 0</p>
            <p class="text-xs text-slate-500 mt-1">诉讼费用（小额）</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel 4: 发送催告 (doc editor) -->
    <div id="panel-3" class="panel space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-800">文书生成器</h2>
          <p class="text-sm text-slate-500 mt-0.5">填写信息，实时生成法律文书</p>
        </div>
        <div class="flex gap-2">
          <select class="px-3 py-2 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 focus:outline-none" id="doc-type-select">
            <option value="notice">催告函</option>
            <option value="complaint">投诉信</option>
            <option value="lawsuit">起诉状</option>
          </select>
          <button class="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
            style="background:var(--navy)" onclick="downloadDoc()">
            下载 PDF
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Form -->
        <div class="glass rounded-2xl p-5 space-y-4">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">填写信息</p>
          <div>
            <label class="text-xs font-medium text-slate-600 block mb-1.5">租客姓名</label>
            <input type="text" id="f-name" placeholder="张三" value="张三"
              class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              oninput="syncDoc('name',this.value)">
          </div>
          <div>
            <label class="text-xs font-medium text-slate-600 block mb-1.5">房东姓名</label>
            <input type="text" id="f-landlord" placeholder="李四" value="李四"
              class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              oninput="syncDoc('landlord',this.value)">
          </div>
          <div>
            <label class="text-xs font-medium text-slate-600 block mb-1.5">押金金额（元）</label>
            <input type="number" id="f-amount" placeholder="8500" value="8500"
              class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              oninput="syncDoc('amount',this.value)">
          </div>
          <div>
            <label class="text-xs font-medium text-slate-600 block mb-1.5">退租日期</label>
            <input type="date" id="f-date" value="2024-03-15"
              class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              oninput="syncDoc('date',this.value)">
          </div>
          <div>
            <label class="text-xs font-medium text-slate-600 block mb-1.5">房屋地址</label>
            <input type="text" id="f-addr" placeholder="北京市朝阳区..." value="北京市朝阳区建国路88号"
              class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              oninput="syncDoc('addr',this.value)">
          </div>
          <div>
            <label class="text-xs font-medium text-slate-600 block mb-1.5">违规事由</label>
            <textarea id="f-reason" rows="3" placeholder="房东以墙壁损耗为由拒绝退还押金..."
              class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
              oninput="syncDoc('reason',this.value)">房东以墙壁正常损耗为由，拒绝退还押金，违反《民法典》第713条规定。</textarea>
          </div>
        </div>

        <!-- Preview -->
        <div class="glass rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">文书预览</p>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-medium" style="background:rgba(45,212,191,0.12);color:var(--teal-d)">实时同步</span>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-5 text-sm text-slate-700 leading-relaxed space-y-3 font-mono text-xs" id="doc-preview">
            <p class="text-center font-bold text-base text-slate-800 mb-4">催 告 函</p>
            <p>被催告人：<span id="dp-landlord" class="doc-field px-0.5">李四</span></p>
            <p>催告人：<span id="dp-name" class="doc-field px-0.5">张三</span></p>
            <p>事由：本人于 <span id="dp-date" class="doc-field px-0.5">2024年03月15日</span> 退租位于 <span id="dp-addr" class="doc-field px-0.5">北京市朝阳区建国路88号</span> 的房屋，已缴纳押金 <span id="dp-amount" class="doc-field px-0.5">8500</span> 元。</p>
            <p>现因：<span id="dp-reason" class="doc-field px-0.5">房东以墙壁正常损耗为由，拒绝退还押金，违反《民法典》第713条规定。</span></p>
            <p>依据《民法典》第710条、第713条，要求被催告人于本函送达后 <strong>7日内</strong> 退还全部押金，否则本人将向有关部门投诉并提起诉讼，由此产生的一切法律责任由被催告人承担。</p>
            <p class="mt-4 text-right">催告人：<span id="dp-name2" class="doc-field px-0.5">张三</span></p>
            <p class="text-right">日期：2024年04月24日</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel 5: 投诉申请 -->
    <div id="panel-4" class="panel space-y-5">
      <div>
        <h2 class="text-xl font-bold text-slate-800">投诉申请</h2>
        <p class="text-sm text-slate-500 mt-0.5">向相关部门提交投诉，加速维权进程</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="glass rounded-2xl p-5 border-2 border-transparent hover:border-blue-200 cursor-pointer transition-all">
          <div class="w-10 h-10 rounded-xl mb-3 flex items-center justify-center" style="background:rgba(30,58,138,0.08)">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 4h14v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" stroke="#1e3a8a" stroke-width="1.5"/><path d="M7 4V2h6v2" stroke="#1e3a8a" stroke-width="1.5" stroke-linecap="round"/><path d="M7 9h6M7 13h4" stroke="#1e3a8a" stroke-width="1.5" stroke-linecap="round"/></svg>
          </div>
          <p class="font-semibold text-slate-800 text-sm mb-1">住建委投诉</p>
          <p class="text-xs text-slate-500 leading-relaxed">向当地住房和城乡建设委员会提交投诉，适合押金纠纷</p>
          <div class="mt-3 flex items-center gap-1.5">
            <div class="w-1.5 h-1.5 rounded-full" style="background:var(--teal)"></div>
            <span class="text-xs" style="color:var(--teal-d)">预计3-7工作日</span>
          </div>
        </div>
        <div class="glass rounded-2xl p-5 border-2 border-transparent hover:border-blue-200 cursor-pointer transition-all">
          <div class="w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-orange-50">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="#fb923c" stroke-width="1.5"/><path d="M10 6v4l3 3" stroke="#fb923c" stroke-width="1.5" stroke-linecap="round"/></svg>
          </div>
          <p class="font-semibold text-slate-800 text-sm mb-1">12315 消费者投诉</p>
          <p class="text-xs text-slate-500 leading-relaxed">通过全国消费者权益保护热线提交投诉</p>
          <div class="mt-3 flex items-center gap-1.5">
            <div class="w-1.5 h-1.5 rounded-full" style="background:var(--teal)"></div>
            <span class="text-xs" style="color:var(--teal-d)">预计5-10工作日</span>
          </div>
        </div>
        <div class="glass rounded-2xl p-5 border-2 border-transparent hover:border-blue-200 cursor-pointer transition-all">
          <div class="w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-red-50">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3L3 7v6l7 4 7-4V7l-7-4z" stroke="#dc2626" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </div>
          <p class="font-semibold text-slate-800 text-sm mb-1">法院立案</p>
          <p class="text-xs text-slate-500 leading-relaxed">向基层人民法院提起民事诉讼，法律效力最强</p>
          <div class="mt-3 flex items-center gap-1.5">
            <div class="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
            <span class="text-xs text-orange-600">预计30-90天</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel 6: 诉讼准备 -->
    <div id="panel-5" class="panel space-y-5">
      <div>
        <h2 class="text-xl font-bold text-slate-800">诉讼准备</h2>
        <p class="text-sm text-slate-500 mt-0.5">整理诉讼材料，准备法庭陈述</p>
      </div>
      <div class="glass rounded-2xl p-6">
        <div class="flex items-center gap-4 p-4 rounded-xl mb-5" style="background:rgba(45,212,191,0.08);border:1px solid rgba(45,212,191,0.2)">
          <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style="background:var(--teal)">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 7-7" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>
          </div>
          <div>
            <p class="font-semibold text-slate-800">诉讼材料已齐备</p>
            <p class="text-sm text-slate-500">所有必要材料已收集完毕，可以向法院提起诉讼</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="checklist-item flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style="background:var(--teal)">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>
            </div>
            <span class="text-xs text-slate-700">租房合同原件</span>
          </div>
          <div class="checklist-item flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style="background:var(--teal)">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>
            </div>
            <span class="text-xs text-slate-700">押金收据凭证</span>
          </div>
          <div class="checklist-item flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style="background:var(--teal)">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>
            </div>
            <span class="text-xs text-slate-700">催告函送达证明</span>
          </div>
          <div class="checklist-item flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style="background:var(--teal)">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>
            </div>
            <span class="text-xs text-slate-700">沟通记录截图</span>
          </div>
        </div>
      </div>
    </div>

  </main>
</div>

<!-- ═══ METRO MODAL ═══ -->
<div class="modal-overlay" id="metro-modal">
  <div class="glass rounded-2xl p-6 w-80 max-w-full mx-4 relative">
    <button onclick="closeModal()" class="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </button>
    <div id="modal-icon" class="w-10 h-10 rounded-xl mb-3 flex items-center justify-center" style="background:rgba(30,58,138,0.08)">
      <div class="w-3 h-3 rounded-full" style="background:var(--navy)"></div>
    </div>
    <h3 id="modal-title" class="font-bold text-slate-800 mb-1">站点详情</h3>
    <div class="space-y-3 mt-3">
      <div>
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">预计耗时</p>
        <p id="modal-time" class="text-sm text-slate-700">—</p>
      </div>
      <div>
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">所需材料</p>
        <ul id="modal-materials" class="text-sm text-slate-700 space-y-0.5 list-disc list-inside"></ul>
      </div>
      <div>
        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">沟通话术</p>
        <p id="modal-script" class="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-200"></p>
      </div>
    </div>
  </div>
</div>

<script>
// ═══ DATA ═══
const STEPS = [
  { label: '合同分析', icon: 'M3 4h14v12H3V4zm4 4h6M7 10h4', status: 'done' },
  { label: '证据锁定', icon: 'M12 3l3 3-9 9-3-1 1-3 8-8z', status: 'active' },
  { label: '法律评估', icon: 'M9 2L3 5v5c0 3.5 2.5 6.7 6 7.5 3.5-.8 6-4 6-7.5V5L9 2z', status: 'pending' },
  { label: '发送催告', icon: 'M3 8l7-5 7 5v9H3V8z', status: 'pending' },
  { label: '投诉申请', icon: 'M10 3L3 7v6l7 4 7-4V7l-7-4z', status: 'pending' },
  { label: '诉讼准备', icon: 'M5 3h10l2 4-7 10L3 7l2-4z', status: 'pending' },
];

const METRO_STATIONS = [
  { name: '私下协商', time: '3-7天', color: 'var(--teal)', materials: ['催告函', '押金收据'], script: '您好，根据合同约定，押金应在退租后15日内退还，目前已超期，请于3日内退还押金8500元，否则我将向相关部门投诉。' },
  { name: '发送律师函', time: '1-3天', color: '#6366f1', materials: ['律师函模板', '身份证明'], script: '本律师受当事人委托，正式通知您在收到本函后7日内退还押金，否则将承担相应法律责任。' },
  { name: '住建委投诉', time: '5-15天', color: 'var(--navy)', materials: ['投诉信', '合同复印件', '押金收据'], script: '我于XX年XX月退租，房东拒绝退还押金8500元，违反《民法典》第710条，请依法处理。' },
  { name: '调解中心', time: '15-30天', color: '#f59e0b', materials: ['调解申请书', '相关证据'], script: '双方就押金退还事宜存在争议，申请调解中心居中调解，要求房东退还全额押金。' },
  { name: '小额诉讼', time: '30-60天', color: 'var(--coral)', materials: ['起诉状', '证据清单', '身份证'], script: '依据《民事诉讼法》第162条，申请适用小额诉讼程序，要求被告退还押金8500元及利息。' },
  { name: '互联网法院', time: '60-90天', color: '#dc2626', materials: ['电子起诉材料', '全套证据链'], script: '通过互联网法院在线立案，适用于标的额较小的租赁纠纷，全程线上操作，效率更高。' },
];

const EVIDENCE_CATS = [
  { name: '聊天记录', icon: 'M3 3h14v10H3V3zm3 13h8', color: '#6366f1' },
  { name: '照片', icon: 'M2 4h16v12H2V4zm5 3a2 2 0 100 4 2 2 0 000-4zm9 6l-4-4-3 3-2-2-3 3', color: 'var(--teal-d)' },
  { name: '视频', icon: 'M2 4h10v12H2V4zm11 3l5-2v10l-5-2V7z', color: 'var(--coral)' },
  { name: '账单', icon: 'M4 3h12l2 4-2 10H4L2 7l2-4zm4 5v4m4-4v4', color: 'var(--navy)' },
];

let currentStep = 1; // 0-indexed, step 1 (证据锁定) is active

// ═══ RENDER STEPS ═══
function renderSteps() {
  const container = document.getElementById('steps-list');
  container.innerHTML = STEPS.map((s, i) => {
    const isDone = i < currentStep;
    const isActive = i === currentStep;
    const isPending = i > currentStep;
    return `
      <button onclick="goToStep(${i})" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all
        ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}">
        <div class="w-7 h-7 rounded-full shrink-0 flex items-center justify-center transition-all
          ${isDone ? '' : isActive ? 'pulse-active' : ''}
          ${isDone ? '' : isActive ? 'border-2 border-blue-500' : 'border-2 border-slate-300'}"
          style="${isDone ? 'background:var(--teal)' : isActive ? 'background:white' : 'background:white'}">
          ${isDone
            ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg>`
            : `<div class="w-2 h-2 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-300'}"></div>`
          }
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium truncate ${isDone ? 'text-slate-500' : isActive ? 'text-blue-700' : 'text-slate-400'}">${s.label}</p>
        </div>
        ${isActive ? `<div class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>` : ''}
      </button>
    `;
  }).join('');
}

function goToStep(i) {
  currentStep = i;
  renderSteps();
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + i).classList.add('active');
  if (i === 2) renderMetro();
  if (i === 0) startRingAnimation();
}

function nextStep() {
  if (currentStep < STEPS.length - 1) goToStep(currentStep + 1);
}

// ═══ RING ANIMATION ═══
function startRingAnimation() {
  const circle = document.getElementById('ring-circle');
  const pct = document.getElementById('ring-pct');
  const circumference = 201;
  const target = 78;
  let current = 0;
  const interval = setInterval(() => {
    current = Math.min(current + 1.5, target);
    const offset = circumference - (current / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    pct.textContent = Math.round(current) + '%';
    if (current >= target) clearInterval(interval);
  }, 20);
}

// ═══ VIOLATION HOVER ═══
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.violation-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      const clauseId = item.dataset.clause;
      const clause = document.getElementById(clauseId);
      if (clause) {
        clause.classList.add('hl-flash');
        clause.style.background = 'rgba(251,146,60,0.15)';
        clause.style.borderRadius = '4px';
        setTimeout(() => {
          clause.style.background = '';
          clause.classList.remove('hl-flash');
        }, 1200);
      }
    });
  });
});

// ═══ RENDER METRO ═══
function renderMetro() {
  const container = document.getElementById('metro-main');
  container.innerHTML = METRO_STATIONS.map((s, i) => {
    const isCurrent = i === 1; // current position
    const isPast = i < 1;
    return `
      <div class="flex items-center ${i < METRO_STATIONS.length - 1 ? 'flex-1' : ''}">
        <div class="flex flex-col items-center shrink-0" style="min-width:64px">
          <button onclick="openModal(${i})"
            class="w-10 h-10 rounded-full border-2 flex items-center justify-center relative z-10 transition-all hover:scale-110 active:scale-95"
            style="background:${isPast || isCurrent ? s.color : 'white'};border-color:${s.color};${isCurrent ? 'box-shadow:0 0 0 4px ' + s.color + '30' : ''}">
            ${isPast
              ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg>`
              : `<div class="w-3 h-3 rounded-full" style="background:${isCurrent ? 'white' : s.color}"></div>`
            }
          </button>
          <p class="text-[10px] font-medium mt-1.5 text-center leading-tight" style="color:${isCurrent ? s.color : '#64748b'};max-width:56px">${s.name}</p>
        </div>
        ${i < METRO_STATIONS.length - 1 ? `
          <div class="flex-1 h-0.5 mx-1 relative" style="background:${isPast ? s.color : '#e2e8f0'}">
            ${isPast ? '' : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function openModal(i) {
  const s = METRO_STATIONS[i];
  document.getElementById('modal-title').textContent = s.name;
  document.getElementById('modal-time').textContent = s.time;
  document.getElementById('modal-icon').style.background = s.color + '20';
  document.getElementById('modal-icon').innerHTML = `<div class="w-4 h-4 rounded-full" style="background:${s.color}"></div>`;
  const ul = document.getElementById('modal-materials');
  ul.innerHTML = s.materials.map(m => `<li>${m}</li>`).join('');
  document.getElementById('modal-script').textContent = s.script;
  document.getElementById('metro-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('metro-modal').classList.remove('open');
}
document.getElementById('metro-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

// ═══ EVIDENCE VAULT ═══
function renderEvidence() {
  const grid = document.getElementById('evidence-grid');
  grid.innerHTML = EVIDENCE_CATS.map(cat => `
    <div class="glass rounded-2xl p-4 drag-zone border-2 border-dashed border-slate-200 transition-all cursor-pointer relative overflow-hidden"
      ondragover="e=arguments[0];e.preventDefault();this.classList.add('over')"
      ondragleave="this.classList.remove('over')"
      ondrop="handleDrop(arguments[0],this)"
      onclick="triggerUpload(this)">
      <div class="w-9 h-9 rounded-xl mb-3 flex items-center justify-center" style="background:${cat.color}15">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="${cat.icon}" stroke="${cat.color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p class="text-sm font-semibold text-slate-700 mb-1">${cat.name}</p>
      <p class="text-xs text-slate-400">拖拽或点击上传</p>
      <div class="file-count mt-2 text-xs font-medium" style="color:${cat.color}">0 个文件</div>
      <input type="file" class="hidden" multiple onchange="handleFileInput(arguments[0],this.closest('.drag-zone'))">
    </div>
  `).join('');
}

function handleDrop(e, zone) {
  e.preventDefault();
  zone.classList.remove('over');
  const files = e.dataTransfer.files;
  if (files.length) processFiles(files, zone);
}

function triggerUpload(zone) {
  zone.querySelector('input[type=file]').click();
}

function handleFileInput(e, zone) {
  processFiles(e.target.files, zone);
}

function processFiles(files, zone) {
  const count = zone.querySelector('.file-count');
  const current = parseInt(count.textContent) || 0;
  count.textContent = (current + files.length) + ' 个文件';

  // Ripple effect
  const rect = zone.getBoundingClientRect();
  const ripple = document.createElement('div');
  ripple.className = 'ripple-el';
  ripple.style.cssText = `width:40px;height:40px;left:50%;top:50%;margin:-20px;`;
  zone.appendChild(ripple);
  setTimeout(() => ripple.remove(), 800);

  // Add to file list if video
  Array.from(files).forEach(f => {
    if (f.type.startsWith('video/') || f.name.match(/\.(mp4|mov|avi)$/i)) {
      const list = document.getElementById('file-list');
      const item = document.createElement('div');
      item.className = 'flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200';
      item.innerHTML = `
        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-50">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h10v10H2V3zm11 2l3-1v8l-3-1V5z" stroke="#fb923c" stroke-width="1.2"/></svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-700 truncate">${f.name}</p>
          <p class="text-xs text-slate-400">${(f.size/1024/1024).toFixed(1)} MB</p>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style="background:rgba(45,212,191,0.12);color:var(--teal-d)">已验证时间戳</span>
      `;
      list.appendChild(item);
    }
  });
}

// ═══ DOC SYNC ═══
function syncDoc(field, value) {
  const fieldMap = {
    name: ['dp-name', 'dp-name2'],
    landlord: ['dp-landlord'],
    amount: ['dp-amount'],
    date: ['dp-date'],
    addr: ['dp-addr'],
    reason: ['dp-reason'],
  };
  const ids = fieldMap[field] || [];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (field === 'date') {
        const d = new Date(value);
        el.textContent = `${d.getFullYear()}年${String(d.getMonth()+1).padStart(2,'0')}月${String(d.getDate()).padStart(2,'0')}日`;
      } else {
        el.textContent = value || '—';
      }
      el.classList.add('active');
      setTimeout(() => el.classList.remove('active'), 1200);
    }
  });
}

function downloadDoc() {
  alert('PDF 生成功能已就绪，实际部署时将调用 PDF 生成服务。');
}

// ═══ INIT ═══
renderSteps();
renderEvidence();
// Panel 1 is active by default (证据锁定 = index 1)
document.getElementById('panel-1').classList.add('active');
document.getElementById('panel-0').classList.remove('active');
</script>
</body>
</html>"""

pathlib.Path('d:/RJ/CatPawPJ/deposit-guardian/租客维权平台.html').write_text(HTML, encoding='utf-8')
print('Done')
