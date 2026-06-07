const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const storageKey = "autoFixIndustrialSim_v5";

// --- ЛОГИКА SUPABASE (Берем готовый клиент, если он у тебя подключен) ---
// Если вдруг Supabase не виден здесь, убедись, что скрипт с инициализацией подключен в index.html до app.js
const supabaseClient = (typeof supabase !== 'undefined') ? supabase : null; 

const conditionLabels = { poor: "Критическое", fair: "Удовлетворительное", good: "Стабильное" };
const systems = { engine: "ДВС", suspension: "Ходовая часть", brakes: "Тормозная система", electric: "Электроника", body: "Кузов" };

const carTemplates = [
  { id: "audi-a4", name: "Audi A4 B6", year: 2003, basePrice: 900000, resaleMult: 1.35, image: "assets/audi-a4.jpg" },
  { id: "bmw-e30", name: "BMW E30 (Classic)", year: 1989, basePrice: 650000, resaleMult: 1.45, image: "assets/bmw-e30.jpg" },
  { id: "bmw-e39", name: "BMW E39", year: 2001, basePrice: 1000000, resaleMult: 1.38, image: "assets/bmw-e39.jpg" },
  { id: "honda-civic", name: "Honda Civic", year: 2010, basePrice: 950000, resaleMult: 1.28, image: "assets/honda-civic.jpg" },
  { id: "lada-priora", name: "Lada Priora", year: 2011, basePrice: 450000, resaleMult: 1.42, image: "assets/lada-priora.jpg" },
  { id: "lexus-gs300", name: "Lexus GS300", year: 2006, basePrice: 2500000, resaleMult: 1.32, image: "assets/lexus-gs300.jpg" },
  { id: "mercedes-w124", name: "Mercedes-Benz W124", year: 1994, basePrice: 700000, resaleMult: 1.45, image: "assets/mercedes-benz-w124.jpg" },
  { id: "mercedes-w201", name: "Mercedes-Benz W201", year: 1991, basePrice: 500000, resaleMult: 1.50, image: "assets/mercedes-benz-w201.jpg" },
  { id: "mercedes-w211", name: "Mercedes-Benz W211", year: 2004, basePrice: 900000, resaleMult: 1.32, image: "assets/mercedes-benz-w211.jpg" },
  { id: "mercedes-w204", name: "Mercedes-Benz W204", year: 2011, basePrice: 1100000, resaleMult: 1.28, image: "assets/mercedes-w204.jpg" },
  { id: "toyota-mark-2", name: "Toyota Mark II", year: 1998, basePrice: 950000, resaleMult: 1.42, image: "assets/toyota-mark-2.jpg" },
  { id: "volkswagen-golf-5", name: "VW Golf V", year: 2007, basePrice: 950000, resaleMult: 1.34, image: "assets/volkswagen-golf-5.jpg" }
];

const possibleRepairs = [
  { name: "Капитальный ремонт ДВС", system: "engine", costRange: [120000, 200000], impact: 45 },
  { name: "Замена компонентов ГРМ", system: "engine", costRange: [30000, 60000], impact: 15 },
  { name: "Комплексное обслуживание ходовой", system: "suspension", costRange: [40000, 80000], impact: 30 },
  { name: "Регенерация тормозной системы", system: "brakes", costRange: [15000, 35000], impact: 15 },
  { name: "Модернизация бортовой электроники", system: "electric", costRange: [20000, 50000], impact: 20 },
  { name: "Локальные кузовные работы", system: "body", costRange: [25000, 45000], impact: 12 },
  { name: "Стапельные работы и сварка порогов", system: "body", costRange: [50000, 100000], impact: 25 }
];

const marketEvents = [
  { id: "normal", title: "Стабильная конъюнктура", text: "Рыночные показатели в пределах нормы.", repairMod: 1.0, resaleMod: 1.0, type: "info" },
  { id: "crisis", title: "Кризис поставок компонентов", text: "Логистические сбои. Стоимость ремонта увеличена на 30%!", repairMod: 1.3, resaleMod: 1.0, type: "danger" },
  { id: "discount", title: "Оптимизация налогообложения запчастей", text: "Снижение пошлин. Себестоимость ремонта снижена на 20%!", repairMod: 0.8, resaleMod: 1.0, type: "good" },
  { id: "boom", title: "Всплеск потребительского спроса", text: "Инфляционные ожидания. Стоимость продажи выросла на 15%!", repairMod: 1.0, resaleMod: 1.15, type: "good" }
];

