// 1. НАСТРОЙКА SUPABASE
const SUPABASE_URL = "https://ycmvhvsbcexxpuzdskpu.supabase.co";
const SUPABASE_KEY = "sb_publishable_ztQr6Kblgt4kb-3R3nhiPg_ctswPZb6";

if (!window.supabaseClient) {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// 2. ИГРОВОЕ СОСТОЯНИЕ
let playerState = {
    id: null,
    username: "Мастер",
    balance: 1500000, // Стартовый баланс (1.5 млн ₸)
    xp: 0,
    reputation: 100,
    sold_count: 0,
    profit_total: 0
};

// Твой массив шаблонов машин
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
  { id: "mercedes-w204", name: "Mercedes-Benz W204", year: 2011, basePrice: 1100000, resaleMult: 1.28, image: "assets/mercedes-Цw204.jpg" },
  { id: "toyota-mark-2", name: "Toyota Mark II", year: 1998, basePrice: 950000, resaleMult: 1.42, image: "assets/toyota-mark-2.jpg" },
  { id: "volkswagen-golf-5", name: "VW Golf V", year: 2007, basePrice: 950000, resaleMult: 1.34, image: "assets/volkswagen-golf-5.jpg" }
];

let myGarage = [];

// 3. ИНИЦИАЛИЗАЦИЯ ИГРЫ
document.addEventListener("DOMContentLoaded", async () => {
    initNavigation();
    initAuth();
    initFilters();
    setupExtraButtons();
    
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session && session.user) {
            playerState.id = session.user.id;
            await loadPlayerProfile();
        } else {
            showAuthModal();
        }
    } catch (e) {
        showAuthModal();
    }
    
    updateUI();
});

// 4. СИСТЕМА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК (VIEWS)
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewId = btn.getAttribute('data-view');
            switchView(viewId);
        });
    });
}

function switchView(viewId) {
    // Убираем активный класс у всех кнопок навигации
    document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('is-active'));
    const activeBtn = document.querySelector(`.nav-button[data-view="${viewId}"]`);
    if (activeBtn) activeBtn.classList.add('is-active');

    // Переключаем видимость экранов
    document.querySelectorAll('.view').forEach(v => v.classList.remove('is-visible'));
    const targetView = document.getElementById(`${viewId}View`);
    if (targetView) targetView.classList.add('is-visible');

    // Если открыли рейтинг, загружаем данные
    if (viewId === 'rating') loadLeaderboard();
}

// Кнопки перехода внутри контента (например, «К рынку автомобилей»)
function setupExtraButtons() {
    document.body.addEventListener('click', (e) => {
        const switchTarget = e.target.getAttribute('data-switch');
        if (switchTarget) {
            switchView(switchTarget);
        }
    });

    // Настройки: Начать заново
    const resetBtn = document.getElementById('resetButton');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (confirm("Вы уверены, что хотите обнулить весь прогресс?")) {
                playerState.balance = 1500000;
                playerState.xp = 0;
                playerState.reputation = 100;
                playerState.sold_count = 0;
                playerState.profit_total = 0;
                myGarage = [];
                await savePlayerProfile();
                updateUI();
                alert("Прогресс сброшен!");
                switchView('home');
            }
        });
    }
}

// 5. ОБНОВЛЕНИЕ ИНТЕРФЕЙСА И СТАТИСТИКИ
function updateUI() {
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    
    setTxt('balanceText', `${playerState.balance.toLocaleString()} ₸`);
    setTxt('xpText', `${playerState.xp} / 1000`);
    setTxt('reputationText', `${playerState.reputation}%`);
    setTxt('soldText', playerState.sold_count);
    setTxt('profileName', playerState.username);
    setTxt('levelText', `Уровень ${Math.floor(playerState.xp / 500) + 1}`);
    
    const avatar = document.getElementById('avatarLetter');
    if (avatar && playerState.username) avatar.innerText = playerState.username.charAt(0).toUpperCase();

    renderMarket();
    renderGarageViews();
}

