// static/js/modal.js
console.log('Скрипт modal.js загружен!');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализируем форму добавления родственника...');
    
    // Элементы управления
    const showFormBtn = document.getElementById('showFormBtn');
    const formContainer = document.getElementById('relativeFormContainer');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const relativeForm = document.getElementById('relativeForm');
    const relativesList = document.getElementById('relativesList');

    // Проверяем, что все элементы найдены
    if (!showFormBtn || !formContainer || !cancelFormBtn || !relativeForm) {
        console.error('Не найдены необходимые элементы!');
        return;
    }

    console.log('Все элементы найдены:', {
        showFormBtn,
        formContainer,
        cancelFormBtn,
        relativeForm,
        relativesList
    });

    // ===== ОСНОВНЫЕ ФУНКЦИИ =====

    // Показать форму
    function showForm() {
        console.log('Показываем форму добавления родственника');
        formContainer.style.display = 'block';
        showFormBtn.style.display = 'none';
        
        // Фокусируемся на первом поле
        document.getElementById('fullName').focus();
    }

    // Скрыть форму
    function hideForm() {
        console.log('Скрываем форму');
        formContainer.style.display = 'none';
        showFormBtn.style.display = 'block';
        relativeForm.reset();
    }

    // Добавить родственника в список на странице
    function addRelativeToList(relativeData) {
        console.log('Добавляем родственника в список:', relativeData);
        
        if (!relativesList) {
            console.warn('Элемент relativesList не найден');
            return;
        }

        const relativeCard = document.createElement('div');
        relativeCard.className = 'relative-card';
        relativeCard.innerHTML = `
            <h4>${escapeHtml(relativeData.fullName)}</h4>
            <p><strong>Год рождения:</strong> ${escapeHtml(relativeData.birthYear)}</p>
            <p><strong>Состояние здоровья:</strong> ${escapeHtml(relativeData.healthStatus)}</p>
            <p><strong>Физические ограничения:</strong> ${escapeHtml(relativeData.physicalLimitations || 'не указаны')}</p>
            <p><strong>Заболевания:</strong> ${escapeHtml(relativeData.diseases)}</p>
            <p><strong>Адрес:</strong> ${escapeHtml(relativeData.address)}</p>
            <p><strong>Особенности:</strong> ${escapeHtml(relativeData.features)}</p>
            <p><strong>Увлечения:</strong> ${escapeHtml(relativeData.hobbies)}</p>
            ${relativeData.comment ? `<p><strong>Комментарий:</strong> ${escapeHtml(relativeData.comment)}</p>` : ''}
            <div class="relative-actions">
                <button class="edit-btn" data-id="${Date.now()}">✏️ Редактировать</button>
                <button class="delete-btn" data-id="${Date.now()}">🗑️ Удалить</button>
            </div>
        `;
        
        // Добавляем карточку в начало списка
        relativesList.insertBefore(relativeCard, relativesList.firstChild);
        
        // Добавляем обработчики для кнопок
        addCardEventListeners(relativeCard);
    }

    // Добавить обработчики для карточки
    function addCardEventListeners(card) {
        const editBtn = card.querySelector('.edit-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', function() {
                const relativeId = this.getAttribute('data-id');
                console.log('Редактировать родственника ID:', relativeId);
                // Здесь можно добавить логику редактирования
                alert('Функция редактирования в разработке');
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                const relativeId = this.getAttribute('data-id');
                if (confirm('Вы уверены, что хотите удалить этого родственника?')) {
                    card.remove();
                    console.log('Родственник удален ID:', relativeId);
                }
            });
        }
    }

    // Экранирование HTML для безопасности
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Валидация формы
    function validateForm(formData) {
        const errors = [];
        
        if (!formData.fullName.trim()) {
            errors.push('ФИО обязательно для заполнения');
        }
        
        if (!formData.birthYear.trim()) {
            errors.push('Год рождения обязателен для заполнения');
        }
        
        if (!formData.healthStatus.trim()) {
            errors.push('Состояние здоровья обязательно для заполнения');
        }
        
        if (!formData.diseases.trim()) {
            errors.push('Заболевания обязательны для заполнения');
        }
        
        if (!formData.address.trim()) {
            errors.push('Адрес проживания обязателен для заполнения');
        }
        
        if (!formData.features.trim()) {
            errors.push('Особенности обязательны для заполнения');
        }
        
        if (!formData.hobbies.trim()) {
            errors.push('Увлечения обязательны для заполнения');
        }
        
        return errors;
    }

    // Показать уведомление
    function showNotification(message, type = 'success') {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notification);
        
        // Автоматически скрываем через 3 секунды
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====

    // Показать форму при клике на кнопку
    showFormBtn.addEventListener('click', showForm);

    // Скрыть форму при отмене
    cancelFormBtn.addEventListener('click', hideForm);

    // Обработка отправки формы
    relativeForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log('Отправка формы...');
        
        // Собираем данные формы
        const formData = {
            fullName: document.getElementById('fullName').value,
            birthYear: document.getElementById('birthYear').value,
            healthStatus: document.getElementById('healthStatus').value,
            physicalLimitations: document.getElementById('physicalLimitations').value,
            diseases: document.getElementById('diseases').value,
            address: document.getElementById('address').value,
            features: document.getElementById('features').value,
            hobbies: document.getElementById('hobbies').value,
            comment: document.getElementById('comment').value
        };
        
        console.log('Данные формы:', formData);
        
        // Валидация
        const errors = validateForm(formData);
        if (errors.length > 0) {
            alert('Пожалуйста, заполните все обязательные поля:\n' + errors.join('\n'));
            return;
        }
        
        // Показываем индикатор загрузки
        const saveBtn = relativeForm.querySelector('.save-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Сохранение...';
        saveBtn.disabled = true;
        
        try {
            // Отправляем данные на сервер
            const response = await fetch('/api/relatives/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Успешный ответ от сервера:', result);
                
                // Показываем уведомление
                showNotification('Родственник успешно добавлен!', 'success');
                
                // Добавляем в список на странице
                addRelativeToList(formData);
                
                // Скрываем форму
                hideForm();
                
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
        } catch (error) {
            console.error('Ошибка при добавлении родственника:', error);
            showNotification('Ошибка при добавлении родственника: ' + error.message, 'error');
        } finally {
            // Восстанавливаем кнопку
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    });

    // Закрытие формы по ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && formContainer.style.display === 'block') {
            hideForm();
        }
    });

    // Загрузка существующих родственников при загрузке страницы
    async function loadExistingRelatives() {
        try {
            console.log('Загружаем существующих родственников...');
            const response = await fetch('/api/relatives/');
            
            if (response.ok) {
                const relatives = await response.json();
                console.log('Загружены родственники:', relatives);
                
                // Добавляем каждого родственника в список
                relatives.forEach(relative => addRelativeToList(relative));
            }
        } catch (error) {
            console.warn('Не удалось загрузить список родственников:', error);
        }
    }

    // Инициализация
    console.log('Инициализация завершена');
    
    // Загружаем существующих родственников (раскомментируйте если нужно)
    // loadExistingRelatives();
});