const upgradeTemplates = [
  { id: "scanner", name: "Диагностический комплекс OBD-III", cost: 150000, desc: "Автоматически выявляет 100% скрытых дефектов при покупке." },
  { id: "tools", name: "Профессиональное оборудование Hans", cost: 300000, desc: "Снижает базовую себестоимость нормо-часа ремонта на 15%." },
  { id: "marketing", name: "CRM-интеграция с маркетплейсами", cost: 200000, desc: "Повышает капитализацию и финальную маржинальность продаж на 8%." }
];

const creditProducts = [
  { id: "micro", name: "Микрозайм на покрытие кассового разрыва", principal: 300000, totalPayout: 360000, percent: 20, description: "Срочное пополнение капитала. Высокая ставка." },
  { id: "business", name: "Коммерческий кредит на развитие оборотного фонда", principal: 1000000, totalPayout: 1150000, percent: 15, description: "Оптимально для выкупа премиального сегмента авто." }
];

const initialState = {
  balance: 2000000, xp: 0, reputation: 75, soldCount: 0, profitTotal: 0, totalInvested: 0,
  garage: [], marketCars: [], upgrades: { scanner: false, tools: false, marketing: false },
  financialHistory: [], currentEvent: marketEvents[0],
  loan: { active: false, principal: 0, remaining: 0, name: "" },
  events: [{ type: "good", title: "Инициализация системы", text: "Платформа запущена в штатном режиме.", time: "Бизнес-инкубатор" }]
};

// --- ЗАГРУЗКА ---
let state = JSON.parse(JSON.stringify(initialState));
loadStateFromSource(); // Загружаем при запуске

let financialChart = null;

const elements = {
  balanceText: document.querySelector("#balanceText"),
  xpText: document.querySelector("#xpText"),
  reputationText: document.querySelector("#reputationText"),
  soldText: document.querySelector("#soldText"),
  levelText: document.querySelector("#levelText"),
  marketList: document.querySelector("#marketList"),
  garageList: document.querySelector("#garageList"),
  repairList: document.querySelector("#repairList"),
  saleList: document.querySelector("#saleList"),
  eventsList: document.querySelector("#eventsList"),
  ratingList: document.querySelector("#ratingList"),
  creditPanel: document.querySelector("#creditPanel"),
  toast: document.querySelector("#toast"),
  menuButton: document.querySelector("#menuButton"),
  scrim: document.querySelector("#scrim")
};

if (state.marketCars.length === 0) refreshMarket();

document.querySelectorAll("[data-view], [data-switch]").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view || btn.dataset.switch));
});
document.querySelector("#newDealsButton").addEventListener("click", refreshMarket);
document.querySelector("#resetButton").addEventListener("click", resetGame);
elements.menuButton.addEventListener("click", () => document.body.classList.add("menu-open"));
elements.scrim.addEventListener("click", () => document.body.classList.remove("menu-open"));

document.querySelector("#searchInput")?.addEventListener("input", renderMarket);
document.querySelector("#conditionFilter")?.addEventListener("change", renderMarket);
document.querySelector("#dealFilter")?.addEventListener("change", renderMarket);

injectAnalyticsContainers();
render();

