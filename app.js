// 1. НАСТРОЙКА ПОДКЛЮЧЕНИЯ К SUPABASE
const SUPABASE_URL = "https://ycmvhvsbcexxpuzdskpu.supabase.co";
const SUPABASE_KEY = "sb_publishable_ztQr6Kblgt4kb-3R3nhiPg_ctswPZb6";

// Инициализируем клиент под уникальным именем, чтобы избежать конфликтов в браузере
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. ИГРОВОЕ СОСТОЯНИЕ (ДАННЫЕ ИГРОКА)
let playerState = {
    id: null,
    username: "Мастер",
    balance: 1245000,
    xp: 560,
    reputation: 75,
    sold_count: 0,
    profit_total: 0
};

// Бутафорский список машин для демонстрации рынка и гаража
const carMarket = [
    { id: 1, name: "BMW E30", price: 650000, repairCost: 150000, sellPrice: 1100000, broken: true },
    { id: 2, name: "Toyota Camry V40", price: 1200000, repairCost: 200000, sellPrice: 1800000, broken: true }
];
let myGarage = [];

// 3. СТАРТ ПРИЛОЖЕНИЯ И ПРОВЕРКА АВТОРИЗАЦИИ
document.addEventListener("DOMContentLoaded", async () => {
    initNavigation();
    initAuthDOM();
    
    // Проверяем, вошел ли уже какой-то пользователь
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (session && session.user) {
        playerState.id = session.user.id;
        await loadPlayerProfile();
    } else {
        showAuthModal();
    }
    
    updateUI();
    setupGameEventListeners();
});

// 4. РАБОТА С БАЗОЙ ДАННЫХ (ПРОФИЛИ)
async function loadPlayerProfile() {
    try {
        let { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', playerState.id)
            .single();

        if (error && error.code === 'PGRST116') {
            // Если профиль в таблице еще не создан, создаем его с дефолтными значениями
            await createPlayerProfile(playerState.username);
        } else if (profile) {
            playerState.username = profile.username;
            playerState.balance = profile.balance;
            playerState.xp = profile.xp;
            playerState.reputation = profile.reputation;
            playerState.sold_count = profile.sold_count;
            playerState.profit_total = profile.profit_total;
        }
        hideAuthModal();
    } catch (err) {
        console.error("Ошибка загрузки профиля:", err);
    }
}

async function createPlayerProfile(username) {
    const { error } = await supabaseClient
        .from('profiles')
        .insert([{ 
            id: playerState.id, 
            username: username,
            balance: playerState.balance,
            xp: playerState.xp,
            reputation: playerState.reputation,
            sold_count: playerState.sold_count,
            profit_total: playerState.profit_total
        }]);
    
    if (error) console.error("Ошибка создания профиля:", error);
}

async function savePlayerProfile() {
    if (!playerState.id) return;
    
    const { error } = await supabaseClient
        .from('profiles')
        .update({
            balance: playerState.balance,
            xp: playerState.xp,
            reputation: playerState.reputation,
            sold_count: playerState.sold_count,
            profit_total: playerState.profit_total
        })
        .eq('id', playerState.id);
        
    if (error) console.error("Ошибка сохранения данных в облако:", error);
}

// 5. ИНТЕРФЕЙС И НАВИГАЦИЯ
function updateUI() {
    // Обновление верхней панели (Индикаторы)
    const balanceEl = document.querySelector('.stats-container .stat-card:nth-child(1) span') || document.getElementById('player-balance');
    const xpEl = document.querySelector('.stats-container .stat-card:nth-child(2) span') || document.getElementById('player-xp');
    const repEl = document.querySelector('.stats-container .stat-card:nth-child(3) span') || document.getElementById('player-reputation');
    const soldEl = document.querySelector('.stats-container .stat-card:nth-child(4) span') || document.getElementById('player-sold');
    const levelEl = document.querySelector('.stats-container .stat-card:nth-child(5) span') || document.getElementById('player-level');

    if (balanceEl) balanceEl.innerText = `${playerState.balance.toLocaleString()} ₸`;
    if (xpEl) xpEl.innerText = `${playerState.xp} / 1000`;
    if (repEl) repEl.innerText = `${playerState.reputation}%`;
    if (soldEl) soldEl.innerText = playerState.sold_count;
    if (levelEl) {
        const currentLevel = Math.floor(playerState.xp / 500) + 1;
        levelEl.innerText = `${playerState.username} (Ур. ${currentLevel})`;
    }
    
    renderMarket();
    renderGarage();
}

function initNavigation() {
    const navItems = document.querySelectorAll('.sidebar-menu li, .menu-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Если перешли на вкладку рейтинг — обновляем его из БД
            if (item.innerText.includes('Рейтинг') || item.getAttribute('data-tab') === 'rating') {
                loadLeaderboard();
            }
        });
    });
}

