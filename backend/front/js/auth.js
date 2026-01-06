// ================= ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =================
window.authHeader = null;

// ================= ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ =================
document.addEventListener('DOMContentLoaded', function() {
    console.log('auth.js загружен');
    
    // Проверка авторизации
    if (isAuthenticated()) {
        console.log('Пользователь авторизован');
        showLoggedInSection();
        setupLoggedInButtons();
        
        // Если на странице входа - показываем блок с кнопками
        if (window.location.pathname === '/input') {
            console.log('На странице входа, показываем кнопки выхода');
        } else {
            // Если на другой странице и пользователь авторизован, остаемся там
            console.log('Пользователь на другой странице:', window.location.pathname);
        }
    } else {
        console.log('Пользователь не авторизован');
        showLoginSection();
        
        // Настройка формы входа только если не авторизован
        setupLoginForm();
    }
});

// ================= ОБРАБОТЧИК ФОРМЫ ВХОДА =================
function setupLoginForm() {
    const loginBtn = document.getElementById('loginBtn');
    const loginForm = document.getElementById('loginForm');
    
    if (loginBtn) {
        console.log('Кнопка входа найдена, настраиваем обработчик');
        loginBtn.addEventListener('click', handleLogin);
    } else {
        console.log('Кнопка входа не найдена');
    }
    
    // Обработка отправки формы по Enter
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            if (loginBtn) loginBtn.click();
        });
        
        // Фокус на поле логина при загрузке
        const loginInput = document.getElementById('login');
        if (loginInput) loginInput.focus();
    }
}

// ================= ОТОБРАЖЕНИЕ РАЗНЫХ СЕКЦИЙ =================
function showLoggedInSection() {
    const loginSection = document.getElementById('loginSection');
    const loggedInSection = document.getElementById('loggedInSection');
    
    console.log('Показываем секцию для авторизованных');
    console.log('loginSection:', loginSection);
    console.log('loggedInSection:', loggedInSection);
    
    if (loginSection && loggedInSection) {
        loginSection.style.display = 'none';
        loggedInSection.style.display = 'block';
        console.log('Секции переключены успешно');
    } else {
        console.error('Одна из секций не найдена');
    }
}

function showLoginSection() {
    const loginSection = document.getElementById('loginSection');
    const loggedInSection = document.getElementById('loggedInSection');
    
    if (loginSection && loggedInSection) {
        loginSection.style.display = 'block';
        loggedInSection.style.display = 'none';
    }
}

