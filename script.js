/* ====== 🥜 花生 - How to Cost Your Life (script.js) ======
   - 无构建，直接用 localStorage 保存数据
   - 主要数据结构保存在 localStorage 的 keys:
     - peanut_entries: Array of entries
     - peanut_budgets: Object {category: budgetNumber}
     - peanut_settings: general settings
   - 备注：注释清晰，便于扩展
*/

/* ---------- Utilities ---------- */
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));
const formatDateTime = dt => {
  const d = new Date(dt);
  return d.toLocaleString();
};
const todayISOStringLocal = () => {
  const d = new Date();
  // local datetime-local expects yyyy-mm-ddThh:mm
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const LOCAL_KEYS = {
  ENTRIES: 'peanut_entries',
  BUDGETS: 'peanut_budgets',
  SETTINGS: 'peanut_settings',
};

const DEFAULT_CATEGORIES = ['餐饮','购物','娱乐','美妆','交通','生活','医疗','其他'];

/* ---------- Sample Images (small SVG data URLs) ---------- */
const SAMPLE_IMAGES = [
  // coffee svg
  'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect rx='18' width='100%' height='100%' fill='#F6C79E'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='40' fill='#6B3E2B' font-family='Arial'>☕️</text></svg>`),
  // shopping bag
  'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect rx='18' width='100%' height='100%' fill='#9ED2C6'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='40' fill='#114B41'>🛍️</text></svg>`),
  // travel
  'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect rx='18' width='100%' height='100%' fill='#F6EEF6'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='40' fill='#7B3FBF'>🚗</text></svg>`),
];

/* ---------- Storage helpers ---------- */
function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('loadData error', e);
    return fallback;
  }
}
function saveData(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

/* ---------- Data Model ---------- */
let ENTRIES = loadData(LOCAL_KEYS.ENTRIES, null);
let BUDGETS = loadData(LOCAL_KEYS.BUDGETS, null);
let SETTINGS = loadData(LOCAL_KEYS.SETTINGS, { theme: 'soft', lastSync: null });

/* If first load, create sample data */
if (!ENTRIES) {
  ENTRIES = [
    {
      id: genId(),
      amount: 28.5,
      category: '餐饮',
      datetime: new Date(Date.now()-2*24*3600*1000).toISOString(),
      note: '和朋友下午茶，心情超好~',
      mood: '开心',
      photos: [SAMPLE_IMAGES[0]],
    },
    {
      id: genId(),
      amount: 399.0,
      category: '购物',
      datetime: new Date(Date.now()-10*24*3600*1000).toISOString(),
      note: '买了双新鞋子（冲动）',
      mood: '解压',
      photos: [SAMPLE_IMAGES[1]],
    },
    {
      id: genId(),
      amount: 15.2,
      category: '交通',
      datetime: new Date(Date.now()-1*24*3600*1000).toISOString(),
      note: '打车回家',
      mood: '',
      photos: [SAMPLE_IMAGES[2]],
    }
  ];
  saveData(LOCAL_KEYS.ENTRIES, ENTRIES);
}

if (!BUDGETS) {
  BUDGETS = {};
  DEFAULT_CATEGORIES.forEach(c => BUDGETS[c] = Math.round((Math.random()*800 + 200))); // random budgets
  saveData(LOCAL_KEYS.BUDGETS, BUDGETS);
}

/* ---------- Helpers & DOM References ---------- */
const entriesListEl = qs('#entries-list');
const filterCategoryEl = qs('#filter-category');
const filterSortEl = qs('#filter-sort');
const filterRangeEl = qs('#filter-range');
const toggleFlowEl = qs('#toggle-flow');
const toggleAlbumEl = qs('#toggle-album');
const inputCategoryEl = qs('#input-category');
const inputAmountEl = qs('#input-amount');
const inputDatetimeEl = qs('#input-datetime');
const inputNoteEl = qs('#input-note');
const inputMoodEl = qs('#input-mood');
const inputPhotoEl = qs('#input-photo');
const photoPreviewEl = qs('#photo-preview');
const entryFormEl = qs('#entry-form');
const btnSimPay = qs('#btn-sim-pay');
const btnScanPay = qs('#btn-scan-pay');
const warningBannerEl = qs('#warning-banner');
const budgetOverviewEl = qs('#budget-overview');
const budgetsEditorEl = qs('#budgets-editor');
const statsRangeEl = qs('#stats-range');
const statsToggleChartEl = qs('#stats-toggle-chart');
const monthlySummaryEl = qs('#monthly-summary');
const btnExportPdf = qs('#btn-export-pdf');
const btnClearData = qs('#btn-clear-data');
const btnEditBudgets = qs('#btn-edit-budgets');
const btnReport = qs('#btn-report');
const shareCardEl = qs('#share-card');

/* Chart instances */
let pieChart = null;
let trendChart = null;
let currentTrendMode = 'line'; // or 'bar'

/* ---------- Initialization ---------- */
function init() {
  populateCategorySelects();
  renderBudgetOverview();
  renderEntries();
  renderBudgetsEditor();
  setupEventListeners();
  initForms();

  // initial charts
  updateCharts();

  // initial warning check
  checkTrendWarning();

  // set datetime input default
  inputDatetimeEl.value = todayISOStringLocal();
}

/* ---------- ID generator ---------- */
function genId() {
  return 'id_' + Math.random().toString(36).slice(2,11);
}

/* ---------- Render functions ---------- */
function populateCategorySelects() {
  // categories may grow from BUDGETS keys
  const categories = Array.from(new Set([...DEFAULT_CATEGORIES, ...Object.keys(BUDGETS || {})]));
  [filterCategoryEl, inputCategoryEl].forEach(sel => {
    sel.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = sel === filterCategoryEl ? 'all' : '';
    optAll.textContent = sel === filterCategoryEl ? '全部分类' : '选择分类';
    sel.appendChild(optAll);
    categories.forEach(c => {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      sel.appendChild(o);
    });
  });
}

function renderEntries() {
  // Get filter values
  const cat = filterCategoryEl.value;
  const sort = filterSortEl.value;
  const range = filterRangeEl.value;

  let items = [...ENTRIES];
  if (cat && cat !== 'all') {
    items = items.filter(i => i.category === cat);
  }

  const now = Date.now();
  if (range === '7' || range === '30' || range === 'month') {
    let days = range === 'month' ? 30 : parseInt(range);
    const since = now - days * 24*3600*1000;
    items = items.filter(i => new Date(i.datetime).getTime() >= since);
  }

  items.sort((a,b) => {
    if (sort === 'asc') return new Date(a.datetime) - new Date(b.datetime);
    return new Date(b.datetime) - new Date(a.datetime);
  });

  // toggle classes for album vs dynamic
  const isAlbum = entriesListEl.classList.contains('album');

  // render
  entriesListEl.innerHTML = '';
  items.forEach((entry, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${(idx%6)*40}ms`; // stagger
    // thumb
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const img = document.createElement('img');
    img.src = entry.photos && entry.photos[0] ? entry.photos[0] : SAMPLE_IMAGES[0];
    img.alt = entry.note || entry.category;
    img.addEventListener('click', () => openImageModal(img.src));
    thumb.appendChild(img);

    // info
    const info = document.createElement('div');
    info.className = 'info';
    const row1 = document.createElement('div');
    row1.className = 'row';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = `¥${entry.amount.toFixed(2)}`;
    const metaRight = document.createElement('div');
    metaRight.className = 'meta-right';
    metaRight.innerHTML = `<div class="meta">${entry.category}</div>`;

    row1.appendChild(title);
    row1.appendChild(metaRight);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${formatDateTime(entry.datetime)} ${entry.mood ? ' · ' + entry.mood : ''}`;

    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = entry.note || '';

    // actions
    const actions = document.createElement('div');
    actions.className = 'meta';
    actions.style.marginTop = '8px';
    actions.innerHTML = `<button class="small" data-id="${entry.id}" title="分享"><i class="ri-share-line"></i> 分享</button>
                         <button class="small" data-id="${entry.id}" title="编辑"><i class="ri-edit-2-line"></i> 编辑</button>
                         <button class="small danger" data-id="${entry.id}" title="删除"><i class="ri-delete-bin-line"></i></button>`;

    info.appendChild(row1);
    info.appendChild(meta);
    info.appendChild(note);
    info.appendChild(actions);

    card.appendChild(thumb);
    card.appendChild(info);
    entriesListEl.appendChild(card);

    // wire up buttons
    const shareBtn = actions.querySelector('button[title="分享"]');
    shareBtn.addEventListener('click', () => shareEntry(entry));

    const editBtn = actions.querySelector('button[title="编辑"]');
    editBtn.addEventListener('click', () => loadEntryToForm(entry));

    const delBtn = actions.querySelector('button[title="删除"]');
    delBtn.addEventListener('click', () => {
      if (confirm('确认删除该条记录？')) {
        ENTRIES = ENTRIES.filter(e => e.id !== entry.id);
        saveData(LOCAL_KEYS.ENTRIES, ENTRIES);
        renderEntries();
        renderBudgetOverview();
        updateCharts();
      }
    });
  });

  // empty state
  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.style.justifyContent = 'center';
    empty.style.textAlign = 'center';
    empty.innerHTML = '<div style="opacity:0.7">暂无记录，去“记录”页快速记一笔吧~</div>';
    entriesListEl.appendChild(empty);
  }
}

