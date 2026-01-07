// js/auth.js

// Функция для обновления кнопки на "Войти"
function updateButtonToLogin(buttonElement) {
    buttonElement.innerHTML = 'Войти <img src="/img/input.png" style="height: 50px; width: 50px;">';
    buttonElement.setAttribute('data-status', 'logged-out');
    buttonElement.title = "Войти в аккаунт";
}

// Функция для обновления кнопки на "Профиль"
function updateButtonToProfile(buttonElement) {
    buttonElement.innerHTML = '<img src="/img/profile-icon.png" style="height: 60px; width: 60px;">';
    buttonElement.setAttribute('data-status', 'logged-in');
    buttonElement.title = "Перейти в профиль";
}

// Проверяем статус авторизации
function checkAuthStatus() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

// Получаем имя пользователя
function getUsername() {
    return localStorage.getItem('username') || 'Пользователь';
}

// Инициализация кнопки авторизации
function initAuthButton() {
    const userAuthButton = document.getElementById('userAuthButton');
    
    if (!userAuthButton) {
        console.log('Кнопка авторизации не найдена');
        return;
    }
    
    const isLoggedIn = checkAuthStatus();
    
    if (isLoggedIn) {
        updateButtonToProfile(userAuthButton);
    } else {
        updateButtonToLogin(userAuthButton);
    }
    
    // Добавляем обработчик клика на кнопку
    userAuthButton.addEventListener('click', function() {
        const status = userAuthButton.getAttribute('data-status');
        
        if (status === 'logged-in') {
            // Если авторизован - переход в профиль
            window.location.href = '/profile.html';
        } else {
            // Если не авторизован - переход на страницу входа
            window.location.href = '/input.html';
        }
    });
}

// Вход пользователя
function loginUser(login, password) {
    
    if (login && password) {
        // Сохраняем статус входа в localStorage
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', login);
        localStorage.setItem('loginTime', new Date().toISOString());
        
        return { success: true, username: login };
    } else {
        return { success: false, message: 'Заполните все поля' };
    }
}

// Выход пользователя
function logoutUser() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('loginTime');
    
    // Перенаправляем на главную страницу
    window.location.href = '/index.html';
}

// Проверка доступа к защищенным страницам
function requireAuth(redirectTo = '/input.html') {
    if (!checkAuthStatus()) {
        window.location.href = redirectTo;
        return false;
    }
    return true;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {

    if (document.getElementById('userAuthButton')) {
        initAuthButton();
    }
    
});