// ===== 租客卫士 · AI对话页 =====

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:8000' : '';

let conversationHistory = [];
let isStreaming = false;

const QUICK_REPLIES = [
  '我有照片证据', '没有书面合同', '押金超过1万元',
  '中介公司不见了', '房东不回消息', '已退租超过一个月'
];

// ─── 法律条文链接库 ────────────────────────────────────────────────────────────
// 全国人大国家法律法规数据库 · 民法典官方页面
const NPC_MINFADIAN = 'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D';
const NPC_XFZQHBHF = 'https://flk.npc.gov.cn/detail2.html?ZmY4MDgxODE2ZjNjYmIzYzAxNmYzY2VlNjIxNzBiMzE%3D';
const NPC_BASE     = 'https://flk.npc.gov.cn/';

const LAW_LINKS = {
  // 民法典条文
  '《民法典》第188条': NPC_MINFADIAN,
  '《民法典》第496条': NPC_MINFADIAN,
  '《民法典》第565条': NPC_MINFADIAN,
  '《民法典》第577条': NPC_MINFADIAN,
  '《民法典》第583条': NPC_MINFADIAN,
  '《民法典》第585条': NPC_MINFADIAN,
  '《民法典》第587条': NPC_MINFADIAN,
  '《民法典》第703条': NPC_MINFADIAN,
  '《民法典》第708条': NPC_MINFADIAN,
  '《民法典》第713条': NPC_MINFADIAN,
  '《民法典》第714条': NPC_MINFADIAN,
  '《民法典》第716条': NPC_MINFADIAN,
  '《民法典》第720条': NPC_MINFADIAN,
  '《民法典》第925条': NPC_MINFADIAN,
  // 不带书名号的写法也匹配
  '民法典第188条': NPC_MINFADIAN,
  '民法典第496条': NPC_MINFADIAN,
  '民法典第565条': NPC_MINFADIAN,
  '民法典第577条': NPC_MINFADIAN,
  '民法典第583条': NPC_MINFADIAN,
  '民法典第585条': NPC_MINFADIAN,
  '民法典第587条': NPC_MINFADIAN,
  '民法典第703条': NPC_MINFADIAN,
  '民法典第708条': NPC_MINFADIAN,
  '民法典第713条': NPC_MINFADIAN,
  '民法典第714条': NPC_MINFADIAN,
  '民法典第716条': NPC_MINFADIAN,
  '民法典第720条': NPC_MINFADIAN,
  '民法典第925条': NPC_MINFADIAN,
  // 消费者权益保护法
  '《消费者权益保护法》': NPC_XFZQHBHF,
  '消费者权益保护法':     NPC_XFZQHBHF,
  // 其他法规指向总库
  '《城市房屋租赁管理办法》': NPC_BASE,
  '《住房租赁条例》':          NPC_BASE,
};

// 正则：匹配「《民法典》第XXX条」或「民法典第XXX条」
const LAW_PATTERN = /(《民法典》第\d+条|民法典第\d+条|《消费者权益保护法》[^》]*?第\d+条|消费者权益保护法第\d+条|《城市房屋租赁管理办法》|《住房租赁条例》)/g;

