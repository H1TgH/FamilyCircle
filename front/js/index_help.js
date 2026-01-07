// Функция переключения между обычной и доступной версией
function toggleAccessibilityVersion() {
    const mainStylesheet = document.getElementById('main-stylesheet');
    const accessibleStylesheet = document.getElementById('accessible-stylesheet');
    const toggleButton = document.getElementById('accessibilityToggle');
    
    if (accessibleStylesheet.disabled) {
        // Включаем версию для слабовидящих
        accessibleStylesheet.disabled = false;
        mainStylesheet.disabled = true;
        toggleButton.textContent = 'Обычная версия';
        toggleButton.classList.add('accessible-active');
        
        // Сохраняем выбор в localStorage
        localStorage.setItem('accessibleVersion', 'enabled');
    } else {
        // Включаем обычную версию
        accessibleStylesheet.disabled = true;
        mainStylesheet.disabled = false;
        toggleButton.textContent = 'Версия для слабовидящих';
        toggleButton.classList.remove('accessible-active');
        
        // Удаляем настройку из localStorage
        localStorage.removeItem('accessibleVersion');
    }
}

// Проверяем сохраненную настройку при загрузке страницы
function initAccessibility() {
    const accessibleVersion = localStorage.getItem('accessibleVersion');
    const mainStylesheet = document.getElementById('main-stylesheet');
    const accessibleStylesheet = document.getElementById('accessible-stylesheet');
    const toggleButton = document.getElementById('accessibilityToggle');
    
    if (accessibleVersion === 'enabled') {
        accessibleStylesheet.disabled = false;
        mainStylesheet.disabled = true;
        toggleButton.textContent = 'Обычная версия';
        toggleButton.classList.add('accessible-active');
    }
    
    // Добавляем обработчик события для кнопки
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleAccessibilityVersion);
    }
}

// Инициализируем при загрузке страницы
document.addEventListener('DOMContentLoaded', initAccessibility);