// 6. ОТРИСОВКА РЫНКА ЧЕРЕЗ <TEMPLATE>
function renderMarket() {
    const marketList = document.getElementById('marketList');
    const homeMarketList = document.getElementById('homeMarketList');
    const template = document.getElementById('marketCardTemplate');
    
    if (!template) return;

    const searchVal = (document.getElementById('searchInput')?.value || "").toLowerCase();
    const conditionFilter = document.getElementById('conditionFilter')?.value || "all";

    const filteredCars = carTemplates.filter(car => {
        const matchesSearch = car.name.toLowerCase().includes(searchVal);
        // Генерируем фиксированное состояние для рынка на основе ID для разнообразия
        const cond = car.basePrice % 3 === 0 ? "poor" : car.basePrice % 2 === 0 ? "fair" : "good";
        const matchesCond = conditionFilter === "all" || cond === conditionFilter;
        return matchesSearch && matchesCond;
    });

    const createCard = (car) => {
        const clone = template.content.cloneNode(true);
        
        // Заполняем данные по классам из твоего HTML
        clone.querySelector('.car-image').src = car.image;
        clone.querySelector('.car-image').onerror = function() { this.src = 'assets/camry.svg'; };
        clone.querySelector('.card-title h2').innerText = `${car.name} (${car.year} г.)`;
        
        // Состояние
        const condBadge = clone.querySelector('.condition-badge');
        const cond = car.basePrice % 3 === 0 ? "Плохое" : car.basePrice % 2 === 0 ? "Среднее" : "Хорошее";
        if (condBadge) condBadge.innerText = cond;

        clone.querySelector('.price-text').innerText = `${car.basePrice.toLocaleString()} ₸`;
        
        const estRepair = Math.floor(car.basePrice * 0.22);
        clone.querySelector('.visible-cost').innerText = `${estRepair.toLocaleString()} ₸`;
        
        const estProfit = Math.floor((car.basePrice * car.resaleMult) - car.basePrice - estRepair);
        clone.querySelector('.forecast-text').innerText = `~ +${estProfit.toLocaleString()} ₸`;
        clone.querySelector('.risk-text').innerText = estProfit > 100000 ? "Выгодная сделка" : "Средняя доходность";

        // Кнопка покупки
        const buyBtn = clone.querySelector('.buy-button');
        buyBtn.addEventListener('click', () => buyCar(car));

        return clone;
    };

    if (marketList) {
        marketList.innerHTML = '';
        filteredCars.forEach(car => marketList.appendChild(createCard(car)));
    }

    if (homeMarketList) {
        homeMarketList.innerHTML = '';
        filteredCars.slice(0, 3).forEach(car => homeMarketList.appendChild(createCard(car)));
    }
}

// Фильтры поиска на рынке
function initFilters() {
    const search = document.getElementById('searchInput');
    const cond = document.getElementById('conditionFilter');
    const deal = document.getElementById('dealFilter');
    const refreshBtn = document.getElementById('newDealsButton');

    [search, cond, deal].forEach(el => {
        if (el) el.addEventListener('input', renderMarket);
    });

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            alert("Порядок авторынка обновлен!");
            renderMarket();
        });
    }
}

