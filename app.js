// НАСТРОЙКА SUPABASE: Вставь сюда свои данные из настроек API Supabase
const SUPABASE_URL = "https://ycmvhvsbcexxpuzdskpu.supabase.co";
const SUPABASE_KEY = "sb_publishable_ztQr6Kblgt4kb-3R3nhiPg_ctswPZb6";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const money = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0
});

const storageKey = "autoFixSimulatorStateV3";

const conditionLabels = {
  poor: "Плохое",
  fair: "Среднее",
  good: "Хорошее"
};

const systems = {
  engine: "Двигатель",
  suspension: "Подвеска",
  brakes: "Тормоза",
  electric: "Электрика",
  body: "Кузов"
};

// Список автомобилей с добавлением уровней доступа (requiredLevel)
const cars = [
  {
    id: "mercedes-w201",
    name: "Mercedes-Benz W201",
    year: 1991,
    mileage: 246000,
    price: 500000,
    resale: 735000,
    condition: "poor",
    requiredLevel: 1, // Доступен сразу
    image: "assets/camry.svg",
    baseHealth: { engine: 40, suspension: 30, brakes: 50, electric: 20, body: 35 },
    visibleRepairs: [
      { id: "w201-suspension", name: "Ремонт передней подвески", system: "suspension", cost: 47000, impact: 22 },
      { id: "w201-body", name: "Кузовные работы", system: "body", cost: 40000, impact: 18 }
    ],
    hiddenRepairs: [
      { id: "w201-engine", name: "Цепь ГРМ и течь масла", system: "engine", cost: 126000, impact: 28 },
      { id: "w201-electric", name: "Проводка блока предохранителей", system: "electric", cost: 38000, impact: 24 }
    ]
  },
  {
    id: "mercedes-w124",
    name: "Mercedes-Benz W124",
    year: 1994,
    mileage: 221000,
    price: 700000,
    resale: 875000,
    condition: "fair",
    requiredLevel: 1,
    image: "assets/focus.svg",
    baseHealth: { engine: 58, suspension: 45, brakes: 62, electric: 48, body: 54 },
    visibleRepairs: [
      { id: "w124-brakes", name: "Тормозные диски и колодки", system: "brakes", cost: 39000, impact: 18 },
      { id: "w124-detail", name: "Полировка кузова", system: "body", cost: 23000, impact: 10 }
    ],
    hiddenRepairs: [
      { id: "w124-gearbox", name: "Ремонт АКПП", system: "engine", cost: 168000, impact: 24 },
      { id: "w124-wiring", name: "Плавающая ошибка проводки", system: "electric", cost: 46000, impact: 18 }
    ]
  },
  {
    id: "bmw-e30",
    name: "BMW E30",
    year: 1989,
    mileage: 198000,
    price: 650000,
    resale: 930000,
    condition: "good",
    requiredLevel: 2, // ТРЕБУЕТСЯ 2 УРОВЕНЬ
    image: "assets/civic.svg",
    baseHealth: { engine: 68, suspension: 63, brakes: 66, electric: 55, body: 72 },
    visibleRepairs: [
      { id: "e30-suspension", name: "Сайлентблоки и стойки", system: "suspension", cost: 52000, impact: 18 },
      { id: "e30-brakes", name: "Обслуживание тормозов", system: "brakes", cost: 28000, impact: 14 }
    ],
    hiddenRepairs: [
      { id: "e30-body", name: "Скрытая коррозия арок", system: "body", cost: 72000, impact: 16 }
    ]
  },
  {
    id: "audi-a4-b6",
    name: "Audi A4 B6",
    year: 2003,
    mileage: 192000,
    price: 480000,
    resale: 650000,
    condition: "fair",
    requiredLevel: 1,
    image: "assets/octavia.svg",
    baseHealth: { engine: 52, suspension: 48, brakes: 61, electric: 44, body: 62 },
    visibleRepairs: [
      { id: "a4-service", name: "Большое ТО", system: "engine", cost: 41000, impact: 16 },
      { id: "a4-suspension", name: "Рычаги подвески", system: "suspension", cost: 56000, impact: 20 }
    ],
    hiddenRepairs: [
      { id: "a4-turbo", name: "Турбина на исходе", system: "engine", cost: 142000, impact: 24 },
      { id: "a4-electric", name: "Блок комфорта после влаги", system: "electric", cost: 53000, impact: 20 }
    ]
  },
  {
    id: "vw-golf-5",
    name: "Volkswagen Golf V",
    year: 2007,
    mileage: 174000,
    price: 430000,
    resale: 610000,
    condition: "fair",
    requiredLevel: 1,
    image: "assets/logan.svg",
    baseHealth: { engine: 55, suspension: 52, brakes: 58, electric: 51, body: 60 },
    visibleRepairs: [
      { id: "golf-clutch", name: "Комплект сцепления", system: "engine", cost: 62000, impact: 19 },
      { id: "golf-brakes", name: "Задние тормоза", system: "brakes", cost: 24000, impact: 12 }
    ],
    hiddenRepairs: [
      { id: "golf-mechatronic", name: "Риск мехатроника DSG", system: "engine", cost: 118000, impact: 22 }
    ]
  },
  {
    id: "toyota-camry-v40",
    name: "Toyota Camry V40",
    year: 2008,
    mileage: 201000,
    price: 820000,
    resale: 1030000,
    condition: "good",
    requiredLevel: 3, // ТРЕБУЕТСЯ 3 УРОВЕНЬ
    image: "assets/camry.svg",
    baseHealth: { engine: 70, suspension: 58, brakes: 66, electric: 68, body: 64 },
    visibleRepairs: [
      { id: "camry-service", name: "Плановое ТО", system: "engine", cost: 36000, impact: 12 },
      { id: "camry-glass", name: "Лобовое стекло", system: "body", cost: 31000, impact: 10 }
    ],
    hiddenRepairs: [
      { id: "camry-rack", name: "Рулевая рейка", system: "suspension", cost: 84000, impact: 18 }
    ]
  },
  {
    id: "lada-priora",
    name: "Lada Priora",
    year: 2011,
    mileage: 211000,
    price: 210000,
    resale: 330000,
    condition: "poor",
    requiredLevel: 1,
    image: "assets/priora.svg",
    baseHealth: { engine: 38, suspension: 34, brakes: 43, electric: 28, body: 40 },
    visibleRepairs: [
      { id: "priora-engine", name: "Ремонт двигателя", system: "engine", cost: 68000, impact: 26 },
      { id: "priora-body", name: "Кузовные работы", system: "body", cost: 52000, impact: 18 }
    ],
    hiddenRepairs: [
      { id: "priora-electric", name: "Скрытая проблема ЭБУ", system: "electric", cost: 47000, impact: 22 },
      { id: "priora-brakes", name: "Главный тормозной цилиндр", system: "brakes", cost: 25000, impact: 15 }
    ]
  },
  {
    id: "honda-civic",
    name: "Honda Civic",
    year: 2010,
    mileage: 166000,
    price: 520000,
    resale: 720000,
    condition: "good",
    requiredLevel: 2, // ТРЕБУЕТСЯ 2 УРОВЕНЬ
    image: "assets/civic.svg",
    baseHealth: { engine: 72, suspension: 62, brakes: 61, electric: 70, body: 68 },
    visibleRepairs: [
      { id: "civic-paint", name: "Окрас бампера", system: "body", cost: 33000, impact: 10 },
      { id: "civic-brakes", name: "Передние тормоза", system: "brakes", cost: 27000, impact: 14 }
    ],
    hiddenRepairs: [
      { id: "civic-sensors", name: "Датчики ABS", system: "electric", cost: 29000, impact: 12 }
    ]
  }
];