/* ---------- Budget overview ---------- */
function renderBudgetOverview() {
  budgetOverviewEl.innerHTML = '';
  // show top 3 budgets with progress
  const categories = Object.keys(BUDGETS);
  categories.slice(0, 5).forEach(cat => {
    const totalSpent = ENTRIES.filter(e => e.category === cat).reduce((s,e) => s + Number(e.amount||0), 0);
    const budget = BUDGETS[cat] || 0;
    const percent = budget > 0 ? Math.min(100, Math.round(totalSpent / budget * 100)) : 0;
    const item = document.createElement('div');
    item.className = 'budget-item';
    item.innerHTML = `<div class="left">
                        <h4>${cat} <span class="meta">¥${totalSpent.toFixed(2)} / ¥${budget}</span></h4>
                        <div class="progress ${percent>100 ? 'over':''}" title="${percent}%">
                          <i style="width:${percent}%;"></i>
                        </div>
                      </div>
                      <div class="right" style="text-align:right">
                        ${percent>100 ? '<div style="color:var(--danger);font-weight:700">已超支</div>' : `<div class="meta">${percent}%</div>`}
                      </div>`;
    budgetOverviewEl.appendChild(item);
  });
}

/* ---------- Budgets editor ---------- */
function renderBudgetsEditor() {
  budgetsEditorEl.innerHTML = '';
  Object.keys(BUDGETS).forEach(cat => {
    const row = document.createElement('div');
    row.className = 'budget-editor-row';
    const label = document.createElement('div');
    label.style.flex = '1';
    label.innerHTML = `<strong>${cat}</strong><div class="meta">当前预算</div>`;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 0;
    input.value = BUDGETS[cat];
    input.addEventListener('change', () => {
      BUDGETS[cat] = Number(input.value || 0);
      saveData(LOCAL_KEYS.BUDGETS, BUDGETS);
      renderBudgetOverview();
      populateCategorySelects();
    });
    row.appendChild(label);
    row.appendChild(input);
    budgetsEditorEl.appendChild(row);
  });
}

