// 1. НАСТРОЙКА ПОДКЛЮЧЕНИЯ К SUPABASE
const SUPABASE_URL = "https://ycmvhvsbcexxpuzdskpu.supabase.co";
const SUPABASE_KEY = "sb_publishable_ztQr6Kblgt4kb-3R3nhiPg_ctswPZb6";

// Защита от повторного объявления переменной в браузере
if (!window.supabaseClient) {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

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

let myGarage = []; // Здесь будут хранить купленные машины

// 3. СТАРТ ПРИЛОЖЕНИЯ И ПРОВЕРКА АВТОРИЗАЦИИ
document.addEventListener("DOMContentLoaded", async () => {
    initNavigation();
    initAuthDOM();
    
    try {
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        if (session && session.user) {
            playerState.id = session.user.id;
            await loadPlayerProfile();
        } else {
            showAuthModal();
        }
    } catch (e) {
        console.log("Ожидание авторизации...");
        showAuthModal();
    }
    
    updateUI();
    setupGameEventListeners();
});

// 4. РАБОТА С БАЗОЙ ДАННЫХ
async function loadPlayerProfile() {
    try {
        let { data: profile, error } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', playerState.id)
            .single();

        if (error && error.code === 'PGRST116') {
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
    const { error } = await window.supabaseClient
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
}

async function savePlayerProfile() {
    if (!playerState.id) return;
    await window.supabaseClient
        .from('profiles')
        .update({
            balance: playerState.balance,
            xp: playerState.xp,
            reputation: playerState.reputation,
            sold_count: playerState.sold_count,
            profit_total: playerState.profit_total
        })
        .eq('id', playerState.id);
}

// 5. ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
function updateUI() {
    // Безопасное обновление элементов (если элемент есть в HTML - обновляем, если нет - код не падает)
    const setTxt = (selector, val) => {
        const el = document.querySelector(selector);
        if (el) el.innerText = val;
    };

    setTxt('.stats-container .stat-card:nth-child(1) span', `${playerState.balance.toLocaleString()} ₸`);
    setTxt('#player-balance', `${playerState.balance.toLocaleString()} ₸`);
    
    setTxt('.stats-container .stat-card:nth-child(2) span', `${playerState.xp} / 1000`);
    setTxt('#player-xp', `${playerState.xp} / 1000`);
    
    setTxt('.stats-container .stat-card:nth-child(3) span', `${playerState.reputation}%`);
    setTxt('#player-reputation', `${playerState.reputation}%`);
    
    setTxt('.stats-container .stat-card:nth-child(4) span', playerState.sold_count);
    setTxt('#player-sold', playerState.sold_count);
    
    const currentLevel = Math.floor(playerState.xp / 500) + 1;
    setTxt('.stats-container .stat-card:nth-child(5) span', `${playerState.username} (Ур. ${currentLevel})`);
    setTxt('#player-level', `${playerState.username} (Ур. ${currentLevel})`);
    
    renderGarage();
}

function initNavigation() {
    const navItems = document.querySelectorAll('.sidebar-menu li, .menu-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if (item.innerText.includes('Рейтинг') || item.getAttribute('data-tab') === 'rating') {
                loadLeaderboard();
            }
        });
    });
}

// 6. УМНЫЕ ИГРОВЫЕ СОБЫТИЯ (ЧИТАЮТ ДАННЫЕ ИЗ ТВОЕГО HTML)
function setupGameEventListeners() {
    document.body.addEventListener('click', async (e) => {
        
        // Кнопка ПОКУПКИ машины
        if (e.target.classList.contains('buy-car-btn')) {
            // Код сам смотрит на атрибуты кнопки, которую ты нажал в HTML!
            const carName = e.target.getAttribute('data-name') || "BMW E30";
            const carPrice = parseInt(e.target.getAttribute('data-price')) || 650000;
            const repairCost = parseInt(e.target.getAttribute('data-repair')) || 150000;
            const sellPrice = parseInt(e.target.getAttribute('data-sell')) || 1100000;

            if (playerState.balance >= carPrice) {
                playerState.balance -= carPrice;
                myGarage.push({
                    instanceId: Date.now(),
                    name: carName,
                    price: carPrice,
                    repairCost: repairCost,
                    sellPrice: sellPrice,
                    broken: true
                });
                alert(`Вы купили ${carName}! Машина доставлена в гараж.`);
                updateUI();
                await savePlayerProfile();
            } else {
                alert("Недостаточно денег!");
            }
        }

        // Кнопка ПОЧИНКИ машины
        if (e.target.classList.contains('repair-car-btn')) {
            const instanceId = parseInt(e.target.getAttribute('data-instance-id'));
            const car = myGarage.find(c => c.instanceId === instanceId);
            if (car && car.broken) {
                if (playerState.balance >= car.repairCost) {
                    playerState.balance -= car.repairCost;
                    car.broken = false;
                    playerState.xp += 150;
                    alert(`Ремонт ${car.name} завершен! (+150 XP)`);
                    updateUI();
                    await savePlayerProfile();
                } else {
                    alert("Недостаточно денег на запчасти!");
                }
            }
        }

        // Кнопка ПРОДАЖИ машины
        if (e.target.classList.contains('sell-car-btn')) {
            const instanceId = parseInt(e.target.getAttribute('data-instance-id'));
            const carIndex = myGarage.findIndex(c => c.instanceId === instanceId);
            if (carIndex !== -1) {
                const car = myGarage[carIndex];
                let finalPrice = car.broken ? Math.floor(car.sellPrice * 0.5) : car.sellPrice;
                
                playerState.balance += finalPrice;
                playerState.sold_count += 1;
                
                let profit = finalPrice - car.price;
                if (!car.broken) profit -= car.repairCost;
                if (profit > 0) playerState.profit_total += profit;

                alert(`Машина ${car.name} продана за ${finalPrice.toLocaleString()} ₸!`);
                myGarage.splice(carIndex, 1);
                updateUI();
                await savePlayerProfile();
            }
        }
    });
}