const initialEvents = [
  { type: "good", title: "Удачная находка", text: "На рынке появился редкий автомобиль по интересной цене.", time: "Сегодня" },
  { type: "warning", title: "Скрытые поломки", text: "Диагностика может открыть проблемы, которых нет в объявлении.", time: "Сегодня" },
  { type: "good", title: "Скидка на детали", text: "Чем выше репутация, тем легче выходить в плюс.", time: "Сегодня" }
];

let globalRating = []; // Сюда загрузим реальный топ из Supabase
let currentUserSession = null;

const initialState = {
  version: 3,
  username: "Механик",
  balance: 1245000,
  xp: 560,
  reputation: 75,
  soldCount: 0,
  repairTotal: 0,
  profitTotal: 0,
  marketSeed: 0,
  garage: [],
  usedCarIds: [],
  events: initialEvents
};

let state = clone(initialState);

const elements = {
  balanceText: document.querySelector("#balanceText"),
  xpText: document.querySelector("#xpText"),
  reputationText: document.querySelector("#reputationText"),
  soldText: document.querySelector("#soldText"),
  levelText: document.querySelector("#levelText"),
  profileName: document.querySelector("#profileName"),
  avatarLetter: document.querySelector("#avatarLetter"),
  searchInput: document.querySelector("#searchInput"),
  conditionFilter: document.querySelector("#conditionFilter"),
  dealFilter: document.querySelector("#dealFilter"),
  marketList: document.querySelector("#marketList"),
  homeMarketList: document.querySelector("#homeMarketList"),
  homeGarageList: document.querySelector("#homeGarageList"),
  garageList: document.querySelector("#garageList"),
  repairList: document.querySelector("#repairList"),
  saleList: document.querySelector("#saleList"),
  eventsList: document.querySelector("#eventsList"),
  homeEventsList: document.querySelector("#homeEventsList"),
  ratingList: document.querySelector("#ratingList"),
  homeRatingList: document.querySelector("#homeRatingList"),
  toast: document.querySelector("#toast"),
  menuButton: document.querySelector("#menuButton"),
  scrim: document.querySelector("#scrim"),
  // Элементы авторизации
  authOverlay: document.querySelector("#authOverlay"),
  authForm: document.querySelector("#authForm"),
  authTitle: document.querySelector("#authTitle"),
  authDesc: document.querySelector("#authDesc"),
  authUsername: document.querySelector("#authUsername"),
  usernameLabel: document.querySelector("#usernameLabel"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authSubmitBtn: document.querySelector("#authSubmitBtn"),
  authToggleType: document.querySelector("#authToggleType"),
  logoutButton: document.querySelector("#logoutButton")
};

// Переключатель типа авторизации (Вход / Регистрация)
let isSignUpMode = true;
elements.authToggleType.addEventListener("click", () => {
  isSignUpMode = !isSignUpMode;
  if (isSignUpMode) {
    elements.authTitle.textContent = "Регистрация мастера";
    elements.authDesc.textContent = "Создайте аккаунт, чтобы попасть в облачный рейтинг механиков.";
    elements.usernameLabel.style.display = "flex";
    elements.authUsername.required = true;
    elements.authSubmitBtn.textContent = "Зарегистрироваться";
    elements.authToggleType.textContent = "Уже есть аккаунт? Войти";
  } else {
    elements.authTitle.textContent = "Вход в мастерскую";
    elements.authDesc.textContent = "Войдите, чтобы восстановить свой прогресс и рейтинг.";
    elements.usernameLabel.style.display = "none";
    elements.authUsername.required = false;
    elements.authSubmitBtn.textContent = "Войти";
    elements.authToggleType.textContent = "Нет аккаунта? Зарегистрироваться";
  }
});

// Слушатели событий интерфейса
document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});
document.querySelectorAll("[data-switch]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.switch));
});
document.querySelectorAll("#resetButton").forEach((button) => {
  button.addEventListener("click", resetGame);
});
document.querySelector("#newDealsButton").addEventListener("click", refreshMarket);
elements.searchInput.addEventListener("input", renderMarket);
elements.conditionFilter.addEventListener("change", renderMarket);
elements.dealFilter.addEventListener("change", renderMarket);
elements.menuButton.addEventListener("click", () => document.body.classList.add("menu-open"));
elements.scrim.addEventListener("click", () => document.body.classList.remove("menu-open"));
elements.logoutButton.addEventListener("click", handleLogout);
elements.authForm.addEventListener("submit", handleAuthSubmit);