// ─── SessionManager：localStorage 持久化 ──────────────────────────────────────
const SessionManager = (() => {
  const KEY = 'dg_sessions';
  const MAX = 30;
  const SEEDED_KEY = 'dg_seeded_v2'; // 防止重复注入

  // 预置历史对话（模拟之前的真实对话记录）
  const SEED_SESSIONS = [
    {
      id: '1745200000001',
      title: '房东说墙壁发黄要扣押金',
      createdAt: Date.now() - 86400000 * 2, // 2天前
      messages: [
        { role: 'user', content: '房东以墙壁发黄为由要扣我2000块押金，我租了两年，该怎么办？', ts: Date.now() - 86400000 * 2 },
        { role: 'assistant', content: '# 租客卫士来了，别着急 💪\n\n先说一句：**这种情况你大概率能追回来**。租了整整两年，墙壁发黄几乎100%属于自然损耗，房东这个理由站不住脚。\n\n---\n\n## 🔍 先帮你定性这个问题\n\n> **《民法典》第713条**明确规定：\n> 租赁物因正常使用产生的损耗，**由出租人承担**，不得向承租人索赔。\n\n墙壁随时间泛黄、轻微褪色，住两年完全正常，法律上叫**"自然损耗"**，不是你的责任。\n\n房东要扣这2000块，**没有法律依据**。\n\n---\n\n## ✅ 三步行动计划\n\n### 🟢 今天就做（10分钟）\n\n**发一条微信给房东**，直接复制这条消息发给他：\n\n```\n您好，关于退租押金的问题，我需要正式说明：\n\n墙壁发黄属于正常居住损耗，根据《民法典》第713条，\n正常使用产生的损耗应由出租人承担，不构成扣押押金的合法依据。\n\n请您在7日内退还全额押金2000元至我的账户。\n逾期未退，我将向当地住建委投诉并申请法律途径维权。\n```\n\n### 🟡 3天内（如果不回应）\n\n向当地 **住建委/房管局** 投诉，拨打 **12345** 政务热线，说明是"住房租赁押金纠纷"。\n\n### 🔴 如果还不行\n\n向房屋所在地基层法院申请 **小额诉讼**，费用约50-150元，通常1-3个月结案。', ts: Date.now() - 86400000 * 2 + 30000 },
        { role: 'user', content: '我退租时没有拍照，这样会影响维权吗？', ts: Date.now() - 86400000 * 2 + 60000 },
        { role: 'assistant', content: '没有照片确实是个劣势，但**并不意味着就输了**。\n\n---\n\n## 关键点：举证责任在房东\n\n根据法律原则，**谁主张谁举证**。房东说墙壁是你弄坏的，他需要证明：\n1. 损坏是在你租住期间发生的\n2. 损坏超出了正常使用范围\n3. 损坏是你的过失造成的\n\n如果他拿不出这些证据，扣押金就站不住脚。\n\n---\n\n## 你现在能做的补救措施\n\n**1. 找邻居或物业作证** — 证明你平时居住正常，没有破坏行为\n\n**2. 查看入住时的交接单** — 如果当时签了，上面可能记录了原有状态\n\n**3. 要求房东提供证据** — 让他出示：\n- 带时间戳的损坏照片（证明是租住期间发生的）\n- 专业维修公司的报价单（非个人估价）\n\n**4. 微信记录也是证据** — 如果退租时房东没有当场提出异议，事后再说就更难成立了。\n\n---\n\n没有照片会增加一些难度，但这个案子本质上是**自然损耗 vs. 人为损坏**的定性问题，法律倾向于保护租户。要继续推进吗？', ts: Date.now() - 86400000 * 2 + 90000 },
      ]
    },
    {
      id: '1745200000002',
      title: '蛋壳公寓押金还能追回来吗',
      createdAt: Date.now() - 86400000 * 5, // 5天前
      messages: [
        { role: 'user', content: '蛋壳公寓爆雷最新进展，我的押金还能追回来吗？', ts: Date.now() - 86400000 * 5 },
        { role: 'assistant', content: '# 😔 蛋壳押金问题，你不是一个人在战斗\n\n先说一句：**遇到蛋壳爆雷真的太倒霉了**，辛苦挣的钱就这么被套住，那种无力感和愤怒完全可以理解。但好消息是——**这条路还没有走死，还有办法可以试**。\n\n---\n\n## 📋 目前的处理进展\n\n蛋壳公寓（寓意科技有限公司）已于2020年底进入破产清算程序，北京市第一中级人民法院受理了破产申请。\n\n**你的押金在法律上属于"债权"**，可以通过以下方式追回部分：\n\n---\n\n## ✅ 现在能做的事\n\n### 第一步：申报债权（最重要！）\n\n向破产管理人申报你的押金债权。需要准备：\n- 与蛋壳签订的租房合同\n- 押金付款凭证（银行转账记录/支付宝/微信记录）\n- 债权申报表（从法院或管理人处获取）\n\n> ⚠️ **注意截止日期**：债权申报有期限，请尽快行动！\n\n### 第二步：加入维权群体\n\n搜索"蛋壳公寓维权"加入相关群体，集体维权效果更好，也能获取最新进展。\n\n### 第三步：关注政府救助政策\n\n北京、上海等城市对蛋壳租客有专项政策，部分租客已获得补偿。\n\n---\n\n**能追回多少？** 根据破产财产分配情况，通常能追回押金的20%-50%，具体取决于你的债权顺位。', ts: Date.now() - 86400000 * 5 + 45000 },
      ]
    },
    {
      id: '1745200000003',
      title: '合同写了提前退租押金不退',
      createdAt: Date.now() - 86400000 * 8, // 8天前
      messages: [
        { role: 'user', content: '合同上写了提前退租押金不退，我因为工作调动必须提前走，押金真的没了吗？', ts: Date.now() - 86400000 * 8 },
        { role: 'assistant', content: '# 好消息：这个条款很可能无效！💡\n\n合同上写了不代表就一定合法。**《民法典》第496条**明确规定，格式合同中"加重对方责任"的条款可以被认定无效。\n\n「提前退租押金全部没收」就是典型的加重租户责任条款。\n\n---\n\n## 法律怎么说\n\n> **《民法典》第496条**：\n> 格式条款中免除或减轻提供格式条款一方责任、加重对方责任、限制对方主要权利的条款，对方可主张无效。\n\n> **《民法典》第585条**：\n> 违约金应当与实际损失相当，明显过高的可以申请法院适当减少。\n\n没收全部押金作为违约金，通常被认定为"明显过高"。\n\n---\n\n## ✅ 你的维权路径\n\n### 🟢 今天：发书面通知\n\n```\n您好，关于提前退租押金问题：\n\n合同中「提前退租押金不退」条款属于《民法典》第496条规定的格式条款，\n该条款加重了租户责任，依法应认定无效。\n\n提前退租属违约，我愿意支付合理违约金（建议：1个月租金），\n但没收全部押金明显超出实际损失，不具法律效力。\n\n请在7日内退还押金，扣除1个月违约金后的余额。\n```\n\n### 🟡 协商不成：申请调解\n\n向当地**住房租赁纠纷调解委员会**申请调解，免费且快速。\n\n### 🔴 最后手段：起诉\n\n法院通常判决：没收全部押金的条款无效，仅支持1个月租金作为违约金。\n\n---\n\n**你的押金是多少？租金多少？** 告诉我，我帮你算一下能追回多少。', ts: Date.now() - 86400000 * 8 + 35000 },
        { role: 'user', content: '押金3个月共9000元，月租3000，我提前了2个月退租', ts: Date.now() - 86400000 * 8 + 65000 },
        { role: 'assistant', content: '好，数字很清晰，帮你算一下：\n\n---\n\n## 💰 你的维权预期\n\n| 项目 | 金额 |\n|------|------|\n| 押金总额 | 9,000元 |\n| 合理违约金（1个月租金）| -3,000元 |\n| **预期追回** | **6,000元** |\n\n---\n\n## 法院的一般判决逻辑\n\n根据类似案例，法院通常认为：\n- 提前2个月退租，合理违约金 = **1个月租金 = 3,000元**\n- 没收全部9,000元押金属于惩罚性扣除，**明显不合理**\n- 判决结果：**退还6,000元**\n\n---\n\n## 📝 立刻行动：发这条消息给房东\n\n```\n您好，关于押金退还问题：\n\n本人因工作调动需提前退租，理解属于违约行为。\n愿意支付1个月租金（3000元）作为违约金。\n\n但根据《民法典》第496条及第585条，\n没收全部9000元押金明显超出实际损失，\n该格式条款依法无效。\n\n请在7日内退还押金余额6000元（9000-3000=6000元）。\n逾期将申请法律途径维权。\n```\n\n发完截图保存，这是你的维权证据！', ts: Date.now() - 86400000 * 8 + 95000 },
      ]
    },
    {
      id: '1745200000004',
      title: '中介公司跑路了押金怎么要',
      createdAt: Date.now() - 86400000 * 12,
      messages: [
        { role: 'user', content: '我通过一个小中介租的房子，现在中介公司联系不上了，押金5000块怎么要回来？', ts: Date.now() - 86400000 * 12 },
        { role: 'assistant', content: '# 中介跑路！先别慌，还有办法 🔍\n\n这种情况比你想象的常见，也有明确的法律路径。关键在于**搞清楚合同关系**。\n\n---\n\n## 第一步：判断你的合同是和谁签的\n\n**情况A：合同主体是房东**（中介只是中间人）\n→ 房东有义务退还押金，中介跑路不影响你向房东追偿\n\n**情况B：合同主体是中介**（中介以自己名义出租，即"二房东"）\n→ 中介承担全部责任，同时可追究房东连带责任\n\n你的合同上写的是谁的名字？\n\n---\n\n## 无论哪种情况，现在就做：\n\n### 🟢 立即：查中介公司信息\n\n通过**企查查**或**天眼查** APP 搜索中介公司名称，查看：\n- 公司是否已注销\n- 法定代表人是谁\n- 是否有其他投诉记录\n\n### 🟡 向住建委投诉中介\n\n中介公司无资质经营或卷款跑路，向当地**住建委**投诉，同时投诉到**房产经纪协会**。\n\n### 🔴 向公安报案\n\n如果中介明显是故意卷款（收钱后消失），金额超过3000元，可以向公安局报**合同诈骗**。\n\n---\n\n你的合同上写的是房东名字还是中介公司名字？', ts: Date.now() - 86400000 * 12 + 40000 },
      ]
    },
  ];

  function list() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  }

  function save(sessions) {
    localStorage.setItem(KEY, JSON.stringify(sessions));
  }

  function seedIfNeeded() {
    if (localStorage.getItem(SEEDED_KEY)) return; // 已注入过
    const existing = list();
    // 把预置数据追加到末尾（不覆盖用户已有的）
    const merged = [...existing, ...SEED_SESSIONS];
    save(merged);
    localStorage.setItem(SEEDED_KEY, '1');
  }

  function current() {
    return window._currentSessionId || null;
  }

  function create() {
    const id = String(Date.now());
    window._currentSessionId = id;
    return id;
  }

  function addMessage(role, content) {
    const id = current();
    if (!id) return;
    const sessions = list();
    const idx = sessions.findIndex(s => s.id === id);
    const msg = { role, content, ts: Date.now() };

    if (idx === -1) {
      const title = role === 'user' ? content.slice(0, 22) + (content.length > 22 ? '…' : '') : '新对话';
      const newSession = { id, title, createdAt: Date.now(), messages: [msg] };
      sessions.unshift(newSession);
      if (sessions.length > MAX) sessions.splice(MAX);
    } else {
      sessions[idx].messages.push(msg);
      if (role === 'user' && sessions[idx].messages.filter(m => m.role === 'user').length === 1) {
        sessions[idx].title = content.slice(0, 22) + (content.length > 22 ? '…' : '');
      }
    }
    save(sessions);
  }

  function load(id) {
    return list().find(s => s.id === id) || null;
  }

  function remove(id) {
    save(list().filter(s => s.id !== id));
    if (current() === id) window._currentSessionId = null;
  }

  return { list, create, current, addMessage, load, remove, seedIfNeeded };
})();

