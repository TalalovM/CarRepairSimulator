// 1. НАСТРОЙКА ПОДКЛЮЧЕНИЯ К SUPABASE
const SUPABASE_URL = "https://ycmvhvsbcexxpuzdskpu.supabase.co";
const SUPABASE_KEY = "sb_publishable_ztQr6Kblgt4kb-3R3nhiPg_ctswPZb6";

if (!window.supabaseClient) {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// 2. ИГРОВОЕ СОСТОЯНИЕ
let playerState = {
    id: null,
    username: "Мастер",
    balance: 1245000,
    xp: 560,
    reputation: 75,
    sold_count: 0,
    profit_total: 0
};

// ТВОЙ ОФИЦИАЛЬНЫЙ СПИСОК МАШИН
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
  { id: "mercedes-w204", name: "Mercedes-Benz W204", year: 2011, basePrice: 1100000, resaleMult: 1.28, image: "assets/mercedes-Цw204.jpg" }, // сохранил твою опечатку в пути Цw204, чтобы картинка не ломалась
  { id: "toyota-mark-2", name: "Toyota Mark II", year: 1998, basePrice: 950000, resaleMult: 1.42, image: "assets/toyota-mark-2.jpg" },
  { id: "volkswagen-golf-5", name: "VW Golf V", year: 2007, basePrice: 950000, resaleMult: 1.34, image: "assets/volkswagen-golf-5.jpg" }
];

let myGarage = []; 

// 3. СТАРТ ПРИЛОЖЕНИЯ
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
        showAuthModal();
    }
    
    updateUI();
    setupGameEventListeners();
});

// 4. БАЗА ДАННЫХ
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
        console.error("Ошибка загрузки:", err);
    }
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

// 5. ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
function updateUI() {
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
    
    renderMarket(); 
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

// 6. ОТРИСОВКА РЫНКА И ГАРАЖА (ВКЛЮЧАЯ КАРТИНКИ)
function renderMarket() {
    const marketContainer = document.getElementById('market-list') || document.querySelector('.market-container');
    if (!marketContainer) return;
    
    marketContainer.innerHTML = carTemplates.map(car => {
        // Динамический расчет ремонта (25% от цены покупки)
        const estRepair = Math.floor(car.basePrice * 0.25);
        return `
            <div style="background:#1e293b; padding:15px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; color:#fff; font-family:sans-serif;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <img src="${car.image}" alt="${car.name}" style="width:70px; height:45px; object-fit:cover; border-radius:4px; background:#0f172a;" onerror="this.style.display='none'">
                    <div>
                        <strong style="font-size:16px; color:#3b82f6;">${car.name} (${car.year} г.)</strong><br>
                        <span style="color:#94a3b8; font-size:13px;">Цена: ${car.basePrice.toLocaleString()} ₸ | Расход на ремонт: ~${estRepair.toLocaleString()} ₸</span>
                    </div>
                </div>
                <button class="buy-car-btn" data-id="${car.id}" style="background:#3b82f6; border:none; padding:8px 15px; border-radius:5px; color:#fff; cursor:pointer; font-weight:bold;">Купить</button>
            </div>
        `;
    }).join('');
}

function renderGarage() {
    const garageContainer = document.getElementById('garage-list') || document.querySelector('.garage-container');
    if (!garageContainer) return;
    
    if (myGarage.length === 0) {
        garageContainer.innerHTML = '<p style="color:#64748b; text-align:center; padding:20px; font-family:sans-serif;">В гараже пусто. Закупитесь тачками на авторынке!</p>';
        return;
    }
    garageContainer.innerHTML = myGarage.map(car => `
        <div style="background:#1e293b; padding:15px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; color:#fff; font-family:sans-serif;">
            <div style="display:flex; align-items:center; gap:15px;">
                <img src="${car.image}" alt="${car.name}" style="width:70px; height:45px; object-fit:cover; border-radius:4px; background:#0f172a;" onerror="this.style.display='none'">
                <div>
                    <strong>${car.name}</strong> 
                    <span style="color:${car.broken ? '#ef4444' : '#10b981'}; font-size:12px; margin-left:10px;">
                        [${car.broken ? 'Хлам (Нужен ремонт)' : 'Восстановлена'} ]
                    </span><br>
                    <span style="color:#94a3b8; font-size:13px;">Цена перепродажи: ${(car.broken ? Math.floor(car.sellPrice*0.4) : car.sellPrice).toLocaleString()} ₸</span>
                </div>
            </div>
            <div>
                ${car.broken ? `<button class="repair-car-btn" data-instance-id="${car.instanceId}" style="background:#eab308; border:none; padding:6px 12px; border-radius:5px; cursor:pointer; margin-right:5px; font-weight:bold; color:#000;">Починить (${car.repairCost.toLocaleString()} ₸)</button>` : ''}
                <button class="sell-car-btn" data-instance-id="${car.instanceId}" style="background:#10b981; border:none; padding:6px 12px; border-radius:5px; color:#fff; cursor:pointer;">Продать</button>
            </div>
        </div>
    `).join('');
}

// 7. ИГРОВЫЕ ДЕЙСТВИЯ (ОБРАБОТКА СТРОКОВЫХ ID)
function setupGameEventListeners() {
    document.body.onclick = null; // убираем старые дубли событий
    
    document.body.addEventListener('click', async (e) => {
        // ПОКУПКА С РЫНКА
        if (e.target.classList.contains('buy-car-btn')) {
            const carId = e.target.getAttribute('data-id'); // считываем как строку (например "audi-a4")
            const car = carTemplates.find(c => c.id === carId);

            if (car && playerState.balance >= car.basePrice) {
                playerState.balance -= car.basePrice;
                
                // Рассчитываем экономику конкретного экземпляра при покупке
                const repairCost = Math.floor(car.basePrice * 0.25); // 25% на ремонт
                const sellPrice = Math.floor(car.basePrice * car.resaleMult); // Цена готовой тачки с учетом множителя

                myGarage.push({
                    instanceId: Date.now(),
                    id: car.id,
                    name: `${car.name} (${car.year})`,
                    price: car.basePrice,
                    repairCost: repairCost,
                    sellPrice: sellPrice,
                    image: car.image,
                    broken: true
                });
                
                alert(`Вы купили ${car.name}! Машина отбуксирована в гараж.`);
                updateUI();
                await savePlayerProfile();
            } else if (car) {
                alert("Не хватает бюджета на покупку этого авто!");
            }
        }

        // РЕМОНТ В ГАРАЖЕ
        if (e.target.classList.contains('repair-car-btn')) {
            const instanceId = parseInt(e.target.getAttribute('data-instance-id'));
            const car = myGarage.find(c => c.instanceId === instanceId);
            if (car && car.broken) {
                if (playerState.balance >= car.repairCost) {
                    playerState.balance -= car.repairCost;
                    car.broken = false;
                    playerState.xp += 1