// Инициализация авторизации при загрузке страницы
initAuth();

async function initAuth() {
  // Проверяем текущую сессию
  const { data: { session } } = await supabase.auth.getSession();
  handleAuthState(session);

  // Слушаем изменения авторизации (вход/выход)
  supabase.auth.onAuthStateChange((_event, session) => {
    handleAuthState(session);
  });
}

async function handleAuthState(session) {
  if (session) {
    currentUserSession = session;
    elements.authOverlay.style.display = "none";
    await loadUserProfile(session.user.id);
    fetchGlobalRating();
  } else {
    currentUserSession = null;
    elements.authOverlay.style.display = "flex";
  }
}

async function loadUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Профиль в базе еще не создан
      state = clone(initialState);
      state.username = elements.authUsername.value || "Механик";
      await saveStateToCloud();
    } else if (data) {
      // Загружаем данные из облака Supabase
      state.username = data.username;
      state.balance = data.balance;
      state.xp = data.xp;
      state.reputation = data.reputation;
      state.soldCount = data.sold_count;
      state.profitTotal = data.profit_total;
      
      // Локальные структуры гаража можно подгрузить из localStorage
      const local = localStorage.getItem(storageKey + "_" + userId);
      if (local) {
        const parsed = JSON.parse(local);
        state.garage = parsed.garage || [];
        state.usedCarIds = parsed.usedCarIds || [];
        state.events = parsed.events || initialEvents;
      }
    }
  } catch (err) {
    console.error("Ошибка загрузки профиля:", err);
  }
  render();
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = elements.authEmail.value;
  const password = elements.authPassword.value;
  const username = elements.authUsername.value;

  if (isSignUpMode) {
    // Регистрация
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert("Ошибка регистрации: " + error.message);
    } else if (data.user) {
      // Принудительно заносим имя в профиль
      await supabase.from('profiles').insert([
        { id: data.user.id, username: username, balance: initialState.balance, xp: initialState.xp }
      ]);
      showToast("Успешная регистрация!");
    }
  } else {
    // Вход
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Ошибка входа: " + error.message);
    } else {
      showToast("С возвращением!");
    }
  }
}