// 7. ОТРИСОВКА ГАРАЖА И ЛИДЕРБОРДА
function renderGarage() {
    const garageContainer = document.getElementById('garage-list') || document.querySelector('.garage-container');
    if (!garageContainer) return;
    
    if (myGarage.length === 0) {
        garageContainer.innerHTML = '<p style="color:#64748b; text-align:center; padding:20px;">В гараже пусто. Купите машину на рынке!</p>';
        return;
    }
    garageContainer.innerHTML = myGarage.map(car => `
        <div style="background:#1e293b; padding:15px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; color:#fff;">
            <div>
                <strong>${car.name}</strong> 
                <span style="color:${car.broken ? '#ef4444' : '#10b981'}; font-size:12px; margin-left:10px;">
                    [${car.broken ? 'Требует ремонт' : 'Готова к продаже'}]
                </span><br>
                <span style="color:#94a3b8; font-size:13px;">Выкупят за: ${(car.broken ? Math.floor(car.sellPrice*0.5) : car.sellPrice).toLocaleString()} ₸</span>
            </div>
            <div>
                ${car.broken ? `<button class="repair-car-btn" data-instance-id="${car.instanceId}" style="background:#eab308; border:none; padding:6px 12px; border-radius:5px; cursor:pointer; margin-right:5px; font-weight:bold;">Починить (${car.repairCost.toLocaleString()} ₸)</button>` : ''}
                <button class="sell-car-btn" data-instance-id="${car.instanceId}" style="background:#10b981; border:none; padding:6px 12px; border-radius:5px; color:#fff; cursor:pointer;">Продать</button>
            </div>
        </div>
    `).join('');
}

async function loadLeaderboard() {
    try {
        const { data: topPlayers, error } = await window.supabaseClient
            .from('profiles')
            .select('username, profit_total')
            .order('profit_total', { ascending: false })
            .limit(10);

        if (error) return;

        const leaderboardContainer = document.querySelector('.rating-table-body') || document.getElementById('leaderboard');
        if (leaderboardContainer) {
            leaderboardContainer.innerHTML = topPlayers.map((p, index) => `
                <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #334155; color:#fff;">
                    <span>${index + 1}. 🌟 ${p.username}</span>
                    <span style="font-weight:bold; color:#10b981;">+${p.profit_total.toLocaleString()} ₸</span>
                </div>
            `).join('');
        }
    } catch(e){}
}

// 8. ДИНАМИЧЕСКАЯ ОКНО АВТОРИЗАЦИИ
function initAuthDOM() {
    if (document.getElementById('auth-modal')) return;
    const modalHtml = `
        <div id="auth-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,14,23,0.95);display:flex;justify-content:center;align-items:center;z-index:9999;">
            <div style="background:#1e293b;padding:30px;border-radius:12px;width:340px;color:#fff;font-family:sans-serif;">
                <h3 id="auth-title" style="margin-top:0;margin-bottom:20px;text-align:center;color:#3b82f6;">Регистрация мастера</h3>
                <div style="margin-bottom:15px;">
                    <label style="display:block;margin-bottom:5px;font-size:14px;color:#94a3b8;">Имя (Никнейм)</label>
                    <input type="text" id="auth-username" style="width:100%;padding:10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#fff;box-sizing:border-box;">
                </div>
                <div style="margin-bottom:15px;">
                    <label style="display:block;margin-bottom:5px;font-size:14px;color:#94a3b8;">Email</label>
                    <input type="email" id="auth-email" style="width:100%;padding:10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#fff;box-sizing:border-box;">
                </div>
                <div style="margin-bottom:20px;">
                    <label style="display:block;margin-bottom:5px;font-size:14px;color:#94a3b8;">Пароль</label>
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
        title.innerText = isSignUpMode ? "Регистрация мастера" : "Вход в мастерскую";
        usernameBlock.style.display = isSignUpMode ? "block" : "none";
        submitBtn.innerText = isSignUpMode ? "Создать профиль" : "Войти в игру";
        toggleText.innerText = isSignUpMode ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться";
        errorEl.style.display = "none";
    });

    submitBtn.addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value.trim();
        const username = document.getElementById('auth-username').value.trim();
        errorEl.style.display = "none";

        if (!email || !password) return;

        if (isSignUpMode) {
            if (!username) return;
            const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
            if (error) { errorEl.innerText = error.message; errorEl.style.display = "block"; }
            else if (data.user) {
                playerState.id = data.user.id; playerState.username = username;
                await createPlayerProfile(username); hideAuthModal(); updateUI();
            }
        } else {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) { errorEl.innerText = error.message; errorEl.style.display = "block"; }
            else if (data.user) {
                playerState.id = data.user.id; await loadPlayerProfile(); hideAuthModal(); updateUI();
            }
        }
    });
}
function showAuthModal() { document.getElementById('auth-modal').style.display = 'flex'; }
function hideAuthModal() { document.getElementById('auth-modal').style.display = 'none'; }