// ─── 历史记录 UI ──────────────────────────────────────────────────────────────

function renderHistoryList() {
  const container = document.getElementById('history-list');
  if (!container) return;
  const sessions = SessionManager.list();
  const curId = SessionManager.current();

  if (!sessions.length) {
    container.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">💬</div>
        <strong>暂无历史对话</strong>
        <p>开始第一次对话后<br>记录会自动保存在这里</p>
      </div>`;
    return;
  }

  // 按时间分组
  const now = Date.now();
  const DAY = 86400000;
  const groups = { today: [], yesterday: [], week: [], older: [] };

  sessions.forEach(s => {
    const diff = now - s.createdAt;
    if (diff < DAY) groups.today.push(s);
    else if (diff < DAY * 2) groups.yesterday.push(s);
    else if (diff < DAY * 7) groups.week.push(s);
    else groups.older.push(s);
  });

  const labels = { today: '今天', yesterday: '昨天', week: '本周', older: '更早' };
  let html = '';

  for (const [key, label] of Object.entries(labels)) {
    const list = groups[key];
    if (!list.length) continue;
    html += `<div class="history-group-label">${label}</div>`;
    html += list.map(s => {
      const timeStr = formatTime(new Date(s.createdAt));
      const active = s.id === curId ? ' active' : '';
      const msgCount = s.messages.length;
      // 根据标题选 icon
      const icon = s.title.includes('蛋壳') || s.title.includes('公寓') ? '💥'
                 : s.title.includes('中介') ? '🏃'
                 : s.title.includes('合同') ? '📄'
                 : s.title.includes('墙') || s.title.includes('地板') ? '🪟'
                 : '💬';
      return `<div class="history-item${active}" id="hist-${s.id}" onclick="loadSession('${s.id}')">
        <div class="history-item-icon">${icon}</div>
        <div class="history-item-body">
          <div class="history-item-title">${esc(s.title)}</div>
          <div class="history-item-meta">
            <span class="history-item-time">${timeStr}</span>
            <span class="history-item-count">${msgCount}条</span>
          </div>
        </div>
        <button class="history-item-del" onclick="deleteSession(event,'${s.id}')" title="删除">×</button>
      </div>`;
    }).join('');
  }

  container.innerHTML = html;
}

function formatTime(d) {
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function loadSession(id) {
  const session = SessionManager.load(id);
  if (!session || !session.messages.length) return;

  // 切换当前 session
  window._currentSessionId = id;
  conversationHistory = session.messages.map(m => ({ role: m.role, content: m.content }));

  // 清空对话区，重新渲染
  const wrap = document.getElementById('messages-wrap');
  hideWelcome();
  // 移除所有消息气泡（保留欢迎屏节点）
  wrap.querySelectorAll('.msg-row, .searching-indicator').forEach(el => el.remove());

  // 重新渲染所有消息
  session.messages.forEach(m => {
    if (m.role === 'user') {
      appendUserBubble(m.content);
    } else {
      const bubble = appendAIBubble();
      renderMd(bubble, m.content);
      addCopyBtns(bubble);
      injectLawLinks(bubble);
    }
  });

  scrollBottom();
  renderHistoryList();
  // 切回历史 tab
  switchTab('history');
}

function deleteSession(e, id) {
  e.stopPropagation();
  SessionManager.remove(id);
  // 如果删除的是当前 session，清空对话区
  if (!SessionManager.current()) {
    newChat();
  }
  renderHistoryList();
}

function newChat() {
  window._currentSessionId = null;
  conversationHistory = [];
  const wrap = document.getElementById('messages-wrap');
  wrap.querySelectorAll('.msg-row, .searching-indicator').forEach(el => el.remove());
  const welcome = document.getElementById('welcome-screen');
  if (welcome) {
    welcome.style.display = '';
    welcome.style.opacity = '1';
    welcome.style.transform = '';
  }
  updateStage(0);
  renderHistoryList();
}

function switchTab(tab) {
  ['history', 'cases', 'laws'].forEach(t => {
    document.getElementById(`tab-${t}`)?.classList.toggle('active', t === tab);
    document.getElementById(`panel-${t}`)?.classList.toggle('active', t === tab);
  });
}

// ─── 法律链接注入 ─────────────────────────────────────────────────────────────

function injectLawLinks(bubble) {
  // 只处理文本节点，避免破坏已有 HTML 结构
  walkTextNodes(bubble, node => {
    const text = node.textContent;
    if (!LAW_PATTERN.test(text)) return;
    LAW_PATTERN.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = LAW_PATTERN.exec(text)) !== null) {
      // 文字前缀
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      // 原始条文文字
      frag.appendChild(document.createTextNode(m[0]));
      // 找链接
      const url = findLawUrl(m[0]);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'law-link';
        a.textContent = '原文';
        a.title = '查看官方原文（全国人大法律数据库）';
        frag.appendChild(a);
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));

    node.parentNode.replaceChild(frag, node);
  });
}

function findLawUrl(text) {
  // 精确匹配
  if (LAW_LINKS[text]) return LAW_LINKS[text];
  // 模糊匹配：包含「民法典第XXX条」
  const numMatch = text.match(/第(\d+)条/);
  if (numMatch && (text.includes('民法典') || text.includes('《民法典》'))) {
    return NPC_MINFADIAN;
  }
  if (text.includes('消费者权益保护法')) return NPC_XFZQHBHF;
  return NPC_BASE;
}

function walkTextNodes(el, fn) {
  // 跳过 a 标签（避免重复处理）、pre/code（模板内容）
  if (el.nodeType === Node.TEXT_NODE) { fn(el); return; }
  if (['A', 'PRE', 'CODE', 'SCRIPT'].includes(el.tagName)) return;
  // 倒序遍历，避免 DOM 修改影响迭代
  const children = Array.from(el.childNodes);
  children.forEach(child => walkTextNodes(child, fn));
}

// ─── 核心发送逻辑 ─────────────────────────────────────────────────────────────

async function sendMessage(text) {
  text = (text || '').trim();
  if (!text || isStreaming) return;

  // 清输入框，隐藏欢迎屏
  const ta = document.getElementById('chat-input');
  if (ta) { ta.value = ''; autoResize(ta); }
  hideWelcome();

  // 确保有 session id
  if (!SessionManager.current()) SessionManager.create();

  appendUserBubble(text);
  conversationHistory.push({ role: 'user', content: text });
  SessionManager.addMessage('user', text);
  renderHistoryList();

  setStreaming(true);
  updateStage(1);

  const bubble = appendAIBubble();
  let fullText = '';
  let searchingEl = null;

  try {
    const resp = await fetch(`${API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory, enable_web_search: true })
    });

    if (!resp.ok) {
      bubble.innerHTML = `<span style="color:var(--warn)">服务暂时不可用（${resp.status}），请稍后重试。</span>`;
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      const parts = buf.split('\n\n');
      buf = parts.pop();

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data:')) continue;
        const raw = line.slice(5).trim();
        if (!raw) continue;
        let evt;
        try { evt = JSON.parse(raw); } catch { continue; }

        if (evt.type === 'searching') {
          if (!searchingEl) {
            searchingEl = document.createElement('div');
            searchingEl.className = 'searching-indicator';
            searchingEl.innerHTML = `<div class="searching-dots"><span></span><span></span><span></span></div><span>${evt.message || '正在搜索最新案例…'}</span>`;
            bubble.parentElement.insertBefore(searchingEl, bubble.parentElement.lastChild);
            scrollBottom();
          } else {
            searchingEl.querySelector('span:last-child').textContent = evt.message || '正在搜索…';
          }
          updateStage(2);

        } else if (evt.type === 'text') {
          if (searchingEl) { searchingEl.remove(); searchingEl = null; }
          updateStage(3);
          fullText += evt.content;
          bubble.textContent = fullText;
          scrollBottom();

        } else if (evt.type === 'done') {
          if (searchingEl) { searchingEl.remove(); searchingEl = null; }
          renderMd(bubble, fullText);
          addCopyBtns(bubble);
          injectLawLinks(bubble);   // ← 注入法律原文链接
          scrollBottom();
          updateStage(3);
          conversationHistory.push({ role: 'assistant', content: fullText });
          SessionManager.addMessage('assistant', fullText);
          renderHistoryList();
          updateSidebarChecklist(fullText);
          updateSidebarRelated(fullText);

        } else if (evt.type === 'error') {
          if (searchingEl) { searchingEl.remove(); searchingEl = null; }
          bubble.innerHTML = `<span style="color:var(--warn)">⚠️ ${evt.message}</span>`;
        }
      }
    }

    // 流截断兜底
    if (fullText && bubble.textContent === fullText) {
      renderMd(bubble, fullText);
      addCopyBtns(bubble);
      injectLawLinks(bubble);
      conversationHistory.push({ role: 'assistant', content: fullText });
      SessionManager.addMessage('assistant', fullText);
      renderHistoryList();
    }

  } catch (err) {
    if (searchingEl) searchingEl.remove();
    bubble.innerHTML = `<span style="color:var(--warn)">⚠️ 网络错误：${err.message}。请确认后端已启动（python3 main.py）</span>`;
  } finally {
    setStreaming(false);
  }
}

