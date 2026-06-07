// Инициализация Supabase с вашими ключами
const SUPABASE_URL = "https://ycmvhvsbcexxpuzdskpu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ztQr6Kblgt4kb-3R3nhiPg_ctswPZb6"; // Публичный ключ авторизации
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

// Сессионные переменные игрока
let currentUser = null;

const conditionLabels = { poor: "Критическое", fair: "Удовлетворительное", good: "Стабильное" };
const systems = { engine: "ДВС", suspension: "Ходовая часть", brakes: "Тормозная система", electric: "Электроника", body: "Кузов" };

// --- ВАШИ ИСХОДНЫЕ ДАННЫЕ МАШИН И ШАБЛОНОВ ---
const carTemplates = [
  { id: "audi-a4", name: "Audi A4 B6", year: 2003, basePrice: 900000, resaleMult: 1.35, image: "assets/audi-a4.jpg" },
  { id: "bmw-e30", name: "BMW E30 (Classic)", year: 1989, basePrice: 650000, resaleMult: 1.45, image: "assets/bmw-e30.jpg" },
  { id: "bmw-e39", name: "BMW E39", year: 2001, basePrice: 1000000, resaleMult: 1.38, image: "assets/bmw-e39.jpg" },
  { id: "honda-civic", name: "Honda Civic", year: 2010, basePrice: 950000, resaleMult: 1.28, image: "assets/honda-civic.jpg" },
  { id: "lada-priora", name: "Lada Priora", year: 2012, basePrice: 450000, resaleMult: 1.22, image: "assets/lada-priora.jpg" },
  { id: "mercedes-w211", name: "Mercedes-Benz E-Class W211", year: 2005, basePrice: 1200000, resaleMult: 1.40, image: "assets/mercedes-w211.jpg" },
  { id: "toyota-camry", name: "Toyota Camry XV40", year: 2008, basePrice: 1400000, resaleMult: 1.30, image: "assets/toyota-camry.jpg" },
  { id: "volkswagen-golf", name: "Volkswagen Golf Mk4", year: 2000, basePrice: 700000, resaleMult: 1.32, image: "assets/volkswagen-golf.jpg" }
];

const possibleRepairs = {
  engine: [
    { id: "oil-change", name: "Замена масла и фильтров", cost: 35000, xpReward: 15, healthBonus: 10, repBonus: 1 },
    { id: "spark-plugs", name: "Замена свечей зажигания", cost: 20000, xpReward: 10, healthBonus: 5, repBonus: 0 },
    { id: "gasket-replace", name: "Замена прокладки ГБЦ", cost: 120000, xpReward: 50, healthBonus: 25, repBonus: 3 },
    { id: "engine-overhaul", name: "Капитальный ремонт ДВС", cost: 380000, xpReward: 150, healthBonus: 55, repBonus: 8 }
  ],
  suspension: [
    { id: "shock-absorbers", name: "Замена амортизаторов (круг)", cost: 90000, xpReward: 30, healthBonus: 20, repBonus: 2 },
    { id: "bushing-replace", name: "Замена сайлентблоков", cost: 45000, xpReward: 20, healthBonus: 10, repBonus: 1 },
    { id: "wheel-alignment", name: "Сход-развал", cost: 15000, xpReward: 5, healthBonus: 5, repBonus: 1 }
  ],
  brakes: [
    { id: "brake-pads", name: "Замена тормозных колодок", cost: 25000, xpReward: 10, healthBonus: 8, repBonus: 1 },
    { id: "brake-discs", name: "Замена тормозных дисков", cost: 65000, xpReward: 25, healthBonus: 15, repBonus: 2 },
    { id: "brake-fluid", name: "Прокачка тормозной системы", cost: 120000, xpReward: 10, healthBonus: 5, repBonus: 0 }
  ],
  electric: [
    { id: "battery-replace", name: "Замена аккумулятора", cost: 40000, xpReward: 10, healthBonus: 10, repBonus: 0 },
    { id: "alternator-repair", name: "Ремонт генератора", cost: 55000, xpReward: 25, healthBonus: 15, repBonus: 2 },
    { id: "wiring-fix", name: "Устранение короткого замыкания", cost: 70000, xpReward: 40, healthBonus: 20, repBonus: 3 }
  ],
  body: [
    { id: "scratch-removal", name: "Полировка кузова (детали)", cost: 30000, xpReward: 15, healthBonus: 8, repBonus: 2 },
    { id: "welding-works", name: "Сварочные работы (пороги/арки)", cost: 140000, xpReward: 60, healthBonus: 25, repBonus: 4 },
    { id: "full-painting", name: "Полная покраска автомобиля", cost: 450000, xpReward: 180, healthBonus: 35, repBonus: 10 }
  ]
};