// 7. ОТРИСОВКА ГАРАЖА, РЕМОНТА И ПРОДАЖ ЧЕРЕЗ <TEMPLATE>
function renderGarageViews() {
    const lists = {
        garage: document.getElementById('garageList'),
        homeGarage: document.getElementById('homeGarageList'),
        repair: document.getElementById('repairList'),
        sale: document.getElementById('saleList')
    };
    
    const template = document.getElementById('garageCardTemplate');
    if (!template) return;

    // Очищаем списки
    Object.values(lists).forEach(l => { if (l) l.innerHTML = ''; });

    if (myGarage.length === 0) {
        const emptyMsg = '<p style="color:#9aa7b7; padding:16px;">В гараже пока нет автомобилей.</p>';
        if (lists.garage) lists.garage.innerHTML = emptyMsg;
        if (lists.repair) lists.repair.innerHTML = emptyMsg;
        if (lists.sale) lists.sale.innerHTML = emptyMsg;
        if (lists.homeGarage) lists.homeGarage.innerHTML = emptyMsg;
        return;
    }

    myGarage.forEach(car => {
        const createGarageCard = (viewMode) => {
            const clone = template.content.cloneNode(true);
            
            clone.querySelector('.garage-image').src = car.image;
            clone.querySelector('.garage-image').onerror = function() { this.src = 'assets/camry.svg'; };
            clone.querySelector('.card-title h2').innerText = car.name;
            clone.querySelector('.garage-meta').innerText = `${car.year} год выпуска`;
            
            // Состояние авто (Health)
            clone.querySelector('.health-text').innerText = car.broken ? "35% (Требуется ремонт)" : "100% (Идеальное)";
            const sysBars = clone.querySelector('.system-bars');
            if (sysBars) {
                sysBars.innerHTML = `
                    <div style="font-size:12px; color:#9aa7b7; margin-bottom:4px;">Двигатель: ${car.broken ? '⚠️ Требует переборки' : '✅ Обслужен'}</div>
                    <div style="font-size:12px; color:#9aa7b7;">Ходовая часть: ${car.broken ? '⚠️ Замена стоек' : '✅ Отлично'}</div>
                `;
            }

            // Финансовый блок
            clone.querySelector('.purchase-text').innerText = `${car.purchasePrice.toLocaleString()} ₸`;
            clone.querySelector('.repair-text').innerText = `${car.repairCost.toLocaleString()} ₸`;
            
            let currentVal = car.broken ? Math.floor(car.sellPrice * 0.5) : car.sellPrice;
            clone.querySelector('.value-text').innerText = `${currentVal.toLocaleString()} ₸`;
            
            let finalResult = currentVal - car.purchasePrice - (car.broken ? 0 : car.repairCost);
            const resEl = clone.querySelector('.result-text');
            resEl.innerText = `${finalResult >= 0 ? '+' : ''}${finalResult.toLocaleString()} ₸`;
            resEl.style.color = finalResult >= 0 ? '#10b981' : '#ef4444';

            // Настройка кнопок управления в зависимости от вкладки
            const diagBtn = clone.querySelector('.diagnose-button');
            const sellBtn = clone.querySelector('.sell-button');

            if (car.broken) {
                diagBtn.innerText = `Починить (-${car.repairCost.toLocaleString()} ₸)`;
                diagBtn.addEventListener('click', () => repairCar(car.instanceId));
                sellBtn.innerText = "Сдать перекупам (В минус)";
                sellBtn.style.background = "#475569";
            } else {
                diagBtn.style.display = "none"; // Скрываем ремонт, если починена
                sellBtn.innerText = "Продать клиенту";
                sellBtn.style.background = "#2f6df6";
            }

            sellBtn.addEventListener('click', () => sellCar(car.instanceId));

            return clone;
        };

        // Распределяем карточку по вкладкам твоего приложения
        if (lists.garage) lists.garage.appendChild(createGarageCard('garage'));
        if (lists.repair && car.broken) lists.repair.appendChild(createGarageCard('repair'));
        if (lists.sale && !car.broken) lists.sale.appendChild(createGarageCard('sale'));
    });

    // Для главной страницы выводим 1 последнюю тачку
    if (lists.homeGarage && myGarage.length > 0) {
        const homeClone = template.content.cloneNode(true);
        homeClone.querySelector('.card-title h2').innerText = myGarage[0].name;
        homeClone.querySelector('.garage-image').src = myGarage[0].image;
        homeClone.querySelector('.garage-image').onerror = function() { this.src = 'assets/camry.svg'; };
        homeClone.querySelector('.garage-actions').style.display = "none"; // на главном экране без кнопок
        lists.homeGarage.appendChild(homeClone);
    }
}

// 8. ИГРОВАЯ ЛОГИКА ОПЕРАЦИЙ
async function buyCar(car) {
    if (playerState.balance < car.basePrice) {
        alert("Недостаточно денег для покупки этого автомобиля!");
        return;
    }

    playerState.balance -= car.basePrice;
    
    myGarage.push({
        instanceId: Date.now(),
        id: car.id,
        name: car.name,
        year: car.year,
        purchasePrice: car.basePrice,
        repairCost: Math.floor(car.basePrice * 0.22),
        sellPrice: Math.floor(car.basePrice * car.resaleMult),
        image: car.image,
        broken: true
    });

    logEvent(`Куплен автомобиль ${car.name} за ${car.basePrice.toLocaleString()} ₸. Сдан в гараж на диагностику.`);
    alert(`${car.name} успешно куплен и отправлен в гараж!`);
    updateUI();
    await savePlayerProfile();
}

async function repairCar(instanceId) {
    const car = myGarage.find(c => c.instanceId === instanceId);
    if (!car) return;

    if (playerState.balance < car.repairCost) {
        alert("Не хватает средств на покупку запчастей для ремонта!");
        return;
    }

    playerState.balance -= car.repairCost;
    car.broken = false;
    playerState.xp += 200; // Опыт за починку

    logEvent(`Проведен полный ремонт ${car.name}. Машина готова к розничной продаже.`);
    alert(`Ремонт завершен! Машина полностью исправна. Получено +200 XP`);
    updateUI();
    await savePlayerProfile();
}