/* ---------- Form actions ---------- */
let currentEditingId = null;
function initForms() {
  // Reset form
  entryFormEl.addEventListener('submit', e => {
    e.preventDefault();
    const amount = Number(inputAmountEl.value || 0);
    if (!amount || amount <= 0) {
      alert('请输入有效金额');
      return;
    }
    const item = {
      id: currentEditingId || genId(),
      amount: Number(amount.toFixed(2)),
      category: inputCategoryEl.value || DEFAULT_CATEGORIES[0],
      datetime: new Date(inputDatetimeEl.value).toISOString(),
      mood: inputMoodEl.value || '',
      note: inputNoteEl.value || '',
      photos: Array.from(photoPreviewEl.querySelectorAll('img')).map(img => img.src)
    };
    // If editing, replace
    if (currentEditingId) {
      ENTRIES = ENTRIES.map(e => e.id === currentEditingId ? item : e);
      currentEditingId = null;
    } else {
      ENTRIES.push(item);
    }
    saveData(LOCAL_KEYS.ENTRIES, ENTRIES);
    // reset form
    entryFormEl.reset();
    photoPreviewEl.innerHTML = '';
    inputDatetimeEl.value = todayISOStringLocal();
    renderEntries();
    renderBudgetOverview();
    updateCharts();
    checkTrendWarning();
    // navigate to home
    navigateToPage('page-home');
  });

  // photo preview
  inputPhotoEl.addEventListener('change', ev => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      addPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
    // clear input to allow same-file re-upload
    inputPhotoEl.value = '';
  });

  // small buttons
  btnSimPay.addEventListener('click', () => {
    // For demo: create a fake payment and then create an entry with that amount
    const amount = Number(inputAmountEl.value || 0);
    if (!amount || amount <= 0) {
      alert('请先输入金额以模拟支付并记账');
      return;
    }
    simulatePayment(amount).then(payment => {
      // payment success -> create entry automatically
      const entry = {
        id: genId(),
        amount,
        category: inputCategoryEl.value || DEFAULT_CATEGORIES[0],
        datetime: new Date().toISOString(),
        mood: inputMoodEl.value || '',
        note: `通过模拟支付完成 · 交易ID:${payment.id}`,
        photos: []
      };
      ENTRIES.push(entry);
      saveData(LOCAL_KEYS.ENTRIES, ENTRIES);
      renderEntries();
      renderBudgetOverview();
      updateCharts();
      checkTrendWarning();
      alert('支付并记账成功 🎉');
      navigateToPage('page-home');
    }).catch(() => alert('支付失败'));
  });

  // simulated scan-pay button in topbar
  btnScanPay.addEventListener('click', () => {
    // quick demo: create sample entry of random amount and category
    const amount = +(Math.random()*200+5).toFixed(2);
    simulatePayment(amount).then(payment => {
      const cat = DEFAULT_CATEGORIES[Math.floor(Math.random()*DEFAULT_CATEGORIES.length)];
      const entry = {
        id: genId(),
        amount,
        category: cat,
        datetime: new Date().toISOString(),
        mood: '',
        note: `扫码支付 · 模拟入账 · 交易ID:${payment.id}`,
        photos: [SAMPLE_IMAGES[Math.floor(Math.random()*SAMPLE_IMAGES.length)]]
      };
      ENTRIES.push(entry);
      saveData(LOCAL_KEYS.ENTRIES, ENTRIES);
      renderEntries();
      renderBudgetOverview();
      updateCharts();
      checkTrendWarning();
      navigateToPage('page-home');
    });
  });

  // edit budgets shortcut
  btnEditBudgets.addEventListener('click', () => navigateToPage('page-settings'));
}