const marketEvents = [
  { id: "fuel-crisis", title: "Топливный кризис", text: "Цены на старые прожорливые немецкие седаны упали на 15%!", impact: { "bmw-e39": -0.15, "mercedes-w211": -0.15 } },
  { id: "classic-hype", title: "Бум на ретро-классику", text: "Спрос на легендарную классику вырос! BMW E30 дорожает на 30%.", impact: { "bmw-e30": 0.30 } },
  { id: "taxi-demand", title: "Новый агрегатор такси", text: "Спрос на надежные городские авто Camry и Civic подскочил на 15%.", impact: { "toyota-camry": 0.15, "honda-civic": 0.15 } },
  { id: "drift-season", title: "Открытие сезона дрифта", text: "Молодежь активно скупает классику под проекты. Е30 прибавила 15% к цене.", impact: { "bmw-e30": 0.15 } }
];

const upgradeTemplates = [
  { id: "scanner", name: "OBD-II Диагностический сканер Pro", cost: 250000, text: "Позволяет мгновенно открывать точное состояние Электроники и ДВС без затрат на детальный осмотр." },
  { id: "tools", name: "Инструментальные тележки Force", cost: 600000, text: "Профессиональное оборудование снижает стоимость любого проводимого ремонта во всех узлах на 15%." },
  { id: "marketing", name: "Премиум-подписка на Авто-Маркетплейсах", cost: 1000000, text: "Увеличивает итоговую оценочную и перепродажную стоимость всех ваших готовых машин в гараже на 7% за счет лучшего продвижения." }
];

const creditProducts = [
  { id: "micro", name: "Микрозайм 'Быстрый Старт'", principal: 500000, totalPayable: 650000, text: "Быстрые деньги на покупку первой недорогой машины. Переплата: 150 000 ₸." },
  { id: "business", name: "Кредит 'Развитие СТО'", principal: 2500000, totalPayable: 3100000, text: "Крупная сумма под расширение бизнеса или покупку премиум-сегмента. Переплата: 600 000 ₸." },
  { id: "oligargh", name: "Инвестиционный транш 'Перекуп-Магнат'", principal: 6000000, totalPayable: 7600000, text: "Максимальный объем капитала для полной скупки рынка и всех улучшений. Переплата: 1 600 000 ₸." }
];

const initialState = {
  balance: 2000000,
  xp: 0,
  reputation: 75,
  soldCount: 0,
  profitTotal: 0,
  totalInvested: 0,
  garage: [],
  marketCars: [],
  upgrades: { scanner: false, tools: false, marketing: false },
  financialHistory: [],
  currentEvent: null,
  loan: { active: false, principal: 0, remaining: 0, name: "" },
  events: [{ type: "good", title: "Инициализация системы", text: "Платформа запущена в штатном режиме.", time: "Бизнес-инкубатор" }]
};

let state = JSON.parse(JSON.stringify(initialState));

// Ссылки на элементы DOM (для рендеринга)
const elements = {
  balance: document.querySelector("#balanceText"),
  xp: document.querySelector("#xpText"),
  reputation: document.querySelector("#reputationText"),
  soldCount: document.querySelector("#soldCountText"),
  profitTotal: document.querySelector("#profitTotalText"),
  marketList: document.querySelector("#marketList"),
  garageList: document.querySelector("#garageList"),
  ratingList: document.querySelector("#ratingList"),
  eventsList: document.querySelector("#eventsList")
};

