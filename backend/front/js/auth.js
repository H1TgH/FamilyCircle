window.authHeader = null;

document.addEventListener('DOMContentLoaded', function() {
    if (isAuthenticated()) {
        console.log('Пользователь авторизован');
        showLoggedInSection();
        setupLoggedInButtons();
 
        if (window.location.pathname === '/input') {
            console.log('На странице входа, показываем кнопки выхода');
        } else {
  
            console.log('Пользователь на другой странице:', window.location.pathname);
        }
    } else {
        console.log('Пользователь не авторизован');
        showLoginSection();
           
        setupLoginForm();
    }
});

function setupLoginForm() {
    const loginBtn = document.getElementById('loginBtn');
    const loginForm = document.getElementById('loginForm');
    
    if (loginBtn) {
        console.log('Кнопка входа найдена, настраиваем обработчик');
        loginBtn.addEventListener('click', handleLogin);
    } else {
        console.log('Кнопка входа не найдена');
    }
      
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            if (loginBtn) loginBtn.click();
        });
            
        const loginInput = document.getElementById('login');
        if (loginInput) loginInput.focus();
    }
}

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


function setupLoggedInButtons() {
    const accountBtn = document.getElementById('accountBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (accountBtn) {
        accountBtn.addEventListener('click', function() {
            if (isRelative()) {
                console.log('Родственник, перенаправляем на relative_profile');
                window.location.href = '/relative_profile';
            } else if (isVolunteer()) {
                console.log('Волонтер, перенаправляем на volunteer_profile');  
                window.location.href = '/volunteer_profile';
            } else {
                console.log('Неизвестная роль, перенаправляем на профиль');
                window.location.href = '/profile'; 
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            console.log('Нажата кнопка "Выйти"');
            
            if (confirm('Вы действительно хотите выйти?')) {
                logout();
            }
        });
    }
}


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
            
            
            if (window.location.pathname === '/input') {
                console.log('Перезагружаем страницу для отображения кнопок');
                window.location.reload();
            } else {
                
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
    
    
    if (window.location.pathname === '/input') {
        console.log('На странице входа, показываем форму');
        showLoginSection();
    } else {
        
        console.log('Перенаправляем на страницу входа');
        window.location.href = '/input';
    }
}


function getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}


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


function initPage() {
    const path = window.location.pathname;
    const protectedPages = ['/profile', '/requests', '/feed'];
    
    
    if (protectedPages.some(page => path.startsWith(page)) && !isAuthenticated()) {
        window.location.href = '/input';
        return false;
    }
    
    
    if (isAuthenticated() && (path === '/input' || path === '/input.html')) {
        window.location.href = '/';
        return false;
    }

    if (path.startsWith('/profile') || path.startsWith('/requests')) {
        if (!isRelative()) {
            alert('Эта страница доступна только родственникам');
            window.location.href = '/';
            return false;
        }
    }
    
    return true;
}

function setupIndexPage() {
    console.log('Настройка главной страницы');
    
    const isIndexPage = window.location.pathname === '/' || 
                        window.location.pathname === '/index' || 
                        window.location.pathname === '/index.html';
    
    if (!isIndexPage) return;
    
    if (typeof window.updateNavigation === 'function') {
        window.updateNavigation();
    }
    
    if (typeof window.updatePageContent === 'function') {
        window.updatePageContent();
    }

}

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
        if (isAuthenticated()) {
            console.log('Авторизован на другой странице');
        }
    }
});

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

document.addEventListener('DOMContentLoaded', function() {
    if (!checkProfileAuth()) {
        return;
    }
    
});