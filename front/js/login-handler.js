// js/login-handler.js

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('.registration-form');
    const accessibilityToggle = document.getElementById('accessibilityToggle');
    
    // Инициализация переключателя доступности
    if (accessibilityToggle) {
        // Загружаем скрипт для переключателя, если он есть
        if (typeof window.initAccessibility === 'function') {
            window.initAccessibility();
        }
    }
    
    // Обработчик формы входа
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Предотвращаем отправку формы
            
            // Получаем данные из формы
            const login = document.getElementById('login').value.trim();
            const password = document.getElementById('password').value;
            
            // Проверяем данные
            if (!login || !password) {
                showMessage('Пожалуйста, заполните все поля', 'error');
                return;
            }
            
            // Пытаемся войти
            const result = loginUser(login, password);
            
            if (result.success) {
                showMessage('Вход выполнен успешно!', 'success');
                
                // Небольшая задержка перед перенаправлением
                setTimeout(function() {
                    window.location.href = '/index.html';
                }, 1000);
            } else {
                showMessage(result.message || 'Ошибка входа', 'error');
            }
        });
    }
    
    // Функция для отображения сообщений
    function showMessage(text, type) {
        // Удаляем старые сообщения
        const oldMessage = document.querySelector('.login-message');
        if (oldMessage) {
            oldMessage.remove();
        }
        
        // Создаем новое сообщение
        const messageDiv = document.createElement('div');
        messageDiv.className = `login-message ${type}`;
        messageDiv.textContent = text;
        messageDiv.style.cssText = `
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            text-align: center;
            font-weight: bold;
            ${type === 'error' ? 'background-color: #ffebee; color: #c62828;' : 'background-color: #e8f5e9; color: #2e7d32;'}
        `;
        
        // Вставляем сообщение перед формой
        if (loginForm) {
            loginForm.insertBefore(messageDiv, loginForm.firstChild);
        }
        
        // Автоматически скрываем через 5 секунд
        setTimeout(function() {
            if (messageDiv.parentNode) {
                messageDiv.style.opacity = '0';
                messageDiv.style.transition = 'opacity 0.5s';
                setTimeout(() => messageDiv.remove(), 500);
            }
        }, 5000);
    }
});