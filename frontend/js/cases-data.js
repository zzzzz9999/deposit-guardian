// 前端内嵌分类数据（与 backend/cases.json 同步）
const CASES_DATA = {
  categories: [
    // ── 押金纠纷 ──────────────────────────────────────────
    {id:'deposit_wear',    name:'押金·损耗纠纷',  icon:'🪟',color:'#10b981',group:'押金纠纷', desc:'房东把正常居住损耗算成你的过错'},
    {id:'deposit_contract',name:'押金·合同陷阱',  icon:'📄',color:'#f59e0b',group:'押金纠纷', desc:'合同里藏着不合理的扣押金条款'},
    {id:'deposit_agent',   name:'押金·中介跑路',  icon:'🏃',color:'#ef4444',group:'押金纠纷', desc:'中介卷款消失，押金两头落空'},
    {id:'deposit_delay',   name:'押金·拖延推诿',  icon:'⏰',color:'#8b5cf6',group:'押金纠纷', desc:'各种借口就是不退，耗尽你的耐心'},
    {id:'deposit_fake',    name:'押金·无中生有',  icon:'🎭',color:'#ec4899',group:'押金纠纷', desc:'凭空捏造损坏，索取天价赔偿'},
    {id:'deposit_platform',name:'押金·长租爆雷',  icon:'💥',color:'#f97316',group:'押金纠纷', desc:'品牌长租公寓跑路，押金打水漂'},
    // ── 租住权益 ──────────────────────────────────────────
    {id:'rent_raise',      name:'租住·随意涨租',  icon:'📈',color:'#0ea5e9',group:'租住权益', desc:'租期内突然涨价，威胁不涨就搬走'},
    {id:'rent_intrude',    name:'租住·擅闯房间',  icon:'🚪',color:'#6366f1',group:'租住权益', desc:'不打招呼就进门，侵犯居住隐私'},
    {id:'rent_facility',   name:'租住·设施不修',  icon:'🔧',color:'#84cc16',group:'租住权益', desc:'水电暖气坏了，房东拖着不维修'},
    {id:'rent_evict',      name:'租住·强制驱逐',  icon:'🏠',color:'#f43f5e',group:'租住权益', desc:'租期未到被强制要求搬走'},
    // ── 签约陷阱 ──────────────────────────────────────────
    {id:'sign_fraud',      name:'签约·虚假房源',  icon:'🎪',color:'#a78bfa',group:'签约陷阱', desc:'照片与实际严重不符，被骗签合同'},
    {id:'sign_clause',     name:'签约·霸王条款',  icon:'⚖️',color:'#fb923c',group:'签约陷阱', desc:'合同里藏着各种不合理强制条款'},
  ]
};

// 按 group 分组
function getCategoryGroups() {
  const groups = {};
  CASES_DATA.categories.forEach(c => {
    if (!groups[c.group]) groups[c.group] = [];
    groups[c.group].push(c);
  });
  return groups;
}

// 本地搜索
function localSearch(query, category = null) {
  if (!window._casesCache) return [];
  const cases = category
    ? window._casesCache.filter(c => c.category === category)
    : window._casesCache;
  if (!query.trim()) return cases;
  const q = query.toLowerCase();
  const words = q.split(/\s+/);
  return cases
    .map(c => {
      let score = 0;
      const text = [c.title, c.subtitle, c.description, ...(c.keywords||[]), ...(c.landlord_scripts||[])].join(' ').toLowerCase();
      words.forEach(w => { if (text.includes(w)) score += 2; });
      if (words.some(w => c.title.toLowerCase().includes(w))) score += 3;
      return { score, case: c };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.case);
}

function getCategoryInfo(categoryId) {
  return CASES_DATA.categories.find(c => c.id === categoryId) || {icon:'📋',name:'其他',color:'#94a3b8'};
}

function getDifficultyLabel(d) {
  return {easy:'相对容易', medium:'需要坚持', hard:'需要专业帮助'}[d] || d;
}
