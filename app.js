// Инициализация Supabase с вашими ключами
const SUPABASE_URL = "https://ycmvhvsbcexxpuzdskpu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ztQr6Kblgt4kb-3R3nhiPg_ctswPZb6"; // Публичный ключ авторизации
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

// Сессионные переменные игрока
let currentUser = null;

const conditionLabels = { poor: "Критическое", fair: "Удовлетворительное", good: "Стабильное" };
const systems = { engine: "ДВС", suspension: "Ходовая часть", brakes: "Тормозная система", electric: "Электроника", body: "Кузов" };

// ... Ваши массивы carTemplates, possibleRepairs, marketEvents, upgradeTemplates, creditProducts остаются без изменений ...

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
  currentEvent: null, // Инициализируется динамически
  loan: { active: false, principal: 0, remaining: 0, name: "" },
  events: [{ type: "good", title: "Инициализация системы", text: "Платформа запущена в штатном режиме.", time: "Бизнес-инкубатор" }]
};

let state = JSON.parse(JSON.stringify(initialState));

// --- УПРАВЛЕНИЕ АВТЕНТИФИКАЦИЕЙ И СОСТОЯНИЕМ ЧЕРЕЗ SUPABASE ---

async function initApp() {
  // Настройка слушателей формы авторизации
  setupAuthListeners();

  // Проверяем текущую сессию
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    document.querySelector("#authOverlay").style.display = "none";
    await loadUserData();
  } else {
    document.querySelector("#authOverlay").style.display = "flex";
  }

  // Слушаем изменения авторизации (вход/выход)
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

// Загрузка данных игрока из таблицы profiles
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
      // Восстанавливаем параметры игры
      state.balance = Number(data.balance);
      state.profitTotal = Number(data.profit_total);
      state.xp = Number(data.xp);
      state.reputation = Number(data.reputation);
      state.soldCount = Number(data.sold_count);
      
      // Полное состояние (гараж, улучшения, кредиты и т.д.) берем из jsonb
      if (data.game_state && Object.keys(data.game_state).length > 0) {
        state.garage = data.game_state.garage || [];
        state.marketCars = data.game_state.marketCars || [];
        state.upgrades = data.game_state.upgrades || state.upgrades;
        state.financialHistory = data.game_state.financialHistory || [];
        state.loan = data.game_state.loan || state.loan;
        state.events = data.game_state.events || state.events;
        state.totalInvested = data.game_state.totalInvested || 0;
      }
      
      // Заполняем профиль в шапке
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

// Функция сохранения состояния в Supabase (Заменяет ваш старый localStorage-метод commit)
async function commit(message = "") {
  if (message) console.log(`[Игровой коммит]: ${message}`);
  
  // Рендерим изменения в интерфейсе незамедлительно
  render();

  if (!currentUser) return;

  // Формируем упакованный стейт для сохранения структуры игры
  const packedGameState = {
    garage: state.garage,
    marketCars: state.marketCars,
    upgrades: state.upgrades,
    financialHistory: state.financialHistory,
    loan: state.loan,
    events: state.events,
    totalInvested: state.totalInvested
  };

  // Отправляем изменения в базу данных
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
    // При каждом важном действии (например, продаже машины) обновляем таблицу лидеров
    if (message.includes("реализован") || message.includes("Ликвидация")) {
      renderCompetitorRating();
    }
  }
}

// Переопределяем функцию сброса игры под облако
async function resetGame() {
  if (!confirm("Вы уверены, что хотите обнулить облачное сохранение текущего мастера?")) return;
  state = JSON.parse(JSON.stringify(initialState));
  state.marketCars = [];
  refreshMarket();
  await commit("Сброс игрового прогресса аккаунта.");
  showToast("Ваша мастерская реструктуризирована.");
}

// --- ЛОГИКА АВТОРИЗАЦИИ (РЕГИСТРАЦИЯ / ВХОД) ---

function setupAuthListeners() {
  const authForm = document.querySelector("#authForm");
  const authToggleType = document.querySelector("#authToggleType");
  const authTitle = document.querySelector("#authTitle");
  const authDesc = document.querySelector("#authDesc");
  const authSubmitBtn = document.querySelector("#authSubmitBtn");
  const usernameLabel = document.querySelector("#usernameLabel");
  
  let isSignUpMode = true; // По умолчанию регистрация

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
        // Регистрация в Supabase Auth
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { username: username } // Передаем никнейм в метаданные триггеру
          }
        });
        if (error) throw error;
        showToast("Успешная регистрация! Вход выполнен.");
      } else {
        // Вход в систему
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
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

// Добавляем опцию выхода из аккаунта в интерфейс настроек динамически
function injectLogoutButton() {
  const settingsView = document.querySelector("#settingsView");
  if (settingsView && !document.querySelector("#logoutSection")) {
    const logoutSec = document.createElement("div");
    logoutSec.id = "logoutSection";
    logoutSec.className = "logout-section";
    logoutSec.innerHTML = `
      <h3 style="color: var(--red)">Управление сессией</h3>
      <p style="color: var(--muted); font-size:13px">Вы можете выйти из текущего аккаунта. Прогресс надежно сохранен в облаке.</p>
      <button class="secondary-button" id="logoutBtn" type="button" style="border-color: var(--red); color: var(--red)">Выйти из аккаунта</button>
    `;
    settingsView.appendChild(logoutSec);
    document.querySelector("#logoutBtn").addEventListener("click", () => {
      if (confirm("Выйти из текущего профиля?")) supabaseClient.auth.signOut();
    });
  }
}

// --- ШАГ 4: МОДИФИКАЦИЯ ТАБЛИЦЫ ЛИДЕРОВ (ОБЩИЙ РЕЙТИНГ ИГРОКОВ) ---

async function renderCompetitorRating() {
  if (!elements.ratingList) return;
  
  elements.ratingList.innerHTML = `<div style="padding: 20px; color: var(--muted)">Загрузка глобального рейтинга...</div>`;

  try {
    // Делаем запрос к Supabase: сортируем по общей чистой прибыли сверху вниз, лимит 10 лучших
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
      
      // Выделяем цветом топ-3 места и текущего авторизованного игрока
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
              <span>Репутация перекупщика: ${player.reputation}%</span>
              <span>Статус: Облачный профиль</span>
            </div>
          </div>
        </div>
      `;
      elements.ratingList.appendChild(card);
    });

  } catch (err) {
    console.error("Ошибка рендеринга таблицы лидеров:", err.message);
    elements.ratingList.innerHTML = `<div style="padding: 20px; color: var(--red)">Не удалось загрузить живой рейтинг игроков.</div>`;
  }
}

// Заменяем вызов инициализации в самом конце файла app.js:
// Старый вызов: injectAnalyticsContainers(); render();
// Новый вызов:
injectAnalyticsContainers();
injectLogoutButton();
initApp();
