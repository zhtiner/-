// ==========================
// 数据存储与示例记录
// ==========================
let records = JSON.parse(localStorage.getItem('records')) || [
  {
    amount: 20,
    category: "餐饮",
    date: new Date().toLocaleString(),
    note: "下楼买咖啡",
    mood: "开心",
    photo: "images/photo1.jpg"
  },
  {
    amount: 150,
    category: "购物",
    date: new Date().toLocaleString(),
    note: "买护肤品",
    mood: "治愈",
    photo: "images/photo2.jpg"
  },
  {
    amount: 60,
    category: "娱乐",
    date: new Date().toLocaleString(),
    note: "看电影",
    mood: "解压",
    photo: "images/photo3.jpg"
  }
];

// ==========================
// 页面元素
// ==========================
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const noteInput = document.getElementById('note');
const moodSelect = document.getElementById('mood');
const photoInput = document.getElementById('photo');
const addRecordBtn = document.getElementById('addRecordBtn');
const recordsContainer = document.getElementById('recordsContainer');
const pieChartCtx = document.getElementById('pieChart').getContext('2d');
const lineChartCtx = document.getElementById('lineChart').getContext('2d');
const summaryText = document.getElementById('summaryText');

// ==========================
// 添加记录
// ==========================
addRecordBtn.addEventListener('click', () => {
  const file = photoInput.files[0];
  const reader = new FileReader();
  reader.onload = function(e){
    const record = {
      amount: parseFloat(amountInput.value),
      category: categorySelect.value,
      date: new Date().toLocaleString(),
      note: noteInput.value,
      mood: moodSelect.value,
      photo: e.target.result
    };
    records.push(record);
    localStorage.setItem('records', JSON.stringify(records));
    renderRecords();
    renderCharts();
    renderSummary();
    amountInput.value = '';
    noteInput.value = '';
    photoInput.value = '';
  };
  if(file) reader.readAsDataURL(file);
});

// ==========================
// 渲染记录（含诗意占位）
// ==========================
function renderRecords(){
  recordsContainer.innerHTML = '';
  records.slice().reverse().forEach(r => {
    const card = document.createElement('div');
    card.className = 'record-card';
    card.innerHTML = `
      <div class="img-container" style="position:relative;">
        <img src="${r.photo}" alt="" onerror="this.style.display='none'; this.parentElement.querySelector('.placeholder').style.display='flex';">
        <div class="placeholder" style="display:none;">
          🌿 照片还在路上<br>故事却已开始……
        </div>
      </div>
      <div>
        <div>${r.category} ¥${r.amount}</div>
        <div>${r.date}</div>
        <div>备注: ${r.note}</div>
        <div>心情: ${r.mood}</div>
      </div>
    `;
    recordsContainer.appendChild(card);
  });
}

// ==========================
// 渲染图表
// ==========================
let pieChart, lineChart;
function renderCharts(){
  const categoryMap = {};
  const dateMap = {};
  records.forEach(r=>{
    categoryMap[r.category] = (categoryMap[r.category]||0)+r.amount;
    const day = r.date.split(' ')[0];
    dateMap[day] = (dateMap[day]||0)+r.amount;
  });
  if(pieChart) pieChart.destroy();
  pieChart = new Chart(pieChartCtx, {
    type: 'pie',
    data: {
      labels: Object.keys(categoryMap),
      datasets: [{
        data: Object.values(categoryMap),
        backgroundColor: ['#FFB74D','#64B5F6','#81C784','#BA68C8','#4DB6AC']
      }]
    }
  });
  if(lineChart) lineChart.destroy();
  lineChart = new Chart(lineChartCtx, {
    type: 'line',
    data: {
      labels: Object.keys(dateMap),
      datasets: [{
        label: '每日支出',
        data: Object.values(dateMap),
        borderColor: '#FFB74D',
        fill: false
      }]
    }
  });
}

// ==========================
// 渲染总结
// ==========================
function renderSummary(){
  const total = records.reduce((sum,r)=>sum+r.amount,0);
  const categoryTotals = {};
  const moodCount = {};
  records.forEach(r=>{
    categoryTotals[r.category] = (categoryTotals[r.category]||0)+r.amount;
    moodCount[r.mood] = (moodCount[r.mood]||0)+1;
  });
  const maxCategory = Object.keys(categoryTotals).reduce((a,b)=>categoryTotals[a]>categoryTotals[b]?a:b);
  const maxMood = Object.keys(moodCount).reduce((a,b)=>moodCount[a]>moodCount[b]?a:b);
  summaryText.innerHTML = `
    本月总支出: ¥${total}<br>
    最大开销: ${maxCategory}<br>
    心情主导: ${maxMood}<br>
    心情摘要: ${maxMood==='开心'?'这个月你多数是为了放松而消费':'保持理智消费，注意心情波动'}
  `;
}

// ==========================
// 初始化
// ==========================
renderRecords();
renderCharts();
renderSummary();
