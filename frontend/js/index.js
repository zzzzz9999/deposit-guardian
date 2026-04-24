// ===== 首页逻辑 =====

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:8000' : '';

let allCases = [];
let activeCategory = null;
let activeGroup = '';
let searchTimeout = null;

// ─── 初始化 ──────────────────────────────────────────────────────────────────
async function init() {
  await loadCases();
  renderCategoryTabs();
  renderCases(allCases);
  setupSearch();
}

async function loadCases() {
  try {
    const res = await fetch(`${API}/api/cases`);
    const data = await res.json();
    allCases = data.cases || [];
    window._casesCache = allCases;
  } catch (e) {
    document.getElementById('cases-grid').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">⚠️</div>
        <h3>无法连接服务器</h3>
        <p>请确保后端服务已启动（python main.py）</p>
      </div>`;
  }
}

// ─── 分类标签 ─────────────────────────────────────────────────────────────────
function renderCategoryTabs(groupFilter) {
  const tabs = document.getElementById('category-tabs');
  if (!tabs) return;

  const cats = groupFilter
    ? CASES_DATA.categories.filter(c => c.group === groupFilter)
    : CASES_DATA.categories;

  let html = `<button class="cat-tab ${!activeCategory ? 'active' : ''}" data-cat="" onclick="filterByCategory(this,'')">
    <span>全部</span>
  </button>`;

  cats.forEach(cat => {
    const isActive = activeCategory === cat.id ? ' active' : '';
    html += `<button class="cat-tab${isActive}" data-cat="${cat.id}" onclick="filterByCategory(this,'${cat.id}')">
      <span class="cat-icon">${cat.icon}</span>
      <span>${cat.name}</span>
    </button>`;
  });

  tabs.innerHTML = html;
}

// ─── 分组过滤 ─────────────────────────────────────────────────────────────────
function filterGroup(el, group) {
  activeGroup = group;
  activeCategory = null;

  document.querySelectorAll('.group-filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  renderCategoryTabs(group);

  const filtered = group
    ? allCases.filter(c => {
        const cat = getCategoryInfo(c.category);
        return cat.group === group;
      })
    : allCases;
  renderCases(filtered);
}

// ─── 分类过滤 ─────────────────────────────────────────────────────────────────
function filterByCategory(el, catId) {
  activeCategory = catId || null;
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');

  let filtered = allCases;
  if (catId) {
    filtered = allCases.filter(c => c.category === catId);
  } else if (activeGroup) {
    filtered = allCases.filter(c => {
      const cat = getCategoryInfo(c.category);
      return cat.group === activeGroup;
    });
  }
  renderCases(filtered);
}

// ─── 渲染案例卡片 ─────────────────────────────────────────────────────────────
function renderCases(cases) {
  const grid = document.getElementById('cases-grid');
  if (!grid) return;

  if (!cases.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🔍</div>
      <h3>没有找到相关案例</h3>
      <p>试试其他关键词，或直接向AI描述你的情况</p>
    </div>`;
    return;
  }

  grid.innerHTML = cases.map(c => renderCaseCard(c)).join('');
}

function renderCaseCard(c) {
  const cat = getCategoryInfo(c.category);
  const scripts = (c.landlord_scripts || []).slice(0, 2);
  const diffLabel = getDifficultyLabel(c.difficulty);

  // 分组标签颜色
  const groupColors = {'押金纠纷':'#1a56db','租住权益':'#059669','签约陷阱':'#d97706'};
  const groupColor = groupColors[cat.group] || '#64748b';

  return `
  <div class="case-card" style="--card-accent: ${cat.color}"
       onclick="window.location.href='case.html?id=${c.id}'">
    <div class="case-card-header">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span style="font-size:0.68rem;font-weight:700;padding:2px 7px;border-radius:4px;
                     background:${groupColor}12;color:${groupColor}">${cat.group}</span>
        <span class="case-cat-badge" style="background:${cat.color}18;color:${cat.color}">
          ${cat.icon} ${cat.name.split('·')[1] || cat.name}
        </span>
      </div>
      <div class="case-meta">
        <span class="success-badge">胜率 ${c.success_rate}%</span>
        <span class="difficulty-badge">${diffLabel}</span>
      </div>
    </div>
    <div class="case-title">${c.title}</div>
    <div class="case-subtitle">${c.subtitle}</div>
    ${scripts.length ? `
    <div class="case-scripts">
      <div class="case-scripts-label">常见话术</div>
      ${scripts.map(s => `<div class="case-script-item">${s}</div>`).join('')}
    </div>` : ''}
    <div class="case-card-footer">
      <a href="case.html?id=${c.id}" class="btn-sm btn-outline" onclick="event.stopPropagation()">查看详情</a>
      <a href="chat.html?case=${c.id}" class="btn-sm btn-primary" onclick="event.stopPropagation()">AI帮我分析</a>
    </div>
  </div>`;
}

// ─── 搜索 ─────────────────────────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  if (!input) return;

  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();
    if (!q) {
      results.classList.remove('show');
      renderCases(activeCategory ? allCases.filter(c => c.category === activeCategory) : allCases);
      return;
    }
    searchTimeout = setTimeout(() => {
      const found = localSearch(q, activeCategory);
      showSearchDropdown(found, q);
      renderCases(found);
    }, 200);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { results.classList.remove('show'); input.value = ''; renderCases(allCases); }
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !results.contains(e.target)) results.classList.remove('show');
  });
}

function showSearchDropdown(cases, query) {
  const results = document.getElementById('search-results');
  if (!results) return;

  if (!cases.length) {
    results.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.88rem">
      未找到匹配案例，可以直接向AI描述你的情况
      <br><a href="chat.html" style="color:var(--primary);font-weight:600">开始AI对话 →</a>
    </div>`;
    results.classList.add('show');
    return;
  }

  results.innerHTML = cases.slice(0, 5).map(c => {
    const cat = getCategoryInfo(c.category);
    return `<div class="search-result-item" onclick="window.location.href='case.html?id=${c.id}'">
      <span class="search-result-cat" style="background:${cat.color}18;color:${cat.color}">${cat.icon} ${cat.name}</span>
      <div>
        <div class="search-result-title">${highlightText(c.title, query)}</div>
        <div class="search-result-sub">${c.subtitle}</div>
      </div>
    </div>`;
  }).join('');

  if (cases.length > 5) {
    results.innerHTML += `<div style="padding:10px 16px;text-align:center;font-size:0.82rem;color:var(--text-muted)">
      还有 ${cases.length - 5} 个结果，已在下方显示
    </div>`;
  }
  results.classList.add('show');
}

function highlightText(text, query) {
  const words = query.toLowerCase().split(/\s+/);
  let result = text;
  words.forEach(w => {
    if (w) result = result.replace(new RegExp(`(${w})`, 'gi'), '<mark style="background:#fef3c7;padding:0 2px;border-radius:2px">$1</mark>');
  });
  return result;
}

document.addEventListener('DOMContentLoaded', init);