// ─── DOM 操作 ─────────────────────────────────────────────────────────────────

function appendUserBubble(text) {
  const wrap = document.getElementById('messages-wrap');
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.innerHTML = `<div class="msg-avatar">👤</div><div class="msg-bubble">${esc(text)}</div>`;
  wrap.appendChild(row);
  scrollBottom();
}

function appendAIBubble() {
  const wrap = document.getElementById('messages-wrap');
  const row = document.createElement('div');
  row.className = 'msg-row ai';
  row.innerHTML = `<div class="msg-avatar">🛡️</div><div class="msg-bubble"><span class="typing-cursor"></span></div>`;
  wrap.appendChild(row);
  scrollBottom();
  return row.querySelector('.msg-bubble');
}

function renderMd(el, text) {
  el.querySelector('.typing-cursor')?.remove();
  if (typeof marked !== 'undefined') {
    marked.setOptions({ breaks: true, gfm: true });
    el.innerHTML = marked.parse(text);
  } else {
    el.innerHTML = esc(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }
}

function addCopyBtns(bubble) {
  bubble.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.copy-code-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.textContent = '复制';
    btn.onclick = () => {
      const code = pre.querySelector('code');
      const text = (code ? code.textContent : pre.textContent).trim();
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✓ 已复制';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('copied'); }, 2000);
      });
    };
    pre.appendChild(btn);
  });
}