async function handleLogout() {
  await supabase.auth.signOut();
  localStorage.removeItem(storageKey);
  location.reload();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Измененная функция сохранения — теперь она пишет и локально, и в облако Supabase
async function saveState() {
  if (!currentUserSession) return;
  const userId = currentUserSession.user.id;
  
  // Локальный кэш структур
  localStorage.setItem(storageKey + "_" + userId, JSON.stringify({
    garage: state.garage,
    usedCarIds: state.usedCarIds,
    events: state.events
  }));

  await saveStateToCloud();
}

async function saveStateToCloud() {
  if (!currentUserSession) return;
  const userId = currentUserSession.user.id;

  await supabase
    .from('profiles')
    .upsert({
      id: userId,
      username: state.username,
      balance: state.balance,
      xp: state.xp,
      reputation: state.reputation,
      sold_count: state.soldCount,
      profit_total: state.profitTotal
    });
}

// Загрузка живого рейтинга реальных людей из БД
async function fetchGlobalRating() {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, xp, profit_total')
    .order('profit_total', { ascending: false })
    .limit(10);

  if (!error && data) {
    globalRating = data.map((player, index) => [
      String(index + 1),
      player.username,
      String(Math.max(1, Math.floor(player.xp / 200) + 1)),
      formatMoney(player.profit_total)
    ]);
    renderRating();
  }
}

function formatMoney(value) {
  return `${money.format(value)} ₸`;
}

function getPlayerLevel() {
  return Math.max(1, Math.floor(state.xp / 200) + 1);
}

function render() {
  elements.balanceText.textContent = formatMoney(state.balance);
  elements.xpText.textContent = `${state.xp} / 1000`;
  elements.reputationText.textContent = `${state.reputation}%`;
  elements.soldText.textContent = String(state.soldCount);
  
  const currentLevel = getPlayerLevel();
  elements.levelText.textContent = `Уровень ${currentLevel}`;
  elements.profileName.textContent = state.username;
  elements.avatarLetter.textContent = state.username.charAt(0).toUpperCase();

  renderMarket();
  renderHomeMarket();
  renderGarageCollection(elements.garageList, "garage");
  renderGarageCollection(elements.repairList, "repair");
  renderGarageCollection(elements.saleList, "sale");
  renderHomeGarage();
  renderEvents();
  renderRating();
}

function renderMarket() {
  const search = elements.searchInput.value.trim().toLowerCase();
  const condition = elements.conditionFilter.value;
  const deal = elements.dealFilter.value;
  const filtered = getAvailableCars()
    .filter((car) => car.name.toLowerCase().includes(search))
    .filter((car) => condition === "all" || car.condition === condition)
    .filter((car) => {
      const forecast = getVisibleForecast(car);
      if (deal === "positive") return forecast >= 0;
      if (deal === "danger") return forecast < 70000;
      return true;
    });

  elements.marketList.innerHTML = "";

  if (filtered.length === 0) {
    elements.marketList.append(createEmptyState("Свободных машин нет", "Купленные и проданные автомобили больше не возвращаются на рынок."));
    return;
  }

  filtered.forEach((car) => elements.marketList.append(createMarketCard(car)));
}

function renderHomeMarket() {
  elements.homeMarketList.innerHTML = "";
  const list = getAvailableCars().slice(0, 3);

  if (list.length === 0) {
    elements.homeMarketList.append(createEmptyState("Рынок пуст", "Все уникальные автомобили уже прошли через вашу мастерскую."));
    return;
  }

  list.forEach((car) => elements.homeMarketList.append(createMarketCard(car, true)));
}

function getAvailableCars() {
  const unavailable = new Set([
    ...state.usedCarIds,
    ...state.garage.map(car => car.id)
  ]);

  const available = cars.filter(
    car => !unavailable.has(car.id)
  );

  return shuffle([...available]).slice(0, 9);
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function createMarketCard(car, compact = false) {
  const template = document.querySelector("#marketCardTemplate").content.cloneNode(true);
  const card = template.querySelector(".market-card");
  const image = template.querySelector(".car-image");
  const title = template.querySelector("h2");
  const badge = template.querySelector(".condition-badge");
  const meta = template.querySelector(".car-meta");
  const price = template.querySelector(".price-text");
  const visibleCost = template.querySelector(".visible-cost");
  const forecastText = template.querySelector(".forecast-text");
  const riskText = template.querySelector(".risk-text");
  const button = template.querySelector(".buy-button");
  const visibleForecast = getVisibleForecast(car);
  const realForecast = getRealForecast(car);

  image.src = car.image;
  image.alt = car.name;
  title.textContent = `${car.name}`;
  badge.textContent = conditionLabels[car.condition];
  badge.classList.add(`condition-${car.condition}`);
  meta.textContent = `${car.year} год · ${car.mileage.toLocaleString("ru-RU")} км`;
  price.textContent = formatMoney(car.price);
  visibleCost.textContent = formatMoney(getVisibleRepairCost(car));
  forecastText.textContent = formatMoney(visibleForecast);
  forecastText.classList.add(visibleForecast >= 0 ? "profit-positive" : "profit-negative");
  
  // Добавляем логику ограничений по уровню
  const currentLevel = getPlayerLevel();
  const isLevelLocked = car.requiredLevel && currentLevel < car.requiredLevel;

  if (isLevelLocked) {
    riskText.textContent = `🔒 Доступно только с уровня ${car.requiredLevel}. Повышайте опыт, ремонтируя другие авто!`;
    riskText.style.color = "#e15d64";
    button.disabled = true;
    button.textContent = `Нужен ур. ${car.requiredLevel}`;
  } else {
    riskText.textContent = realForecast < 0
      ? "Есть риск минуса после полной диагностики."
      : "По объявлению выглядит перспективно, но диагностика всё решит.";
    button.disabled = state.balance < car.price;
  }

  button.addEventListener("click", () => buyCar(car.id));

  if (compact) {
    card.classList.add("compact-card");
  }

  return template;
}

function renderGarageCollection(container, mode) {
  container.innerHTML = "";

  if (state.garage.length === 0) {
    container.append(createEmptyState("Гараж пуст", "Купите автомобиль на рынке, чтобы начать диагностику и ремонт."));
    return;
  }

  state.garage.forEach((ownedCar) => container.append(createGarageCard(ownedCar, mode)));
}

function renderHomeGarage() {
  elements.homeGarageList.innerHTML = "";

  if (state.garage.length === 0) {
    elements.homeGarageList.append(createEmptyState("Гараж пуст", "Первая покупка появится здесь."));
    return;
  }

  elements.homeGarageList.append(createGarageCard(state.garage[0], "garage"));
}

function createGarageCard(ownedCar, mode) {
  const car = getCar(ownedCar.id);
  const template = document.querySelector("#garageCardTemplate").content.cloneNode(true);
  const image = template.querySelector(".garage-image");
  const title = template.querySelector("h2");
  const badge = template.querySelector(".profit-badge");
  const meta = template.querySelector(".garage-meta");
  const healthText = template.querySelector(".health-text");
  const systemBars = template.querySelector(".system-bars");
  const purchaseText = template.querySelector(".purchase-text");
  const repairText = template.querySelector(".repair-text");
  const valueText = template.querySelector(".value-text");
  const resultText = template.querySelector(".result-text");
  const note = template.querySelector(".diagnostic-note");
  const repairItems = template.querySelector(".repair-items");
  const diagnoseButton = template.querySelector(".diagnose-button");
  const sellButton = template.querySelector(".sell-button");
  const value = calculateCurrentValue(car, ownedCar);
  const result = value - ownedCar.purchasePrice - ownedCar.repairCost;
  const health = calculateHealth(car, ownedCar);
  const knownRepairs = getKnownRepairs(car, ownedCar);

  image.src = car.image;
  image.alt = car.name;
  title.textContent = car.name;
  badge.textContent = result >= 0 ? "В плюс" : "В минус";
  badge.classList.add(result >= 0 ? "profit-positive" : "profit-negative");
  meta.textContent = `${car.year} год · ${conditionLabels[car.condition]} · ${car.mileage.toLocaleString("ru-RU")} км`;
  healthText.textContent = `${health.total}%`;
  purchaseText.textContent = formatMoney(ownedCar.purchasePrice);
  repairText.textContent = formatMoney(ownedCar.repairCost);
  valueText.textContent = formatMoney(value);
  resultText.textContent = formatMoney(result);
  resultText.classList.add(result >= 0 ? "profit-positive" : "profit-negative");
  note.textContent = getDiagnosticText(car, ownedCar);

  Object.entries(health.systems).forEach(([system, percent]) => {
    const row = document.createElement("div");
    const grade = percent >= 70 ? "good" : percent >= 45 ? "medium" : "";
    row.className = "system-row";
    row.innerHTML = `<span>${systems[system]}</span><div class="bar-track"><div class="bar-fill ${grade}" style="width:${percent}%"></div></div><strong>${percent}%</strong>`;
    systemBars.append(row);
  });

  knownRepairs.forEach((repair) => {
    const isDone = ownedCar.completedRepairs.includes(repair.id);
    const item = document.createElement("div");
    item.className = `repair-row ${repair.hidden ? "hidden-problem" : ""}`;
    item.innerHTML = `<div><strong>${repair.name}</strong><br><span>${systems[repair.system]}${repair.hidden ? " · скрытая поломка" : ""}</span></div><strong>${isDone ? "Готово" : formatMoney(repair.cost)}</strong>`;

    if (!isDone) {
      const repairButton = document.createElement("button");
      repairButton.className = "secondary-button";
      repairButton.type = "button";
      repairButton.textContent = "Ремонт";
      repairButton.disabled = state.balance < repair.cost || mode === "sale";
      repairButton.addEventListener("click", () => repairCar(car.id, repair.id));
      item.append(repairButton);
    }

    repairItems.append(item);
  });

  diagnoseButton.disabled = !hasHiddenProblemsToReveal(car, ownedCar) || mode === "sale";
  diagnoseButton.addEventListener("click", () => diagnoseCar(car.id));

  sellButton.disabled = knownRepairs.length === 0 || mode === "repair";
  sellButton.textContent = `Продать за ${formatMoney(value)}`;
  sellButton.addEventListener("click", () => sellCar(car.id));

  return template;
}

function renderEvents() {
  elements.eventsList.innerHTML = "";
  elements.homeEventsList.innerHTML = "";

  state.events.slice(0, 12).forEach((event) => elements.eventsList.append(createEventItem(event)));
  state.events.slice(0, 3).forEach((event) => elements.homeEventsList.append(createEventItem(event)));
}

function createEventItem(event) {
  const item = document.createElement("article");
  item.className = "event-item";
  item.innerHTML = `<span class="event-type event-${event.type}">${event.type === "good" ? "OK" : event.type === "danger" ? "!" : "i"}</span><div><strong>${event.title}</strong><span>${event.text}</span></div><span class="event-time">${event.time}</span>`;
  return item;
}

function renderRating() {
  elements.ratingList.innerHTML = "";
  elements.homeRatingList.innerHTML = "";
  
  const displayRating = globalRating.length > 0 ? globalRating : [["-", "Загрузка онлайн-топа...", "-", "0 ₸"]];
  
  displayRating.forEach((row) => elements.ratingList.append(createRatingRow(row)));
  displayRating.slice(0, 5).forEach((row) => elements.homeRatingList.append(createRatingRow(row)));
}

function createRatingRow(row) {
  const item = document.createElement("div");
  item.className = "rating-row";
  item.innerHTML = `<strong>${row[0]}</strong><strong>${row[1]}</strong><span>Уровень ${row[2]}</span><strong>${row[3]}</strong>`;
  return item;
}

function buyCar(carId) {
  const car = getCar(carId);

  if (state.balance < car.price) {
    showToast("Недостаточно средств для покупки.");
    return;
  }

  if (state.usedCarIds.includes(carId)) {
    showToast("Эта машина уже была в вашей мастерской.");
    return;
  }

  state.balance -= car.price;
  state.usedCarIds.push(carId);
  state.garage.push({
    id: carId,
    purchasePrice: car.price,
    repairCost: 0,
    completedRepairs: [],
    revealedRepairs: [],
    diagnostics: 0
  });
  addEvent("good", `Покупка ${car.name}`, `Автомобиль добавлен в гараж за ${formatMoney(car.price)}.`);
  commit(`${car.name} куплен. Зайдите в гараж и проведите диагностику.`);
  switchView("garage");
}

function diagnoseCar(carId) {
  const car = getCar(carId);
  const ownedCar = getOwnedCar(carId);
  const hidden = car.hiddenRepairs.find((repair) => !ownedCar.revealedRepairs.includes(repair.id));

  ownedCar.diagnostics += 1;

  if (!hidden) {
    addEvent("good", `Диагностика ${car.name}`, "Новых скрытых проблем не обнаружено.");
    commit("Диагностика завершена: новых проблем нет.");
    return;
  }

  ownedCar.revealedRepairs.push(hidden.id);
  addEvent("danger", `Скрытая поломка`, `${car.name}: ${hidden.name} на ${formatMoney(hidden.cost)}.`);
  commit(`Диагностика нашла новую проблему: ${hidden.name}.`);
}

function repairCar(carId, repairId) {
  const car = getCar(carId);
  const ownedCar = getOwnedCar(carId);
  const repair = getKnownRepairs(car, ownedCar).find((item) => item.id === repairId);

  if (!repair || ownedCar.completedRepairs.includes(repairId)) return;

  if (state.balance < repair.cost) {
    showToast("На этот ремонт пока не хватает денег.");
    return;
  }

  state.balance -= repair.cost;
  state.repairTotal += repair.cost;
  ownedCar.repairCost += repair.cost;
  ownedCar.completedRepairs.push(repairId);
  state.xp += 40;
  addEvent("good", `Ремонт выполнен`, `${car.name}: ${repair.name} за ${formatMoney(repair.cost)}.`);
  commit("Ремонт выполнен. Состояние автомобиля улучшилось.");
}

function sellCar(carId) {
  const car = getCar(carId);
  const ownedCar = getOwnedCar(carId);
  const salePrice = calculateCurrentValue(car, ownedCar);
  const profit = salePrice - ownedCar.purchasePrice - ownedCar.repairCost;

  state.balance += salePrice;
  state.profitTotal += profit;
  state.soldCount += 1;
  state.xp += profit >= 0 ? 90 : 35;
  state.reputation = clamp(state.reputation + (profit >= 0 ? 3 : -6), 20, 100);
  state.garage = state.garage.filter((item) => item.id !== carId);
  addEvent(profit >= 0 ? "good" : "danger", `Продажа ${car.name}`, `Цена ${formatMoney(salePrice)}, итог ${formatMoney(profit)}.`);
  
  commit(profit >= 0 ? `Сделка закрыта в плюс: ${formatMoney(profit)}.` : `Сделка ушла в минус: ${formatMoney(profit)}.`);
  fetchGlobalRating(); // Обновляем топ после продажи
}

function calculateCurrentValue(car, ownedCar) {
  const health = calculateHealth(car, ownedCar).total;
  const hiddenPenalty = getUnrevealedHiddenCost(car, ownedCar) * 0.28;
  const repairedBonus = ownedCar.completedRepairs.length === getKnownRepairs(car, ownedCar).length ? 18000 : 0;
  const value = car.price + Math.round((car.resale - car.price) * (health / 100)) - Math.round(hiddenPenalty) + repairedBonus;
  return Math.max(Math.round(car.price * 0.58), value);
}

function calculateHealth(car, ownedCar) {
  const values = { ...car.baseHealth };
  const knownRepairs = getKnownRepairs(car, ownedCar);

  knownRepairs.forEach((repair) => {
    if (ownedCar.completedRepairs.includes(repair.id)) {
      values[repair.system] = clamp(values[repair.system] + repair.impact, 0, 100);
    }
  });

  car.hiddenRepairs.forEach((repair) => {
    if (!ownedCar.revealedRepairs.includes(repair.id)) {
      values[repair.system] = clamp(values[repair.system] - 5, 0, 100);
    }
  });

  const total = Math.round(Object.values(values).reduce((sum, value) => sum + value, 0) / Object.values(values).length);
  return { total, systems: values };
}

function getKnownRepairs(car, ownedCar) {
  const visible = car.visibleRepairs.map((repair) => ({ ...repair, hidden: false }));
  const hidden = car.hiddenRepairs
    .filter((repair) => ownedCar.revealedRepairs.includes(repair.id))
    .map((repair) => ({ ...repair, hidden: true }));
  return [...visible, ...hidden];
}

function hasHiddenProblemsToReveal(car, ownedCar) {
  return car.hiddenRepairs.some((repair) => !ownedCar.revealedRepairs.includes(repair.id));
}

function getDiagnosticText(car, ownedCar) {
  const hiddenLeft = car.hiddenRepairs.length - ownedCar.revealedRepairs.length;
  if (hiddenLeft > 0) {
    return `Диагностика доступна: может найти ещё ${hiddenLeft} скрыт. проблем.`;
  }
  return "Все скрытые проблемы по этой машине уже найдены.";
}

function getVisibleRepairCost(car) {
  return car.visibleRepairs.reduce((sum, repair) => sum + repair.cost, 0);
}

function getHiddenRepairCost(car) {
  return car.hiddenRepairs.reduce((sum, repair) => sum + repair.cost, 0);
}

function getUnrevealedHiddenCost(car, ownedCar) {
  return car.hiddenRepairs
    .filter((repair) => !ownedCar.revealedRepairs.includes(repair.id))
    .reduce((sum, repair) => sum + repair.cost, 0);
}

function getVisibleForecast(car) {
  return car.resale - car.price - getVisibleRepairCost(car);
}

function getRealForecast(car) {
  return car.resale - car.price - getVisibleRepairCost(car) - getHiddenRepairCost(car);
}

function refreshMarket() {
  state.marketSeed += 1;
  saveState();
  renderMarket();
  renderHomeMarket();
  showToast("Порядок лотов обновлён. Машины не дублируются.");
}

async function resetGame() {
  if (!confirm("Начать новую игру и очистить текущий прогресс?")) return;
  state = clone(initialState);
  state.username = elements.profileName.textContent;
  await saveState();
  render();
  switchView("home");
  showToast("Новая игра началась.");
}

function switchView(viewName) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-visible"));
  document.querySelector(`#${viewName}View`).classList.add("is-visible");
  document.body.classList.remove("menu-open");
  window.scrollTo({ left: 0, top: 0, behavior: "smooth" });
}

function addEvent(type, title, text) {
  state.events.unshift({
    type,
    title,
    text,
    time: new Date().toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  });
}

function commit(message) {
  saveState();
  render();
  showToast(message);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2800);
}

function createEmptyState(title, text) {
  const stateBlock = document.createElement("div");
  stateBlock.className = "empty-state";
  stateBlock.innerHTML = `<h2>${title}</h2><p>${text}</p>`;
  return stateBlock;
}

function getCar(carId) {
  return cars.find((car) => car.id === carId);
}

function getOwnedCar(carId) {
  return state.garage.find((car) => car.id === carId);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