// ================= НАСТРОЙКА КНОПОК ДЛЯ АВТОРИЗОВАННЫХ =================
function setupLoggedInButtons() {
    const accountBtn = document.getElementById('accountBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    console.log('Настройка кнопок для авторизованных');
    console.log('accountBtn:', accountBtn);
    console.log('logoutBtn:', logoutBtn);
    
    if (accountBtn) {
        accountBtn.addEventListener('click', function() {
            console.log('Нажата кнопка "Мой аккаунт"');
            // Проверяем роль пользователя и перенаправляем на соответствующую страницу
            if (isRelative()) {
                console.log('Родственник, перенаправляем на relative_profile');
                window.location.href = '/relative_profile';
            } else if (isVolunteer()) {
                console.log('Волонтер, перенаправляем на volunteer_profile');
                // Если есть страница для волонтеров
                window.location.href = '/volunteer_profile';
            } else {
                console.log('Неизвестная роль, перенаправляем на профиль');
                window.location.href = '/profile'; // Общая страница профиля
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            console.log('Нажата кнопка "Выйти"');
            // Показываем подтверждение
            if (confirm('Вы действительно хотите выйти?')) {
                logout();
            }
        });
    }
}

// ================= ОБНОВЛЕННАЯ ФУНКЦИЯ ВХОДА =================
async function handleLogin() {
    console.log('Обработка входа...');
    
    const loginInput = document.getElementById('login');
    const passwordInput = document.getElementById('password');
    
    if (!loginInput || !passwordInput) {
        console.error('Не найдены элементы формы');
        showError('Ошибка загрузки формы');
        return;
    }
    
    const formData = {
        login_or_email: loginInput.value.trim(),
        password: passwordInput.value
    };
    
    console.log('Данные для входа:', formData);
    
    if (!formData.login_or_email || !formData.password) {
        showError('Пожалуйста, заполните все поля');
        return;
    }
    
    // Блокируем кнопку во время запроса
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Вход...';
    loginBtn.disabled = true;
    
    try {
        console.log('Отправка запроса на /api/v1/users/login');
        const response = await fetch('/api/v1/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        console.log('Статус ответа:', response.status);
        const data = await response.json();
        console.log('Данные ответа:', data);
        
        if (response.ok) {
            console.log('Вход успешен');
            
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            
            // После успешного входа перезагружаем страницу, чтобы показать кнопки
            if (window.location.pathname === '/input') {
                console.log('Перезагружаем страницу для отображения кнопок');
                window.location.reload();
            } else {
                // Перенаправление на главную или профиль
                if (isRelative()) {
                    window.location.href = '/relative_profile';
                } else {
                    window.location.href = '/';
                }
            }
            
        } else {
            showError(data.detail || 'Ошибка при входе');
            passwordInput.focus();
            passwordInput.select();
        }
    } catch (error) {
        console.error('Ошибка сети:', error);
        showError('Ошибка соединения с сервером');
    } finally {
        if (loginBtn) {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
        }
    }
}

// ================= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =================
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

function setAuthHeader(token) {
    window.authHeader = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// ================= API ФУНКЦИИ =================
async function fetchWithAuth(url, options = {}) {
    const accessToken = localStorage.getItem('access_token');
    
    if (!options.headers) {
        options.headers = {};
    }
    
    if (accessToken) {
        options.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    if (!options.headers['Content-Type'] && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }
    
    let response = await fetch(url, options);
    
    if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            const newAccessToken = localStorage.getItem('access_token');
            options.headers['Authorization'] = `Bearer ${newAccessToken}`;
            response = await fetch(url, options);
        } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/input';
            throw new Error('Требуется повторная авторизация');
        }
    }
    
    return response;
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;
    
    try {
        const response = await fetch('/api/v1/users/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Ошибка обновления токена:', error);
        return false;
    }
}

function isAuthenticated() {
    const token = localStorage.getItem('access_token');
    console.log('Проверка авторизации, токен:', token ? 'есть' : 'нет');
    return !!token;
}

// ================= ОБНОВЛЕННАЯ ФУНКЦИЯ ВЫХОДА =================
function logout() {
    console.log('Выход из системы');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
        fetch('/api/v1/users/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        })
        .then(response => {
            console.log('Выход выполнен на сервере');
        })
        .catch(error => {
            console.error('Ошибка при выходе:', error);
        })
        .finally(() => {
            // Всегда очищаем локальное хранилище и перенаправляем
            clearAuthData();
        });
    } else {
        clearAuthData();
    }
}

function clearAuthData() {
    console.log('Очистка данных авторизации');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Если мы на странице входа, показываем форму входа
    if (window.location.pathname === '/input') {
        console.log('На странице входа, показываем форму');
        showLoginSection();
    } else {
        // Иначе перенаправляем на страницу входа
        console.log('Перенаправляем на страницу входа');
        window.location.href = '/input';
    }
}

// ================= ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ =================
function getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Проверка роли пользователя
function isRelative() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return false;
    
    try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        console.log('Роль пользователя из токена:', payload.role);
        return payload.role === 'relative';
    } catch (e) {
        console.error('Ошибка при разборе токена:', e);
        return false;
    }
}

function isVolunteer() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return false;
    
    try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        return payload.role === 'volunteer';
    } catch (e) {
        return false;
    }
}

function getUserId() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return null;
    
    try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        return payload.sub;
    } catch (e) {
        return null;
    }
}

// ================= ФУНКЦИЯ ПОЛУЧЕНИЯ ИМЕНИ ПОЛЬЗОВАТЕЛЯ =================
async function getUserInfo() {
    try {
        const response = await fetchWithAuth('/api/v1/users/me');
        if (response.ok) {
            const userData = await response.json();
            return userData;
        }
        return null;
    } catch (error) {
        console.error('Ошибка получения информации о пользователе:', error);
        return null;
    }
}

// ================= УЛУЧШЕННАЯ ПРОВЕРКА РОЛИ =================
function getUserRole() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return null;
    
    try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        return payload.role;
    } catch (e) {
        return null;
    }
}

// Инициализация страницы с проверкой авторизации
function initPage() {
    const path = window.location.pathname;
    const protectedPages = ['/relative_profile', '/zaivka', '/relative_scroll'];
    
    // Если страница защищенная и пользователь не авторизован
    if (protectedPages.some(page => path.startsWith(page)) && !isAuthenticated()) {
        window.location.href = '/input';
        return false;
    }
    
    // Если пользователь авторизован и пытается зайти на страницу входа
    if (isAuthenticated() && (path === '/input' || path === '/input.html')) {
        window.location.href = '/';
        return false;
    }
    
    // Проверка роли для определенных страниц
    if (path.startsWith('/relative_profile') || path.startsWith('/zaivka')) {
        if (!isRelative()) {
            alert('Эта страница доступна только родственникам');
            window.location.href = '/';
            return false;
        }
    }
    
    return true;
}

// Добавьте эти функции в auth.js