// ─── 侧边栏动态更新 ───────────────────────────────────────────────────────────

async function loadSidebarCases() {
  try {
    const res = await fetch(`${API}/api/cases`);
    const data = await res.json();
    window._casesCache = data.cases || [];
    renderCaseList(data.cases.slice(0, 5));
  } catch (_) {}
}

function renderCaseList(cases) {
  const container = document.getElementById('sidebar-cases');
  if (!container) return;
  container.innerHTML = cases.map(c => {
    const cat = getCategoryInfo(c.category);
    return `<div class="sidebar-case-card" onclick="fillFromCase('${c.id}')">
      <div class="sidebar-case-title">${cat.icon} ${c.title}</div>
      <div class="sidebar-case-rate">胜率 ${c.success_rate}%</div>
    </div>`;
  }).join('');
}

async function fillFromCase(caseId) {
  try {
    const res = await fetch(`${API}/api/cases/${caseId}`);
    if (!res.ok) return;
    const c = await res.json();
    const ta = document.getElementById('chat-input');
    if (ta) { ta.value = `我遇到了类似「${c.title}」的情况，请帮我分析。`; ta.focus(); autoResize(ta); }
  } catch (_) {}
}

function updateSidebarChecklist(text) {
  const MAP = [
    { key: '照片',  label: '入住/退租时的照片或录像' },
    { key: '录像',  label: '入住/退租时的照片或录像' },
    { key: '合同',  label: '租房合同原件' },
    { key: '押金',  label: '押金收据/付款凭证' },
    { key: '微信',  label: '与房东的微信/短信记录' },
    { key: '短信',  label: '与房东的微信/短信记录' },
    { key: '发票',  label: '房东出具的维修发票' },
    { key: '投诉',  label: '投诉/报案记录' },
    { key: '转账',  label: '银行转账记录' },
  ];
  const container = document.getElementById('evidence-list');
  if (!container) return;
  const seen = new Set();
  const items = MAP.filter(m => {
    if (text.includes(m.key) && !seen.has(m.label)) { seen.add(m.label); return true; }
    return false;
  });
  if (!items.length) return;
  container.innerHTML = items.map(m => `
    <label class="check-item">
      <input type="checkbox" onchange="this.parentElement.classList.toggle('checked',this.checked)">
      ${m.label}
    </label>`).join('');
}