// --- УПРАВЛЕНИЕ АВТЕНТИФИКАЦИЕЙ И СОСТОЯНИЕМ ЧЕРЕЗ SUPABASE ---

async function initApp() {
  setupAuthListeners();

  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    document.querySelector("#authOverlay").style.display = "none";
    await loadUserData();
  } else {
    document.querySelector("#authOverlay").style.display = "flex";
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      document.querySelector("#authOverlay").style.display = "none";
      await loadUserData();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      state = JSON.parse(JSON.stringify(initialState));
      document.querySelector("#authOverlay").style.display = "flex";
      render();
    }
  });
}

async function loadUserData() {
  if (!currentUser) return;
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (error) throw error;

    if (data) {
      state.balance = Number(data.balance);
      state.profitTotal = Number(data.profit_total);
      state.xp = Number(data.xp);
      state.reputation = Number(data.reputation);
      state.soldCount = Number(data.sold_count);
      
      if (data.game_state && Object.keys(data.game_state).length > 0) {
        state.garage = data.game_state.garage || [];
        state.marketCars = data.game_state.marketCars || [];
        state.upgrades = data.game_state.upgrades || state.upgrades;
        state.financialHistory = data.game_state.financialHistory || [];
        state.loan = data.game_state.loan || state.loan;
        state.events = data.game_state.events || state.events;
        state.totalInvested = data.game_state.totalInvested || 0;
      }
      
      document.querySelector("#profileName").textContent = data.username;
      document.querySelector("#avatarLetter").textContent = data.username.charAt(0).toUpperCase();
    }
    
    if (state.marketCars.length === 0) refreshMarket();
    render();
  } catch (err) {
    console.error("Ошибка загрузки данных профиля:", err.message);
    showToast("Ошибка при синхронизации с облаком.");
  }
}

async function commit(message = "") {
  if (message) console.log(`[Игровой коммит]: ${message}`);
  render();

  if (!currentUser) return;

  const packedGameState = {
    garage: state.garage,
    marketCars: state.marketCars,
    upgrades: state.upgrades,
    financialHistory: state.financialHistory,
    loan: state.loan,
    events: state.events,
    totalInvested: state.totalInvested
  };

  const { error } = await supabaseClient
    .from('profiles')
    .update({
      balance: state.balance,
      profit_total: state.profitTotal,
      xp: state.xp,
      reputation: state.reputation,
      sold_count: state.soldCount,
      game_state: packedGameState,
      updated_at: new Date().toISOString()
    })
    .eq('id', currentUser.id);

  if (error) {
    console.error("Ошибка облачного сохранения:", error.message);
  } else {
    if (message.includes("реализован") || message.includes("Ликвидация")) {
      renderCompetitorRating();
    }
  }
}

// --- ЛОГИКА АВТОРИЗАЦИИ ---
function setupAuthListeners() {
  const authForm = document.querySelector("#authForm");
  const authToggleType = document.querySelector("#authToggleType");
  const authTitle = document.querySelector("#authTitle");
  const authDesc = document.querySelector("#authDesc");
  const authSubmitBtn = document.querySelector("#authSubmitBtn");
  const usernameLabel = document.querySelector("#usernameLabel");
  
  let isSignUpMode = true;

  authToggleType.addEventListener("click", () => {
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
      authTitle.textContent = "Регистрация мастера";
      authDesc.textContent = "Создайте аккаунт, чтобы попасть в облачный рейтинг механиков.";
      authSubmitBtn.textContent = "Зарегистрироваться";
      authToggleType.textContent = "Уже есть аккаунт? Войти";
      usernameLabel.style.display = "flex";
      document.querySelector("#authUsername").required = true;
    } else {
      authTitle.textContent = "Вход в мастерскую";
      authDesc.textContent = "Введите свои данные для загрузки облачного сохранения.";
      authSubmitBtn.textContent = "Войти в систему";
      authToggleType.textContent = "Нет аккаунта? Стать мастером";
      usernameLabel.style.display = "none";
      document.querySelector("#authUsername").required = false;
    }
  });

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#authEmail").value;
    const password = document.querySelector("#authPassword").value;
    const username = document.querySelector("#authUsername").value;

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = "Обработка...";

    try {
      if (isSignUpMode) {
        const { error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: { data: { username: username } }
        });
        if (error) throw error;
        showToast("Успешная регистрация! Вход выполнен.");
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showToast("С возвращением на СТО!");
      }
    } catch (err) {
      alert("Ошибка авторизации: " + err.message);
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = isSignUpMode ? "Зарегистрироваться" : "Войти в систему";
    }
  });
}