/* add photo preview */
function addPhotoPreview(dataUrl) {
  const img = document.createElement('img');
  img.src = dataUrl;
  img.addEventListener('click', () => openImageModal(dataUrl));
  const wrapper = document.createElement('div');
  wrapper.appendChild(img);
  photoPreviewEl.appendChild(img);
}

/* load entry to form for editing */
function loadEntryToForm(entry) {
  navigateToPage('page-add');
  currentEditingId = entry.id;
  inputAmountEl.value = entry.amount;
  inputCategoryEl.value = entry.category;
  inputDatetimeEl.value = new Date(entry.datetime).toISOString().slice(0,16);
  inputNoteEl.value = entry.note;
  inputMoodEl.value = entry.mood || '';
  photoPreviewEl.innerHTML = '';
  (entry.photos || []).forEach(p => addPhotoPreview(p));
}

/* ---------- Image modal ---------- */
const imageModal = qs('#image-modal');
const imageModalImg = qs('#image-modal-img');
qs('#close-image-modal').addEventListener('click', closeImageModal);
imageModal.addEventListener('click', (e) => {
  if (e.target === imageModal) closeImageModal();
});
function openImageModal(src) {
  imageModalImg.src = src;
  imageModal.classList.remove('hidden');
}
function closeImageModal() {
  imageModal.classList.add('hidden');
  imageModalImg.src = '';
}

