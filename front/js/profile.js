// js/profile.js

document.addEventListener('DOMContentLoaded', function() {
    // Проверяем авторизацию
    if (!requireAuth()) {
        return;
    }
    
    // Отображаем информацию о пользователе
    displayUserInfo();
    
    // Настраиваем кнопку выхода
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите выйти?')) {
                logoutUser();
            }
        });
    }
    
    // Дополнительные элементы на странице профиля
    initProfilePage();
});

function displayUserInfo() {
    const username = getUsername();
    
    // Отображаем имя пользователя
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
        usernameElement.textContent = username;
    }
    
    // Показываем дату входа
    const loginTime = localStorage.getItem('loginTime');
    const loginTimeElement = document.getElementById('loginTime');
    if (loginTimeElement && loginTime) {
        const date = new Date(loginTime);
        loginTimeElement.textContent = date.toLocaleString('ru-RU');
    }
}

function initProfilePage() {
    // Здесь можно добавить дополнительную логику для страницы профиля
    console.log('Страница профиля загружена');
    
    // Пример: загрузка данных профиля
    // loadProfileData();
}