async function sellCar(instanceId) {
    const carIndex = myGarage.findIndex(c => c.instanceId === instanceId);
    if (carIndex === -1) return;

    const car = myGarage[carIndex];
    let finalPrice = car.broken ? Math.floor(car.sellPrice * 0.5) : car.sellPrice;
    
    playerState.balance += finalPrice;
    playerState.sold_count += 1;
    
    let profit = finalPrice - car.purchasePrice - (car.broken ? 0 : car.repairCost);
    if (profit > 0) playerState.profit_total += profit;

    logEvent(`Продан автомобиль ${car.name} за ${finalPrice.toLocaleString()} ₸. Чистая прибыль: ${profit.toLocaleString()} ₸.`);
    alert(`Сделка совершена! Автомобиль продан за ${finalPrice.toLocaleString()} ₸`);
    
    myGarage.splice(carIndex, 1);
    updateUI();
    await savePlayerProfile();
}

// Логирование событий в твой список событий
function logEvent(text) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const eventsList = document.getElementById('eventsList');
    const homeEventsList = document.getElementById('homeEventsList');
    
    const itemHtml = `<div style="padding:10px; border-bottom:1px solid #263447; color:#9aa7b7; font-size:14px;"><strong>[${time}]</strong> ${text}</div>`;
    
    if (eventsList) eventsList.insertAdjacentHTML('afterbegin', itemHtml);
    if (homeEventsList) homeEventsList.insertAdjacentHTML('afterbegin', itemHtml);
}

// 9. БАЗА ДАННЫХ И SUPABASE PROFILE
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
    } catch (err) { console.error(err); }
}

async function createPlayerProfile(username) {
    await window.supabaseClient.from('profiles').insert([{ 
        id: playerState.id, username: username, balance: playerState.balance,
        xp: playerState.xp, reputation: playerState.reputation,
        sold_count: playerState.sold_count, profit_total: playerState.profit_total
    }]);
}

async function savePlayerProfile() {
    if (!playerState.id) return;
    await window.supabaseClient.from('profiles').update({
        balance: playerState.balance, xp: playerState.xp, reputation: playerState.reputation,
        sold_count: playerState.sold_count, profit_total: playerState.profit_total
    }).eq('id', playerState.id);
}

// 10. МОДАЛКА АВТОРИЗАЦИИ СИНХРОННО С ТВОИМ HTML
function initAuth() {
    const overlay = document.getElementById('authOverlay');
    const form = document.getElementById('authForm');
    const toggleBtn = document.getElementById('authToggleType');
    const title = document.getElementById('authTitle');
    const desc = document.getElementById('authDesc');
    const usernameLabel = document.getElementById('usernameLabel');
    const submitBtn = document.getElementById('authSubmitBtn');
    const logoutBtn = document.getElementById('logoutButton');

    let isSignUpMode = true;

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            isSignUpMode = !isSignUpMode;
            title.innerText = isSignUpMode ? "Регистрация мастера" : "Вход в мастерскую";
            desc.innerText = isSignUpMode ? "Создайте аккаунт, чтобы попасть в облачный рейтинг механиков." : "Введи данные своей мастерской для загрузки прогресса.";
            usernameLabel.style.display = isSignUpMode ? "flex" : "none";
            document.getElementById('authUsername').required = isSignUpMode;
            submitBtn.innerText = isSignUpMode ? "Зарегистрироваться" : "Войти в игру";
            toggleBtn.innerText = isSignUpMode ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться";
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value.trim();
            const username = document.getElementById('authUsername').value.trim();

            if (isSignUpMode) {
                const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
                if (error) alert(error.message);
                else if (data.user) {
                    playerState.id = data.user.id; playerState.username = username;
                    await createPlayerProfile(username); hideAuthModal(); updateUI();
                }
            } else {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
                if (error) alert(error.message);
                else if (data.user) {
                    playerState.id = data.user.id; await loadPlayerProfile(); hideAuthModal(); updateUI();
                }
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await window.supabaseClient.auth.signOut();
            playerState.id = null;
            showAuthModal();
        });
    }
}

function showAuthModal() { const o = document.getElementById('authOverlay'); if(o) o.style.display = 'flex'; }
function hideAuthModal() { const o = document.getElementById('authOverlay'); if(o) o.style.display = 'none'; }

async function loadLeaderboard() {
    try {
        const { data: topPlayers } = await window.supabaseClient
            .from('profiles')
            .select('username, profit_total')
            .order('profit_total', { ascending: false }).limit(5);

        const rList = document.getElementById('ratingList');
        const hList = document.getElementById('homeRatingList');
        if (!topPlayers) return;

        const html = topPlayers.map((p, idx) => `
            <div style="display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid #263447; color:#fff;">
                <span>${idx + 1}. 🛠 ${p.username}</span>
                <span style="color:#10b981; font-weight:bold;">+${p.profit_total.toLocaleString()} ₸</span>
            </div>
        `).join('');

        if (rList) rList.innerHTML = html;
        if (hList) hList.innerHTML = html;
    } catch(e){}
}