// --- ВСЯ ОСТАЛЬНАЯ ЛОГИКА БЕЗ ИЗМЕНЕНИЙ ---
function getRandom(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateCarInstance(template) {
  const seed = Math.random();
  const condition = seed > 0.75 ? "good" : seed > 0.35 ? "fair" : "poor";
  const mileage = getRandom(90000, 380000);
  const priceModifier = 0.85 + Math.random() * 0.3;
  const healthFloor = condition === "good" ? 75 : condition === "fair" ? 45 : 20;
  const health = {};
  Object.keys(systems).forEach(s => health[s] = getRandom(healthFloor, Math.min(healthFloor + 25, 100)));
  const allRepairs = [...possibleRepairs].sort(() => 0.5 - Math.random());
  const mapRepair = r => ({ ...r, id: Math.random().toString(36).substr(2, 9), cost: Math.round(getRandom(r.costRange[0], r.costRange[1]) * state.currentEvent.repairMod) });
  const visible = allRepairs.slice(0, getRandom(1, 2)).map(mapRepair);
  const hidden = Math.random() < 0.15 ? [] : allRepairs.slice(2, 2 + getRandom(1, 2)).map(mapRepair);
  if (state.upgrades.scanner) { visible.push(...hidden); hidden.length = 0; }
  const price = Math.round(template.basePrice * priceModifier);
  return { ...template, instanceId: Math.random().toString(36).substr(2, 9), condition, mileage, price, resale: Math.round(price * template.resaleMult * state.currentEvent.resaleMod), baseHealth: health, visibleRepairs: visible, hiddenRepairs: hidden, revealedRepairs: [] };
}

function refreshMarket() {
  if (state.loan.active) {
    const interestCharge = Math.round(state.loan.principal * 0.02);
    if (state.balance >= interestCharge) { state.balance -= interestCharge; addEvent("danger", "Проценты по кредиту", `Списана комиссия: -${formatMoney(interestCharge)}`); }
    else { state.loan.remaining += interestCharge; addEvent("danger", "Просрочка платежа", `Недостаточно средств! Долг вырос на: +${formatMoney(interestCharge)}`); }
  }
  if (Math.random() > 0.4) {
    state.currentEvent = marketEvents[Math.floor(Math.random() * marketEvents.length)];
    addEvent(state.currentEvent.type, "Рыночный фактор: " + state.currentEvent.title, state.currentEvent.text);
  }
  const shuffledTemplates = [...carTemplates].sort(() => 0.5 - Math.random());
  state.marketCars = shuffledTemplates.slice(0, 9).map(t => generateCarInstance(t));
  commit("Рыночные предложения обновлены.");
}

function buyUpgrade(id) {
  const upg = upgradeTemplates.find(u => u.id === id);
  if (state.balance >= upg.cost && !state.upgrades[id]) {
    state.balance -= upg.cost; state.totalInvested += upg.cost; state.upgrades[id] = true;
    addEvent("good", "Модернизация", `Активировано: ${upg.name}`);
    commit("Инвестиция успешно внесена.");
  } else { showToast("Недостаточно средств."); }
}

function takeLoan(id) {
  if (state.loan.active) { showToast("Кредит уже есть!"); return; }
  const prod = creditProducts.find(p => p.id === id);
  state.balance += prod.principal;
  state.loan = { active: true, name: prod.name, principal: prod.principal, remaining: prod.totalPayout };
  addEvent("good", "Финансирование", `Привлечен капитал: +${formatMoney(prod.principal)}`);
  commit("Кредитные средства зачислены.");
}

function payLoanManual(amount) {
  const payment = Math.min(state.balance, state.loan.remaining, amount);
  if (payment <= 0) { showToast("Недостаточно средств."); return; }
  state.balance -= payment; state.loan.remaining -= payment;
  addEvent("info", "Погашение займа", `Платеж: -${formatMoney(payment)}`);
  if (state.loan.remaining <= 0) { state.loan = { active: false, principal: 0, remaining: 0, name: "" }; addEvent("good", "Кредит закрыт", "Обязательства закрыты."); }
  commit("Транзакция обработана.");
}

function buyCar(instanceId) {
  const index = state.marketCars.findIndex(c => c.instanceId === instanceId);
  const car = state.marketCars[index];
  if (state.balance >= car.price) {
    state.balance -= car.price; state.garage.push({ ...car, purchasePrice: car.price, repairCost: 0, completedRepairs: [] });
    state.marketCars.splice(index, 1);
    addEvent("good", "Акцепт сделки", `Приобретен: ${car.name}`);
    commit("Объект передан в контроль.");
  } else { showToast("Недостаточно средств!"); }
}

function diagnoseCar(instanceId) {
  const car = state.garage.find(c => c.instanceId === instanceId);
  if (state.upgrades.scanner) return;
  const unknownHidden = car.hiddenRepairs.filter(r => !car.revealedRepairs.includes(r.id));
  if (unknownHidden.length > 0) { car.revealedRepairs.push(unknownHidden[0].id); addEvent("danger", "Дефектовка", `Выявлен дефект: ${unknownHidden[0].name}`); commit("Корректировка."); }
  else { showToast("Все дефекты уже известны."); }
}

function repairCar(instanceId, repairId) {
  const car = state.garage.find(c => c.instanceId === instanceId);
  const repair = [...car.visibleRepairs, ...car.hiddenRepairs].find(r => r.id === repairId);
  let actualCost = repair.cost;
  if (state.upgrades.tools) actualCost = Math.round(actualCost * 0.85);
  if (state.balance >= actualCost) {
    state.balance -= actualCost; car.repairCost += actualCost; car.completedRepairs.push(repairId); state.xp += 60;
    commit(`Выполнен ремонт: ${repair.name}`);
  } else { showToast("Недостаточно средств."); }
}

function sellCar(instanceId) {
  const index = state.garage.findIndex(c => c.instanceId === instanceId);
  const car = state.garage[index];
  const healthRate = calculateHealth(car);
  let finalResale = car.resale * (healthRate / 100);
  if (state.upgrades.marketing) finalResale *= 1.08;
  finalResale = Math.round(finalResale);
  const netProfit = finalResale - car.purchasePrice - car.repairCost;
  state.balance += finalResale; state.profitTotal += netProfit; state.soldCount++;
  state.xp += netProfit > 0 ? 200 : 75;
  state.reputation = Math.max(10, Math.min(100, state.reputation + (netProfit > 0 ? 6 : -12)));
  state.financialHistory.push({ period: "Сделка №" + state.soldCount, profit: netProfit, balance: state.balance });
  state.garage.splice(index, 1);
  addEvent(netProfit > 0 ? "good" : "danger", "Ликвидация актива", `${car.name} продан за ${formatMoney(finalResale)}. Маржа: ${formatMoney(netProfit)}`);
  commit("Сделка закрыта.");
}

function calculateHealth(car) {
  let totalHealth = 0; const sysKeys = Object.keys(systems);
  sysKeys.forEach(s => {
    let currentSystemHealth = car.baseHealth[s];
    const repairs = [...car.visibleRepairs, ...car.hiddenRepairs].filter(r => r.system === s);
    repairs.forEach(r => { if (car.completedRepairs.includes(r.id)) currentSystemHealth += r.impact; });
    totalHealth += Math.min(100, currentSystemHealth);
  });
  return Math.round(totalHealth / sysKeys.length);
}

function injectAnalyticsContainers() {
  const homeView = document.querySelector("#homeView");
  if (homeView && !document.querySelector("#diplomaDashboard")) {
    const dash = document.createElement("div"); dash.id = "diplomaDashboard";
    dash.style.cssText = "background:var(--panel-2); padding:20px; border-radius:12px; margin-bottom:20px; border:1px solid var(--line);";
    homeView.insertBefore(dash, homeView.firstChild);
  }
  const settingsView = document.querySelector("#settingsView") || document.querySelector("#homeView");
  if (settingsView && !document.querySelector("#upgradesContainer")) {
    const upgSection = document.createElement("div"); upgSection.id = "upgradesContainer";
    upgSection.style.cssText = "margin-top:25px; background:var(--panel); padding:20px; border-radius:12px; border:1px solid var(--line);";
    settingsView.appendChild(upgSection);
  }
}

function render() {
  elements.balanceText.textContent = formatMoney(state.balance);
  elements.xpText.textContent = `${state.xp} / 5000`;
  elements.reputationText.textContent = `${state.reputation}%`;
  elements.soldText.textContent = String(state.soldCount);
  elements.levelText.textContent = `Ранг: ${Math.floor(state.xp / 1000) + 1} Инженер`;
  renderDashboard(); renderMarket(); renderUpgrades(); renderCompetitorRating();
  renderCreditPanel(); renderGarageCollection(elements.garageList, "garage");
  renderGarageCollection(elements.repairList, "repair");
  renderGarageCollection(elements.saleList, "sale");
  renderEvents(); renderChart();
}

function renderCompetitorRating() {
  if (!elements.ratingList) return;
  const baseCompetitors = [ { name: "Astana Motors Trade", capBase: 4500000, rep: 90, icon: "🏢" }, { name: "Almaty Car-Recycling Corp", capBase: 2800000, rep: 60, icon: "🏭" }, { name: "Шокан и Партнеры (ИП)", capBase: 1200000, rep: 85, icon: "🛠️" }, { name: "Перекуп Сейфуллина Сити", capBase: 600000, rep: 40, icon: "🚗" } ];
  const entities = [{ name: "Ваше Предприятие (Вы)", capBase: state.balance + state.totalInvested, rep: state.reputation, icon: "⭐", isPlayer: true }, ...baseCompetitors];
  entities.sort((a, b) => b.capBase - a.capBase);
  elements.ratingList.innerHTML = "";
  entities.forEach((entity, index) => {
    const card = document.createElement("div");
    card.style.cssText = `display:flex; align-items:center; justify-content:space-between; padding:15px; margin-bottom:10px; border-radius:8px; border:1px solid var(--line); ${entity.isPlayer ? 'background: rgba(47, 109, 246, 0.15); border-color: var(--blue); font-weight: bold;' : 'background: var(--panel);'}`;
    card.innerHTML = `<div style="display:flex; align-items:center; gap:15px;"><span style="font-size:18px; color:var(--muted); width:25px;">#${index + 1}</span><span style="font-size:24px;">${entity.icon}</span><div><span style="color:var(--text);">${entity.name}</span><br><span style="font-size:12px; color:var(--muted);">Репутация: ${entity.rep}%</span></div></div><strong style="color:${entity.isPlayer ? 'var(--blue)' : 'var(--text)'};">${formatMoney(Math.round(entity.capBase))}</strong>`;
    elements.ratingList.appendChild(card);
  });
}

function renderCreditPanel() {
  if (!elements.creditPanel) return;
  if (state.loan.active) {
    const canPayAll = state.balance >= state.loan.remaining;
    elements.creditPanel.innerHTML = `<h3 style="margin-top:0; color:var(--red);">⚠️ Зафиксированы кредитные обязательства</h3><p><strong>Программа:</strong> ${state.loan.name}</p><div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px; background:var(--bg); padding:15px; border-radius:8px;"><div><span style="color:var(--muted); font-size:12px;">Тело кредита</span><br><strong style="font-size:18px;">${formatMoney(state.loan.principal)}</strong></div><div><span style="color:var(--muted); font-size:12px;">Остаток</span><br><strong style="font-size:18px; color:var(--amber);">${formatMoney(state.loan.remaining)}</strong></div></div><div style="display:flex; gap:10px; flex-wrap:wrap;"><button class="primary-button" id="payLoanBtn" style="background:var(--green); flex:1;">Внести платеж (200 000 ₸)</button><button class="primary-button" id="payLoanAllBtn" style="background:var(--blue); flex:1;" ${!canPayAll ? 'disabled' : ''}>Погасить полностью</button></div>`;
    elements.creditPanel.querySelector("#payLoanBtn").onclick = () => payLoanManual(200000);
    elements.creditPanel.querySelector("#payLoanAllBtn").onclick = () => payLoanManual(state.loan.remaining);
  } else {
    elements.creditPanel.innerHTML = `<h3 style="margin-top:0; color:var(--blue); margin-bottom:20px;">Кредитные линии</h3>`;
    creditProducts.forEach(p => {
      const block = document.createElement("div"); block.style.cssText = "background:var(--panel-2); padding:15px; border-radius:8px; border:1px solid var(--line); margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; gap:20px;";
      block.innerHTML = `<div style="flex:1;"><strong style="font-size:16px;">${p.name}</strong><br><span style="font-size:12px; color:var(--muted);">${p.description}</span></div><button class="primary-button">Заключить договор</button>`;
      block.querySelector("button").onclick = () => takeLoan(p.id);
      elements.creditPanel.appendChild(block);
    });
  }
}

function renderDashboard() {
  const container = document.querySelector("#diplomaDashboard");
  if (!container) return;
  const roi = state.totalInvested > 0 ? ((state.profitTotal / state.totalInvested) * 100).toFixed(1) : "0.0";
  container.innerHTML = `<h3 style="margin-top:0; color:var(--blue);">📊 Аналитическая панель</h3><div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:15px;"><div><span style="color:var(--muted);font-size:13px;">ROI</span><br><strong style="font-size:20px;color:var(--green);">${roi}%</strong></div><div><span style="color:var(--muted);font-size:13px;">Прибыль</span><br><strong style="font-size:20px;">${formatMoney(state.profitTotal)}</strong></div></div>`;
}

function renderUpgrades() {
  const container = document.querySelector("#upgradesContainer");
  if (!container) return;
  container.innerHTML = `<h3 style="margin-top:0;color:var(--blue);">🛠️ Модернизация</h3>`;
  upgradeTemplates.forEach(u => {
    const bought = state.upgrades[u.id];
    const row = document.createElement("div"); row.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--line);";
    row.innerHTML = `<div style="flex:1;"><strong style="color:var(--text);">${u.name}</strong></div><button class="${bought ? 'secondary-button' : 'primary-button'}" ${bought || state.balance < u.cost ? 'disabled' : ''}>${bought ? 'Внедрено' : `Купить за ${money.format(u.cost)} ₸`}</button>`;
    row.querySelector("button").onclick = () => buyUpgrade(u.id);
    container.appendChild(row);
  });
}