// 6. АВТОРИЗАЦИЯ (ОКНО РЕГИСТРАЦИИ)
function initAuthDOM() {
    // Если модалки нет в HTML, создаем ее динамически
    if (document.getElementById('auth-modal')) return;

    const modalHtml = `
        <div id="auth-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,14,23,0.95);display:flex;justify-content:center;align-items:center;z-index:9999;font-family:sans-serif;">
            <div style="background:#1e293b;padding:30px;border-radius:12px;width:340px;box-shadow:0 10px 25px rgba(0,0,0,0.5);color:#fff;">
                <h3 id="auth-title" style="margin-top:0;margin-bottom:20px;text-align:center;font-size:22px;color:#3b82f6;">Регистрация мастера</h3>
                <div style="margin-bottom:15px;">
                    <label style="display:block;margin-bottom:5px;font-size:14px;color:#94a3b8;">Имя мастера (Никнейм)</label>
                    <input type="text" id="auth-username" style="width:100%;padding:10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#fff;box-sizing:border-box;">
                </div>
                <div style="margin-bottom:15px;">
                    <label style="display:block;margin-bottom:5px;font-size:14px;color:#94a3b8;">Email</label>
                    <input type="email" id="auth-email" style="width:100%;padding:10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#fff;box-sizing:border-box;">
                </div>
                <div style="margin-bottom:20px;">
                    <label style="display:block;margin-bottom:5px;font-size:14px;color:#94a3b8;">Пароль (мин. 6 симв.)</label>
                    <input type="password" id="auth-password" style="width:100%;padding:10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#fff;box-sizing:border-box;">
                </div>
                <button id="auth-submit-btn" style="width:100%;padding:12px;background:#3b82f6;border:none;border-radius:6px;color:#fff;font-weight:bold;cursor:pointer;margin-bottom:12px;">Создать профиль</button>
                <p id="auth-toggle-text" style="font-size:13px;text-align:center;margin:0;color:#94a3b8;cursor:pointer;">Уже есть аккаунт? Войти</p>
                <p id="auth-error" style="color:#ef4444;font-size:13px;text-align:center;margin-top:10px;display:none;"></p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    let isSignUpMode = true;
    const title = document.getElementById('auth-title');
    const usernameBlock = document.getElementById('auth-username').parentElement;
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const errorEl = document.getElementById('auth-error');

    toggleText.addEventListener('click', () => {
        isSignUpMode = !isSignUpMode;
        if (isSignUpMode) {
            title.innerText = "Регистрация мастера";
            usernameBlock.style.display = "block";
            submitBtn.innerText = "Создать профиль";
            toggleText.innerText = "Уже есть аккаунт? Войти";
        } else {
            title.innerText = "Вход в мастерскую";
            usernameBlock.style.display = "none";
            submitBtn.innerText = "Войти в игру";
            toggleText.innerText = "Нет аккаунта? Зарегистрироваться";
        }
        errorEl.style.display = "none";
    });

    submitBtn.addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value.trim();
        const username = document.getElementById('auth-username').value.trim();

        errorEl.style.display = "none";

        if (!email || !password) {
            errorEl.innerText = "Заполните Email и Пароль!";
            errorEl.style.display = "block";
            return;
        }

        if (isSignUpMode) {
            if (!username) {
                errorEl.innerText = "Введите имя мастера!";
                errorEl.style.display = "block";
                return;
            }
            // Регистрация нового аккаунта
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) {
                errorEl.innerText = error.message;
                errorEl.style.display = "block";
            } else if (data.user) {
                playerState.id = data.user.id;
                playerState.username = username;
                await createPlayerProfile(username);
                hideAuthModal();
                updateUI();
            }
        } else {
            // Логин существующего аккаунта
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                errorEl.innerText = error.message;
                errorEl.style.display = "block";
            } else if (data.user) {
                playerState.id = data.user.id;
                await loadPlayerProfile();
                hideAuthModal();
                updateUI();
            }
        }
    });
}

function showAuthModal() { document.getElementById('auth-modal').style.display = 'flex'; }
function hideAuthModal() { document.getElementById('auth-modal').style.display = 'none'; }

// 7. ЛОГИКА ТАБЛИЦЫ ЛИДЕРОВ (РЕЙТИНГ)
async function loadLeaderboard() {
    const { data: topPlayers, error } = await supabaseClient
        .from('profiles')
        .select('username, profit_total, level, reputation')
        .order('profit_total', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Ошибка загрузки рейтинга:", error);
        return;
    }

    // Ищем блок или таблицу рейтинга на странице и заполняем её
    const leaderboardContainer = document.querySelector('.rating-table-body') || document.getElementById('leaderboard');
    if (leaderboardContainer) {
        leaderboardContainer.innerHTML = topPlayers.map((p, index) => `
            <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #334155; background:${index === 0 ? 'rgba(234,179,8,0.1)' : 'transparent'}">
                <span>${index + 1}. 🌟 ${p.username}</span>
                <span style="font-weight:bold; color:#10b981;">+${p.profit_total.toLocaleString()} ₸</span>
            </div>
        `).join('');
    }
}

// 8.ИГРОВЫЕ ДЕЙСТВИЯ (ОЖИВЛЕНИЕ КНОПОК)
function setupGameEventListeners() {
    // Делегирование событий кликов по кнопкам рынка и гаража
    document.body.addEventListener('click', async (e) => {
        if (e.target.classList.contains('buy-car-btn')) {
            const carId = parseInt(e.target.getAttribute('data-id'));
            const car = carMarket.find(c => c.id === carId);
            if (car && playerState.balance >= car.price) {
                playerState.balance -= car.price;
                myGarage.push({ ...car, instanceId: Date.now() });
                alert(`Вы купили ${car.name}! Машина добавлена в гараж.`);
                updateUI();
                await savePlayerProfile();
            } else {
                alert("Недостаточно денег на балансе!");
            }
        }

        if (e.target.classList.contains('repair-car-btn')) {
            const instanceId = parseInt(e.target.getAttribute('data-instance-id'));
            const car = myGarage.find(c => c.instanceId === instanceId);
            if (car && car.broken) {
                if (playerState.balance >= car.repairCost) {
                    playerState.balance -= car.repairCost;
                    car.broken = false;
                    playerState.xp += 150; // Даем опыт за ремонт