function updateSidebarRelated(text) {
  const cases = window._casesCache || [];
  if (!cases.length) return;
  const words = text.split(/[\s，。？！、]/);
  const scored = cases.map(c => {
    let score = 0;
    const blob = [c.title, c.subtitle, ...(c.keywords || [])].join(' ');
    words.forEach(w => { if (w.length >= 2 && blob.includes(w)) score++; });
    return { score, c };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  if (!scored.length) return;
  renderCaseList(scored.map(x => x.c));
  // 切换到案例 tab
  switchTab('cases');
}

// ─── 阶段指示器 ───────────────────────────────────────────────────────────────

function updateStage(n) {
  // 新 UI：stage-pill（顶部栏）
  ['sp-1','sp-2','sp-3'].forEach((id, i) => {
    document.getElementById(id)?.classList.toggle('active', i < n);
  });
  // 兼容旧 UI：stage-item
  document.querySelectorAll('.stage-item').forEach((el, i) => {
    el.classList.toggle('active', i < n);
  });
}

// ─── 辅助 ─────────────────────────────────────────────────────────────────────

function scrollBottom() {
  const w = document.getElementById('messages-wrap');
  if (w) w.scrollTop = w.scrollHeight;
}

function setStreaming(v) {
  isStreaming = v;
  const btn = document.getElementById('send-btn');
  if (btn) btn.disabled = v;
  // 新 UI：topbar-status
  const st = document.getElementById('topbar-status');
  if (st) {
    st.innerHTML = v
      ? '<span class="status-dot-sm" style="background:#f59e0b;animation:none"></span><span style="color:#b45309">正在分析…</span>'
      : '<span class="status-dot-sm"></span>在线';
  }
  // 兼容旧 UI
  const st2 = document.getElementById('chat-status-text');
  if (st2) st2.textContent = v ? '正在分析中…' : '在线 · 随时为你提供帮助';
}

function setupTextarea() {
  const ta = document.getElementById('chat-input');
  if (ta) ta.addEventListener('input', () => autoResize(ta));
}

function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function setupKeyboard() {
  const ta = document.getElementById('chat-input');
  if (!ta) return;
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
}

function setupQuickReplies() {
  const c = document.getElementById('quick-replies');
  if (!c) return;
  c.innerHTML = QUICK_REPLIES.map(r =>
    `<button class="quick-reply" onclick="useReply('${r}')">${r}</button>`
  ).join('');
}

function useReply(text) {
  const ta = document.getElementById('chat-input');
  if (ta) { ta.value = text; ta.focus(); autoResize(ta); }
}

function handleSend() {
  const ta = document.getElementById('chat-input');
  const text = ta ? ta.value.trim() : '';
  if (text) sendMessage(text);
}

function startWithStarter(text) { sendMessage(text); }

function insertLaw(text) {
  const ta = document.getElementById('chat-input');
  if (ta) { ta.value = ta.value ? ta.value + '\n' + text : text; ta.focus(); }
}

function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ─── 侧边栏折叠 ──────────────────────────────────────────────────────────────

const SIDEBAR_KEY = 'dg_sidebar_collapsed';

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // 移动端：滑入/滑出
    const open = sidebar.classList.toggle('mobile-open');
    overlay?.classList.toggle('show', open);
  } else {
    // 桌面端：折叠/展开（记住状态）
    const shell = document.querySelector('.app-shell');
    const collapsed = sidebar.classList.toggle('collapsed');
    shell?.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  }
}