// --- ТАБЛИЦА ЛИДЕРОВ (ОБЩИЙ РЕЙТИНГ) ---
async function renderCompetitorRating() {
  if (!elements.ratingList) return;
  elements.ratingList.innerHTML = `<div style="padding: 20px; color: var(--muted)">Загрузка глобального рейтинга...</div>`;

  try {
    const { data: topPlayers, error } = await supabaseClient
      .from('profiles')
      .select('username, profit_total, reputation, id')
      .order('profit_total', { ascending: false })
      .limit(10);

    if (error) throw error;
    elements.ratingList.innerHTML = "";

    if (!topPlayers || topPlayers.length === 0) {
      elements.ratingList.innerHTML = `<div style="padding: 20px; color: var(--muted)">Рейтинг пуст. Станьте первым!</div>`;
      return;
    }

    topPlayers.forEach((player, index) => {
      const isMe = currentUser && player.id === currentUser.id;
      const card = document.createElement("div");
      
      let rankBadge = `${index + 1}`;
      if (index === 0) rankBadge = "🥇";
      else if (index === 1) rankBadge = "🥈";
      else if (index === 2) rankBadge = "🥉";

      card.className = `compact-item ${isMe ? 'is-active-row' : ''}`;
      if (isMe) {
        card.style.border = "1px solid var(--blue)";
        card.style.background = "var(--panel-3)";
      }
      
      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
          <span style="font-size: 16px; font-weight: bold; min-width: 24px;">${rankBadge}</span>
          <div style="flex-grow: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>${player.username} ${isMe ? '<span style="color:var(--blue); font-size:11px;">(Вы)</span>' : ''}</strong>
              <span style="color: var(--green); font-weight: bold;">+${formatMoney(player.profit_total)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-top: 4px;">
              <span>Репутация: ${player.reputation}%</span>
              <span>Статус: Онлайн</span>
            </div>
          </div>
        </div>
      `;
      elements.ratingList.appendChild(card);
    });
  } catch (err) {
    console.error("Ошибка рейтинга:", err.message);
    elements.ratingList.innerHTML = `<div style="padding: 20px; color: var(--red)">Не удалось загрузить живой рейтинг игроков.</div>`;
  }
}

// Оставшиеся функции вашей бизнес-логики игры (генерация авто, ремонт, продажа, рендер интерфейса, переключение вкладок, кредиты)
function formatMoney(v) { return `${money.format(v)} ₸`; }

function showToast(m) {
  if(!elements.toast) return;
  elements.toast.textContent = m;
  elements.toast.classList.add("is-visible");
  setTimeout(() => elements.toast.classList.remove("is-visible"), 3000);
}

function addEvent(type, title, text) {
  state.events.unshift({ type, title, text, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
}

function refreshMarket() {
  // Логика создания случайных машин на рынке авторынка...
  state.marketCars = [];
  for (let i = 0; i < 4; i++) {
    const t = carTemplates[Math.floor(Math.random() * carTemplates.length)];
    const conditionScore = 20 + Math.floor(Math.random() * 55); 
    const buyPrice = Math.floor(t.basePrice * (conditionScore / 100) * (0.85 + Math.random() * 0.25));
    
    state.marketCars.push({
      uid: "car_" + Date.now() + "_" + Math.floor(Math.random()*1000),
      id: t.id, name: t.name, year: t.year, image: t.image, resaleMult: t.resaleMult,
      buyPrice, conditionScore, diagnosed: false,
      systemsHealth: {
        engine: 15 + Math.floor(Math.random()*70),
        suspension: 15 + Math.floor(Math.random()*70),
        brakes: 15 + Math.floor(Math.random()*70),
        electric: 15 + Math.floor(Math.random()*70),
        body: 15 + Math.floor(Math.random()*70)
      }
    });
  }
}

function render() {
  if (!currentUser) return;
  
  // Обновление текстов шапки СТО
  if(elements.balance) elements.balance.textContent = formatMoney(state.balance);
  if(elements.xp) elements.xp.textContent = state.xp;
  if(elements.reputation) elements.reputation.textContent = `${state.reputation}%`;
  if(elements.soldCount) elements.soldCount.textContent = state.soldCount;
  if(elements.profitTotal) elements.profitTotal.textContent = formatMoney(state.profitTotal);

  // Отрисовка рынка машин
  if(elements.marketList) {
    elements.marketList.innerHTML = "";
    state.marketCars.forEach(car => {
      const el = document.createElement("div");
      el.className = "compact-item";
      el.innerHTML = `<strong>${car.name} (${car.year} г.)</strong> <span>Цена: ${formatMoney(car.buyPrice)}</span> <button onclick="buyCar('${car.uid}')">Купить</button>`;
      elements.marketList.appendChild(el);
    });
  }

  // Отрисовка гаража
  if(elements.garageList) {
    elements.garageList.innerHTML = "";
    state.garage.forEach(car => {
      const el = document.createElement("div");
      el.className = "compact-item";
      el.innerHTML = `<strong>${car.name}</strong> <span>Состояние: ${car.conditionScore}%</span> <button onclick="sellCar('${car.uid}')">Продать</button>`;
      elements.garageList.appendChild(el);
    });
  }
}

function buyCar(uid) {
  const idx = state.marketCars.findIndex(c => c.uid === uid);
  if(idx === -1) return;
  const car = state.marketCars[idx];
  if(state.balance < car.buyPrice) { showToast("Недостаточно средств!"); return; }
  
  state.balance -= car.buyPrice;
  state.garage.push(car);
  state.marketCars.splice(idx, 1);
  addEvent("good", "Покупка авто", `Вы приобрели ${car.name}`);
  commit("Машина перегнана в гараж");
}

function sellCar(uid) {
  const idx = state.garage.findIndex(c => c.uid === uid);
  if(idx === -1) return;
  const car = state.garage[idx];
  
  const finalPrice = Math.floor(car.buyPrice * car.resaleMult * (car.conditionScore / 100));
  const cleanProfit = finalPrice - car.buyPrice;

  state.balance += finalPrice;
  state.profitTotal += cleanProfit;
  state.soldCount += 1;
  state.garage.splice(idx, 1);
  
  addEvent("good", "Автомобиль реализован", `Продан ${car.name} за ${formatMoney(finalPrice)}`);
  commit("Автомобиль успешно реализован!");
}

function switchView(v) {
  document.querySelectorAll(".view").forEach(el => el.classList.remove("is-visible"));
  const view = document.querySelector(`#${v}View`);
  if (view) view.classList.add(\"is-visible\");
  document.querySelectorAll(".nav-button").forEach(b => b.classList.toggle("is-active", b.dataset.view === v));
  if(v === 'rating') renderCompetitorRating();
}

function injectLogoutButton() {
  const settingsView = document.querySelector("#settingsView");
  if (settingsView && !document.querySelector("#logoutSection")) {
    const logoutSec = document.createElement("div");
    logoutSec.id = "logoutSection";
    logoutSec.className = "logout-section";
    logoutSec.innerHTML = `
      <h3 style="color: var(--red)">Управление сессией</h3>
      <button class="secondary-button" id="logoutBtn" type="button" style="color: var(--red)">Выйти из аккаунта</button>
    `;
    settingsView.appendChild(logoutSec);
    document.querySelector("#logoutBtn").addEventListener("click", () => {
      if (confirm("Выйти из текущего профиля?")) supabaseClient.auth.signOut();
    });
  }
}

// Навешивание событий на кнопки навигации
document.querySelectorAll(".nav-button").forEach(b => {
  b.addEventListener("click", () => switchView(b.dataset.view));
});

injectLogoutButton();
initApp();