/* ---------- Simulated payment interface ---------- */
function simulatePayment(amount) {
  // For demo we simulate an async SDK flow
  return new Promise((resolve, reject) => {
    const success = confirm(`模拟支付 ¥${amount.toFixed(2)}？（确定模拟成功）`);
    if (!success) return reject();
    // return fake transaction id
    setTimeout(() => resolve({ id: 'tx_' + Math.random().toString(36).slice(2,10), amount }), 600);
  });
}

/* ---------- Share / Export ---------- */
function shareEntry(entry) {
  // create a share card DOM in hidden container, then capture as image or PDF
  const el = document.createElement('div');
  el.style.padding = '22px';
  el.style.width = '640px';
  el.style.background = '#fff';
  el.style.borderRadius = '18px';
  el.innerHTML = `
    <div style="font-weight:700;font-size:18px;margin-bottom:8px">🥜花生 - How to Cost Your Life</div>
    <div style="display:flex;gap:12px;align-items:center">
      <div style="width:160px;height:160px;border-radius:12px;overflow:hidden"><img src="${entry.photos[0] || SAMPLE_IMAGES[0]}" style="width:100%;height:100%;object-fit:cover"></div>
      <div>
        <div style="font-size:20px;font-weight:700">¥${entry.amount.toFixed(2)}</div>
        <div style="color:#6b7785;margin-top:6px">${entry.category} · ${formatDateTime(entry.datetime)}</div>
        <div style="margin-top:12px">${(entry.note || '').slice(0,120)}</div>
      </div>
    </div>
    <div style="margin-top:14px;color:#8593A1;font-size:12px">来自：🥜花生 - How to Cost Your Life</div>
  `;
  shareCardEl.innerHTML = '';
  shareCardEl.appendChild(el);
  // Use html2canvas to create an image and then prompt share via Web Share API or copy link and open dialog
  html2canvas(el, { scale: 2 }).then(canvas => {
    canvas.toBlob(blob => {
      const file = new File([blob], 'peanut-share.png', { type: 'image/png' });
      // try navigator.share
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          title: '🥜花生 - 分享消费记录',
          files: [file],
          text: `在🥜花生记录了 ¥${entry.amount.toFixed(2)}，来自 ${entry.category}`
        }).catch(e => {
          // fallback: download image
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'peanut-share.png';
          a.click();
        });
      } else {
        // fallback: copy image URL by creating object URL and instruct user
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'peanut-share.png';
        a.click();
        setTimeout(()=>URL.revokeObjectURL(url), 5000);
      }
    }, 'image/png');
  });
}

/* ---------- Charts ---------- */
function updateCharts() {
  updatePieChart();
  updateTrendChart();
  renderSummary();
}