function restoreSidebarState() {
  if (window.innerWidth <= 768) return;
  const collapsed = localStorage.getItem(SIDEBAR_KEY) === '1';
  if (collapsed) {
    document.getElementById('sidebar')?.classList.add('collapsed');
    document.querySelector('.app-shell')?.classList.add('sidebar-collapsed');
  }
}

// ─── 欢迎屏隐藏（新 UI 用 flex:1 撑开，需要特殊处理）────────────────────────

function hideWelcome() {
  const w = document.getElementById('welcome-screen');
  if (!w) return;
  w.style.transition = 'opacity 0.2s, transform 0.2s';
  w.style.opacity = '0';
  w.style.transform = 'scale(0.97)';
  setTimeout(() => { w.style.display = 'none'; }, 200);
}

// ─── 初始化 ──────────────────────────────────────────────────────────────────

async function init() {
  restoreSidebarState();
  setupTextarea();
  setupQuickReplies();
  setupKeyboard();
  SessionManager.seedIfNeeded();
  renderHistoryList();
  await loadSidebarCases();

  const params = new URLSearchParams(location.search);
  const caseId = params.get('case');
  if (caseId) {
    try {
      const res = await fetch(`${API}/api/cases/${caseId}`);
      if (res.ok) {
        const c = await res.json();
        setTimeout(() => sendMessage(`我遇到了「${c.title}」的情况：${c.subtitle}。请帮我分析该怎么处理。`), 300);
      }
    } catch (_) {}
  }
}

// 窗口 resize 时处理移动端 overlay
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
  }
});

document.addEventListener('DOMContentLoaded', init);