function renderChart() {
  const canvas = document.getElementById("analyticsChartCanvas");
  if (!canvas || !window.Chart) return;
  const ctx = canvas.getContext("2d");
  if (financialChart) financialChart.destroy();
  financialChart = new Chart(ctx, { type: 'line', data: { labels: state.financialHistory.map(h => h.period), datasets: [{ data: state.financialHistory.map(h => h.balance), borderColor: '#2f6df6', tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false } });
}

function renderMarket() {
  elements.marketList.innerHTML = "";
  state.marketCars.forEach(car => {
    const template = document.querySelector("#marketCardTemplate").content.cloneNode(true);
    const visibleCost = car.visibleRepairs.reduce((s, r) => s + r.cost, 0);
    const forecast = car.resale - car.price - visibleCost;
    template.querySelector(".car-image").src = car.image;
    template.querySelector("h2").textContent = car.name;
    template.querySelector(".forecast-text").className = `forecast-text ${forecast > 0 ? 'profit-positive' : 'profit-negative'}`;
    const btn = template.querySelector(".buy-button");
    btn.onclick = () => buyCar(car.instanceId);
    elements.marketList.append(template);
  });
}

function renderGarageCollection(container, mode) {
  if (!container) return;
  container.innerHTML = "";
  state.garage.forEach(car => {
    const template = document.querySelector("#garageCardTemplate").content.cloneNode(true);
    const sellBtn = template.querySelector(".sell-button");
    if (sellBtn) sellBtn.onclick = () => sellCar(car.instanceId);
    container.append(template);
  });
}

// --- СИНХРОНИЗАЦИЯ С SUPABASE ---
function commit(msg) { saveState(); render(); showToast(msg); }

function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
    if (supabaseClient) {
        // Предполагаем, что таблица называется 'game_saves', а ID пользователя фиксирован 'user_1'
        supabaseClient.from('game_saves').upsert({ id: 'user_1', game_data: state }).then();
    }
}

async function loadStateFromSource() {
    // 1. Сначала локально
    const saved = localStorage.getItem(storageKey);
    if (saved) state = JSON.parse(saved);
    
    // 2. Затем из базы (если доступна)
    if (supabaseClient) {
        const { data } = await supabaseClient.from('game_saves').select('game_data').eq('id', 'user_1').single();
        if (data && data.game_data) {
            state = data.game_data;
            render();
        }
    }
}

function formatMoney(v) { return `${money.format(v)} ₸`; }
function addEvent(type, title, text) { state.events.unshift({ type, title, text, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }); }
function showToast(m) { elements.toast.textContent = m; elements.toast.classList.add("is-visible"); setTimeout(() => elements.toast.classList.remove("is-visible"), 3000); }
function switchView(v) { document.querySelectorAll(".view").forEach(el => el.classList.remove("is-visible")); document.querySelector(`#${v}View`).classList.add("is-visible"); document.querySelectorAll(".nav-button").forEach(b => b.classList.toggle("is-active", b.dataset.view === v)); }
function renderEvents() { if (!elements.eventsList) return; elements.eventsList.innerHTML = ""; state.events.slice(0, 15).forEach(e => { const el = document.createElement("div"); el.className = "event-item"; el.innerHTML = `<div><strong>${e.title}</strong><span>${e.text}</span></div>`; elements.eventsList.append(el); }); }
function resetGame() { if (confirm("Сброс?")) { state = JSON.parse(JSON.stringify(initialState)); refreshMarket(); } }