document.addEventListener("click", function (e) {
    // Проверяем, был ли клик по кнопке с тремя точками
    const menuBtn = e.target.closest(".post-menu-btn");
    
    // Все меню на странице
    const allMenus = document.querySelectorAll(".post-menu");

    // Если кликнули НЕ на кнопку меню -> закрываем все открытые меню
    if (!menuBtn) {
        allMenus.forEach(menu => menu.style.display = "none");
        return;
    }

    // Если кликнули НА кнопку меню:
    // 1. Находим меню, относящееся к этой кнопке
    const currentMenu = menuBtn.parentElement.querySelector(".post-menu");
    
    // 2. Запоминаем его текущее состояние (открыто или нет)
    const isOpened = currentMenu.style.display === "block";

    // 3. Закрываем вообще все меню (на случай, если открыто другое)
    allMenus.forEach(menu => menu.style.display = "none");

    // 4. Если наше меню было закрыто — открываем его. 
    // Если было открыто — оно останется закрытым (благодаря шагу 3).
    if (!isOpened) {
        currentMenu.style.display = "block";
    }
});




const modal = document.getElementById("createPostModal");
const openBtn = document.querySelector(".create-post-btn");
const closeBtn = document.getElementById("closeModal");
const modalContent = document.querySelector("#createPostModal .modal-content");

// Открыть модалку
if (openBtn) {
    openBtn.addEventListener("click", () => {
        modal.style.display = "flex";
    });
}

// Закрыть по крестику
closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

// Закрыть по клику вне окна
modal.addEventListener("click", (event) => {
    if (!modalContent.contains(event.target)) {
        modal.style.display = "none";
    }
});