function updatePieChart() {
  const range = statsRangeEl ? statsRangeEl.value : '30';
  const days = range === '7' ? 7 : (range === '30' ? 30 : 30);
  const since = Date.now() - days*24*3600*1000;
  // aggregate by category
  const map = {};
  ENTRIES.forEach(e => {
    if (new Date(e.datetime).getTime() < since) return;
    map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
  });
  const labels = Object.keys(map);
  const data = labels.map(l => map[l]);
  const colors = labels.map((_, i) => ['#F6C79E','#9ED2C6','#C6C8FF','#FFD4EA','#FFD6A5','#CDE8E2','#FFE8D6','#E2E8F8'][i%8]);
  const ctx = qs('#chart-pie').getContext('2d');
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data, backgroundColor: colors }] },
    options: {
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function updateTrendChart() {
  // show last 30 days by default or 7 days
  const range = statsRangeEl ? statsRangeEl.value : '30';
  const days = range === '7' ? 7 : 30;
  const labels = [];
  const totals = [];
  for (let i = days-1; i>=0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(`${d.getMonth()+1}/${d.getDate()}`);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 24*3600*1000;
    const sum = ENTRIES.filter(e => {
      const t = new Date(e.datetime).getTime();
      return t >= dayStart && t < dayEnd;
    }).reduce((s,e) => s + Number(e.amount||0), 0);
    totals.push(sum.toFixed(2));
  }

  const ctx = qs('#chart-trend').getContext('2d');
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: currentTrendMode === 'line' ? 'line' : 'bar',
    data: {
      labels,
      datasets: [{
        label: '日支出',
        data: totals,
        backgroundColor: 'rgba(154,210,198,0.5)',
        borderColor: '#9ED2C6',
        tension: 0.25,
        fill: true,
        pointRadius:4,
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // mark high peaks and pre-warning ranges
  // highlight days where recent 3-day average exceed threshold (handled in checkTrendWarning)
}

/* ---------- Summary ---------- */
function renderSummary() {
  // monthly summary
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEntries = ENTRIES.filter(e => new Date(e.datetime).getTime() >= monthStart);
  const total = monthEntries.reduce((s,e)=> s + Number(e.amount||0), 0);
  const byCat = {};
  monthEntries.forEach(e=> byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount||0));
  const maxCat = Object.keys(byCat).sort((a,b)=>byCat[b]-byCat[a])[0] || '无记录';
  monthlySummaryEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:16px;font-weight:700">本月总结</div>
        <div class="meta">总支出：<strong>¥${total.toFixed(2)}</strong></div>
        <div class="meta">最多花费分类：<strong>${maxCat}</strong></div>
      </div>
      <div style="text-align:right">
        <button id="btn-share-summary" class="primary">生成分享卡片</button>
      </div>
    </div>
  `;
  const btnShareSummary = qs('#btn-share-summary');
  if (btnShareSummary) {
    btnShareSummary.addEventListener('click', () => {
      generateMonthlyReportPDF();
    });
  }
}

/* ---------- Trend Warning & Mood Analysis ---------- */
function checkTrendWarning() {
  // compute 30-day average
  const now = Date.now();
  const last30 = ENTRIES.filter(e => new Date(e.datetime).getTime() >= now - 30*24*3600*1000);
  const sum30 = last30.reduce((s,e)=> s + Number(e.amount||0), 0);
  const avg30 = sum30 / 30;
  // sum recent 3 days
  const start3 = now - 3*24*3600*1000;
  const last3 = ENTRIES.filter(e => new Date(e.datetime).getTime() >= start3);
  const sum3 = last3.reduce((s,e)=> s + Number(e.amount||0), 0);
  const threshold = avg30 * 1.3;
  if (avg30 > 0 && sum3 > threshold) {
    warningBannerEl.classList.remove('hidden');
    warningBannerEl.textContent = `⚠️ 近期消费上升：最近3天支出 ¥${sum3.toFixed(2)}，高于过去30天日均的30%（¥${avg30.toFixed(2)}）。建议：检查高频消费并尝试减少冲动消费。`;
  } else {
    warningBannerEl.classList.add('hidden');
  }
}

/* mood analysis */
function moodAnalysis() {
  const map = {};
  ENTRIES.forEach(e => {
    const m = e.mood || '未填写';
    map[m] = (map[m] || 0) + 1;
  });
  return map;
}

/* ---------- Generate monthly report PDF or share card ---------- */
function generateMonthlyReportPDF() {
  // build a report element
  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth()+1}月`;
  const el = document.createElement('div');
  el.style.padding = '18px';
  el.style.width = '700px';
  el.style.background = '#fff';
  el.innerHTML = `<div style="font-weight:800;font-size:20px">🥜花生 - ${monthLabel} 支出报告</div>
    <div style="margin-top:8px;color:#6b7785">自动生成 · 包含图表与摘要</div>
    <div id="report-summary" style="margin-top:12px"></div>
    <div id="report-charts" style="margin-top:12px;display:flex;gap:12px"></div>
    <div style="margin-top:12px;color:#95a3b3;font-size:12px">来自：🥜花生 - How to Cost Your Life</div>`;

  // fill summary data
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEntries = ENTRIES.filter(e => new Date(e.datetime).getTime() >= monthStart);
  const total = monthEntries.reduce((s,e)=> s + Number(e.amount||0), 0);
  const byCat = {};
  monthEntries.forEach(e=> byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount||0));
  const maxCat = Object.keys(byCat).sort((a,b)=>byCat[b]-byCat[a])[0] || '无记录';
  qs('#report-summary')?.remove && (qs('#report-summary')||{}); // noop
  el.querySelector('#report-summary').innerHTML = `<div style="font-size:16px">总支出：<strong>¥${total.toFixed(2)}</strong></div><div style="margin-top:6px">最大开销分类：<strong>${maxCat}</strong></div>`;

  shareCardEl.innerHTML = '';
  shareCardEl.appendChild(el);

  // use html2pdf to export PDF
  const opt = {
    margin:       10,
    filename:     `peanut-report-${now.getFullYear()}-${now.getMonth()+1}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(el).save();
}

/* ---------- Page navigation & UI wiring ---------- */
function setupEventListeners() {
  // bottom nav
  qsa('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const page = btn.dataset.page;
      navigateToPage(page);
    });
  });

  // filters and toggles
  [filterCategoryEl, filterSortEl, filterRangeEl].forEach(el => el.addEventListener('change', () => renderEntries()));
  toggleFlowEl.addEventListener('click', () => {
    entriesListEl.classList.remove('album');
    toggleFlowEl.classList.add('active');
    toggleAlbumEl.classList.remove('active');
  });
  toggleAlbumEl.addEventListener('click', () => {
    entriesListEl.classList.add('album');
    toggleAlbumEl.classList.add('active');
    toggleFlowEl.classList.remove('active');
  });

  // stats controls
  if (statsRangeEl) {
    statsRangeEl.addEventListener('change', () => {
      updateCharts();
      checkTrendWarning();
      qs('#trend-title').textContent = statsRangeEl.value === '7' ? '最近7天趋势' : (statsRangeEl.value === '30' ? '最近30天趋势' : '本月趋势');
    });
  }
  statsToggleChartEl?.addEventListener('click', () => {
    currentTrendMode = currentTrendMode === 'line' ? 'bar' : 'line';
    updateTrendChart();
  });

  // export & clear
  btnExportPdf.addEventListener('click', () => generateMonthlyReportPDF());
  btnClearData.addEventListener('click', () => {
    if (confirm('确认清空所有数据？示例数据将恢复')) {
      localStorage.removeItem(LOCAL_KEYS.ENTRIES);
      localStorage.removeItem(LOCAL_KEYS.BUDGETS);
      ENTRIES = null;
      BUDGETS = null;
      // reload page to reinitialize with samples
      location.reload();
    }
  });

  // report quick
  btnReport.addEventListener('click', () => generateMonthlyReportPDF());
}

/* navigate */
function navigateToPage(pageId) {
  qsa('.page').forEach(p => p.classList.remove('active'));
  qs('#' + pageId).classList.add('active');
  // highlight nav
  qsa('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === pageId));
  // refresh charts if stats
  if (pageId === 'page-stats') {
    updateCharts();
  }
}

/* ---------- Misc features: Mood analysis display ---------- */
function showMoodAnalysis() {
  const map = moodAnalysis();
  // append to summary
  const wrap = document.createElement('div');
  wrap.style.marginTop = '8px';
  wrap.innerHTML = `<div style="font-weight:700">消费心情统计</div>`;
  Object.entries(map).forEach(([m,c]) => {
    const el = document.createElement('div');
    el.style.display='flex';el.style.justifyContent='space-between';el.style.marginTop='6px';
    el.innerHTML = `<div>${m}</div><div class="meta">${c} 条</div>`;
    wrap.appendChild(el);
  });
  monthlySummaryEl.appendChild(wrap);
}

/* ---------- Run init ---------- */
init();
showMoodAnalysis();

/* ---------- Ensure no unhandled errors (defensive) ---------- */
window.addEventListener('error', e => {
  console.error('Unhandled error', e.error || e.message);
  // avoid white screen: show brief toast (simple)
  alert('发生错误，请在控制台查看（demo）');
});
