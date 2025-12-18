document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', async function() {
            const formData = {
                login_or_email: document.getElementById('login').value.trim(),
                password: document.getElementById('password').value
            };
            
            if (!formData.login_or_email || !formData.password) {
                showError('Пожалуйста, заполните все поля');
                return;
            }
            
            try {
                const response = await fetch('/api/v1/users/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    console.log('Вход успешен:', data);
                    
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    
                    setAuthHeader(data.access_token);
                    
                    // Запускаем таймер обновления токена
                    startTokenRefreshTimer();
                    
                    window.location.href = '/';
                    
                } else {
                    showError(data.detail || 'Ошибка при входе');
                }
            } catch (error) {
                console.error('Ошибка сети:', error);
                showError('Ошибка соединения с сервером');
            }
        });
    }
    
    // Запускаем таймер если пользователь уже авторизован
    if (isAuthenticated()) {
        console.log('Пользователь авторизован, запускаем таймер обновления токена');
        startTokenRefreshTimer();
    }
});

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
    
    console.log('Отправка запроса:', url, options.method || 'GET');
    
    let response = await fetch(url, options);
    
    if (response.status === 401) {
        console.log('Получен 401, пробуем обновить токен...');
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            const newAccessToken = localStorage.getItem('access_token');
            options.headers['Authorization'] = `Bearer ${newAccessToken}`;
            response = await fetch(url, options);
        } else {
            console.log('Не удалось обновить токен, выход...');
            handleLogout();
            throw new Error('Требуется повторная авторизация');
        }
    }
    
    return response;
}

function shouldRefreshToken() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return false;
    
    try {
        // Декодируем токен (без проверки подписи)
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const expiresAt = payload.exp * 1000;
        
        // Обновляем если осталось меньше 5 минут
        const timeLeft = expiresAt - Date.now();
        return timeLeft < 5 * 60 * 1000;
    } catch (e) {
        console.error('Ошибка парсинга токена:', e);
        return false;
    }
}

let refreshTimer = null;

function startTokenRefreshTimer() {
    // Очищаем старый таймер если есть
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    // Проверяем каждую минуту
    refreshTimer = setInterval(async () => {
        if (shouldRefreshToken()) {
            console.log('Автоматическое обновление токена...');
            const refreshed = await refreshAccessToken();
            if (!refreshed) {
                console.log('Автоматическое обновление не удалось');
                handleLogout();
            }
        }
    }, 60 * 1000);
}

function handleLogout() {
    logout();
    if (window.location.pathname !== '/input') {
        alert('Сессия истекла. Пожалуйста, войдите снова.');
        window.location.href = '/input';
    }
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        console.log('Нет refresh токена');
        return false;
    }
    
    try {
        console.log('Обновление токена...');
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
            console.log('Токен успешно обновлен');
            return true;
        } else {
            const error = await response.text();
            console.error('Ошибка обновления токена:', response.status, error);
            return false;
        }
    } catch (error) {
        console.error('Сетевая ошибка при обновлении токена:', error);
        return false;
    }
}

function getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function isAuthenticated() {
    return !!localStorage.getItem('access_token');
}

function logout() {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
        fetch('/api/v1/users/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        }).catch(console.error);
    }
    
    // Очищаем таймер
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}