// ================= ФУНКЦИИ ДЛЯ ГЛАВНОЙ СТРАНИЦЫ =================

function setupIndexPage() {
    console.log('Настройка главной страницы');
    
    // Проверяем, главная ли это страница
    const isIndexPage = window.location.pathname === '/' || 
                        window.location.pathname === '/index' || 
                        window.location.pathname === '/index.html';
    
    if (!isIndexPage) return;
    
    // Вызываем функции из скрипта на странице
    if (typeof window.updateNavigation === 'function') {
        window.updateNavigation();
    }
    
    if (typeof window.updatePageContent === 'function') {
        window.updatePageContent();
    }
    
    // Логи для отладки
    console.log('Токен в localStorage:', localStorage.getItem('access_token'));
    console.log('Авторизован:', isAuthenticated());
    console.log('Роль:', getUserRole());
}

// ================= ОБНОВЛЕННАЯ ИНИЦИАЛИЗАЦИЯ =================
document.addEventListener('DOMContentLoaded', function() {
    console.log('auth.js загружен, текущая страница:', window.location.pathname);
    
    const isIndexPage = window.location.pathname === '/' || 
                        window.location.pathname === '/index';
    
    const isInputPage = window.location.pathname === '/input';
    
    if (isIndexPage) {
        console.log('Главная страница');
        setupIndexPage();
    } 
    else if (isInputPage) {
        console.log('Страница входа');
        if (isAuthenticated()) {
            console.log('Уже авторизован, показываем кнопки выхода');
            showLoggedInSection();
            setupLoggedInButtons();
        } else {
            console.log('Не авторизован, показываем форму входа');
            showLoginSection();
            setupLoginForm();
        }
    }
    else {
        console.log('Другая страница');
        // Для других страниц просто проверяем авторизацию
        if (isAuthenticated()) {
            console.log('Авторизован на другой странице');
        }
    }
});

// ================= ОБНОВЛЕННАЯ ФУНКЦИЯ ВХОДА =================
async function handleLogin() {
    console.log('Обработка входа...');
    
    const loginInput = document.getElementById('login');
    const passwordInput = document.getElementById('password');
    
    if (!loginInput || !passwordInput) {
        console.error('Не найдены элементы формы');
        showError('Ошибка загрузки формы');
        return;
    }
    
    const formData = {
        login_or_email: loginInput.value.trim(),
        password: passwordInput.value
    };
    
    console.log('Данные для входа:', formData);
    
    if (!formData.login_or_email || !formData.password) {
        showError('Пожалуйста, заполните все поля');
        return;
    }
    
    // Блокируем кнопку во время запроса
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Вход...';
    loginBtn.disabled = true;
    
    try {
        console.log('Отправка запроса на /api/v1/users/login');
        const response = await fetch('/api/v1/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        console.log('Статус ответа:', response.status);
        const data = await response.json();
        console.log('Данные ответа:', data);
        
        if (response.ok) {
            console.log('Вход успешен');
            
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            
            // После успешного входа перенаправляем на главную
            console.log('Перенаправление на главную страницу');
            window.location.href = '/';
            
        } else {
            showError(data.detail || 'Ошибка при входе');
            passwordInput.focus();
            passwordInput.select();
        }
    } catch (error) {
        console.error('Ошибка сети:', error);
        showError('Ошибка соединения с сервером');
    } finally {
        if (loginBtn) {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
        }
    }
}

// Добавьте эту функцию для получения информации о пользователе
async function getUserInfo() {
    try {
        const response = await fetchWithAuth('/api/v1/users/me');
        if (response.ok) {
            const userData = await response.json();
            console.log('Информация о пользователе получена:', userData);
            return userData;
        }
        return null;
    } catch (error) {
        console.error('Ошибка получения информации о пользователе:', error);
        return null;
    }
}

// Добавьте в auth.js функцию для проверки авторизации на странице профиля

// ================= ФУНКЦИЯ ДЛЯ ПРОВЕРКИ ПРОФИЛЯ =================
function checkProfileAuth() {
    const path = window.location.pathname;
    
    if (path.includes('profile') && !isAuthenticated()) {
        console.log('Не авторизован, перенаправляем на вход');
        window.location.href = '/input';
        return false;
    }
    
    if (path.includes('relative_profile') && !isRelative()) {
        alert('Эта страница доступна только родственникам');
        window.location.href = '/';
        return false;
    }
    
    return true;
}

// Обновите DOMContentLoaded:
document.addEventListener('DOMContentLoaded', function() {
    console.log('auth.js загружен, текущая страница:', window.location.pathname);
    
    // Проверяем авторизацию для страниц профиля
    if (!checkProfileAuth()) {
        return;
    }
    
    // Остальной код...
});