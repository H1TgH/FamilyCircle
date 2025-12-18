let cards = [];
let cardIdCounter = 0;

// Показать форму при клике на "Создать"
document.getElementById('createBtn').onclick = function() {
    showForm();
};

// Обработка кнопки "Отмена"
document.getElementById('cancelBtn').onclick = function() {
    hideForm();
    clearForm();
};

// Обработка кнопки "Опубликовать"
document.getElementById('publishBtn').onclick = function() {
    saveCard();
};

// Добавить задачу
document.getElementById('addTaskBtn').onclick = function() {
    addTaskInput();
};

// Показать форму
function showForm() {
    document.getElementById('formPage').style.display = 'block';
    document.querySelector('.main').style.display = 'none';
    
    // Добавляем первую задачу по умолчанию
    const tasksContainer = document.getElementById('tasksContainer');
    if (tasksContainer.children.length === 0) {
        addTaskInput();
    }
}

// Скрыть форму
function hideForm() {
    document.getElementById('formPage').style.display = 'none';
    document.querySelector('.main').style.display = 'flex';
}

// Очистить форму
function clearForm() {
    document.getElementById('specialty').value = '';
    document.getElementById('comment').value = '';
    document.getElementById('editCardId').value = '';
    
    // Очищаем задачи
    const tasksContainer = document.getElementById('tasksContainer');
    tasksContainer.innerHTML = '';
}

// Добавить поле для задачи
function addTaskInput(taskData = null) {
    const tasksContainer = document.getElementById('tasksContainer');
    const taskId = 'task_' + Date.now() + Math.random().toString(36).substr(2, 9);
    
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.id = taskId;
    
    taskItem.innerHTML = `
        <div class="task-header">
            <h4>Задача</h4>
            <button type="button" class="remove-task-btn" onclick="removeTask('${taskId}')">×</button>
        </div>
        <div class="task-content">
            <div class="form-group">
                <label>Описание задачи:</label>
                <input type="text" class="task-input" placeholder="Введите описание задачи" 
                    value="${taskData ? taskData.description : ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Дата выполнения (необязательно):</label>
                    <input type="date" class="task-date" 
                        value="${taskData ? taskData.date : ''}">
                </div>
                <div class="form-group">
                    <label>Время начала (необязательно):</label>
                    <input type="time" class="task-start-time" 
                        value="${taskData ? taskData.startTime : ''}">
                </div>
                <div class="form-group">
                    <label>Время окончания (необязательно):</label>
                    <input type="time" class="task-end-time" 
                        value="${taskData ? taskData.endTime : ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Как часто повторять (необязательно):</label>
                <div class="frequency-checkboxes">
                    <label class="checkbox-label">
                        <input type="checkbox" class="frequency-checkbox" value="Раз в несколько часов" 
                            ${taskData && taskData.frequency && taskData.frequency.includes('Раз в несколько часов') ? 'checked' : ''}>
                        Раз в несколько часов
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" class="frequency-checkbox" value="Ежедневно" 
                            ${taskData && taskData.frequency && taskData.frequency.includes('Ежедневно') ? 'checked' : ''}>
                        Ежедневно
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" class="frequency-checkbox" value="Еженедельно" 
                            ${taskData && taskData.frequency && taskData.frequency.includes('Еженедельно') ? 'checked' : ''}>
                        Еженедельно
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" class="frequency-checkbox" value="Ежемесячно" 
                            ${taskData && taskData.frequency && taskData.frequency.includes('Ежемесячно') ? 'checked' : ''}>
                        Ежемесячно
                    </label>
                </div>
            </div>
            <div class="task-comment">
                <label>Комментарий к задаче (необязательно):</label>
                <textarea class="task-comment-input" placeholder="Введите комментарий...">${taskData ? taskData.taskComment : ''}</textarea>
            </div>
        </div>
    `;
    
    tasksContainer.appendChild(taskItem);
    
    // Фокус на поле описания
    if (!taskData) {
        setTimeout(() => {
            const input = taskItem.querySelector('.task-input');
            if (input) input.focus();
        }, 100);
    }
}

// Удалить задачу
function removeTask(taskId) {
    const taskItem = document.getElementById(taskId);
    const tasksContainer = document.getElementById('tasksContainer');
    
    if (taskItem && tasksContainer.children.length > 1) {
        taskItem.remove();
    }
}

// Сохранить карточку
function saveCard() {
    console.log('Сохранение карточки...');
    
    // Собираем данные из формы
    const specialty = document.getElementById('specialty').value.trim();
    const comment = document.getElementById('comment').value.trim();
    const editCardId = document.getElementById('editCardId').value;
    
    // Новые поля для общего времени помощи (они есть в HTML)
    const totalHours = document.getElementById('totalHours').value || '0';
    const totalDays = document.getElementById('totalDays').value || '0';
    const totalMonths = document.getElementById('totalMonths').value || '0';
    
    if (!specialty) {
        alert('Пожалуйста, введите название чек-листа');
        document.getElementById('specialty').focus();
        return;
    }
    
    // Собираем задачи
    const taskItems = document.querySelectorAll('.task-item');
    const tasks = [];
    
    taskItems.forEach(item => {
        const description = item.querySelector('.task-input').value.trim();
        const date = item.querySelector('.task-date').value;
        const startTime = item.querySelector('.task-start-time').value;
        const endTime = item.querySelector('.task-end-time').value;
        const taskComment = item.querySelector('.task-comment-input').value.trim();
        
        // Собираем выбранные частоты для этой задачи
        const checkboxes = item.querySelectorAll('.frequency-checkbox:checked');
        const frequency = Array.from(checkboxes).map(cb => cb.value);
        
        if (description) {
            tasks.push({
                description,
                date: date || '',
                startTime: startTime || '',
                endTime: endTime || '',
                frequency: frequency.length > 0 ? frequency : [],
                taskComment: taskComment || ''
            });
        }
    });
    
    if (tasks.length === 0) {
        alert('Пожалуйста, добавьте хотя бы одну задачу');
        return;
    }
    
    // Создаем объект карточки
    const cardData = {
        id: editCardId || `card_${cardIdCounter++}`,
        specialty,
        tasks, // Теперь tasks содержит объекты с деталями каждой задачи
        comment: comment || '',
        totalTime: { // Новое поле для общего времени помощи
            hours: parseInt(totalHours) || 0,
            days: parseInt(totalDays) || 0,
            months: parseInt(totalMonths) || 0
        },
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('ru-RU')
    };
    
    // Если это редактирование, обновляем существующую карточку
    if (editCardId) {
        const index = cards.findIndex(card => card.id === editCardId);
        if (index !== -1) {
            cards[index] = cardData;
        }
    } else {
        // Иначе добавляем новую карточку
        cards.push(cardData);
    }
    
    // Обновляем отображение карточек
    renderCards();
    
    // Скрываем форму и очищаем
    hideForm();
    clearForm();
    
    // Сохраняем в localStorage
    saveToStorage();
    
    alert('Чек-лист успешно опубликован!');
}

// Отобразить все карточки
function renderCards() {
    const container = document.getElementById('cardsContainer');
    if (!container) {
        console.error('Контейнер карточек не найден');
        return;
    }
    
    container.innerHTML = '';
    
    cards.forEach(card => {
        // Генерируем HTML для списка задач с деталями
        const tasksList = card.tasks.map((task, index) => {
            const frequencyText = task.frequency && task.frequency.length > 0 ? task.frequency.join(', ') : 'Не указано';
            const timeRange = task.startTime && task.endTime ? `${task.startTime} - ${task.endTime}` : '';
            const hasDate = task.date ? `📅 ${task.date}` : '';
            const hasTime = timeRange ? `⏰ ${timeRange}` : '';
            const hasFrequency = task.frequency.length > 0 ? `🔄 ${frequencyText}` : '';
            
            const metaItems = [hasDate, hasTime, hasFrequency].filter(item => item !== '');
            
            return `
                <li class="task-list-item">
                    <div class="task-number">${index + 1}.</div>
                    <div class="task-details">
                        <div class="task-description">${task.description}</div>
                        ${metaItems.length > 0 ? `
                            <div class="task-meta">
                                ${metaItems.map(item => `<span>${item}</span>`).join('')}
                            </div>
                        ` : ''}
                        ${task.taskComment ? 
                            `<div class="task-comment-text">💬 ${task.taskComment}</div>` : ''}
                    </div>
                </li>
            `;
        }).join('');
        
        // Форматируем общее время помощи
        const totalTimeText = getTotalTimeText(card.totalTime);
        
        const cardHTML = `
            <div class="card" data-id="${card.id}">
                <div class="time">${card.time}<br><small>${card.date}</small></div>
                <div class="card-header">
                    <img src="https://via.placeholder.com/60x60/ffebcd/000?text=Лого" alt="Логотип">
                    <div class="card-title">
                        <h3>${card.specialty}</h3>
                        ${totalTimeText !== 'Не указано' ? `
                            <div class="total-time-badge">
                                ⏱️ Общее время: ${totalTimeText}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="card-content">
                    <div class="tasks-section">
                        <h4>Задачи (${card.tasks.length}):</h4>
                        <ul class="tasks-list">
                            ${tasksList}
                        </ul>
                    </div>
                    
                    ${card.comment ? `
                        <div class="card-comment">
                            <strong>📝 Комментарий:</strong> ${card.comment}
                        </div>
                    ` : ''}
                </div>
                <div class="card-actions">
                    <button class="edit-btn" onclick="editCard('${card.id}')">Изменить</button>
                    <button class="delete-btn" onclick="deleteCard('${card.id}')">Удалить</button>
                    <button class="details-btn" onclick="viewDetails('${card.id}')">Подробнее</button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}

// Вспомогательная функция для форматирования общего времени
function getTotalTimeText(totalTime) {
    const parts = [];
    
    if (totalTime.months > 0) {
        parts.push(`${totalTime.months} мес.`);
    }
    
    if (totalTime.days > 0) {
        parts.push(`${totalTime.days} дн.`);
    }
    
    if (totalTime.hours > 0) {
        parts.push(`${totalTime.hours} ч.`);
    }
    
    return parts.length > 0 ? parts.join(' ') : 'Не указано';
}

// Редактировать карточку
function editCard(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) {
        alert('Карточка не найдена');
        return;
    }
    
    // Заполняем форму данными карточки
    document.getElementById('specialty').value = card.specialty;
    document.getElementById('comment').value = card.comment || '';
    document.getElementById('editCardId').value = card.id;
    
    // Заполняем общее время
    document.getElementById('totalHours').value = card.totalTime.hours || '0';
    document.getElementById('totalDays').value = card.totalTime.days || '0';
    document.getElementById('totalMonths').value = card.totalTime.months || '0';
    
    // Заполняем задачи
    const tasksContainer = document.getElementById('tasksContainer');
    tasksContainer.innerHTML = '';
    
    card.tasks.forEach(task => {
        addTaskInput(task);
    });
    
    // Добавляем пустое поле если задач нет
    if (card.tasks.length === 0) {
        addTaskInput();
    }
    
    // Показываем форму
    showForm();
}

// Удалить карточку
function deleteCard(cardId) {
    if (confirm('Вы уверены, что хотите удалить эту карточку?')) {
        cards = cards.filter(card => card.id !== cardId);
        renderCards();
        saveToStorage();
        alert('Карточка успешно удалена');
    }
}

// Просмотр деталей карточки
function viewDetails(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) {
        alert('Карточка не найдена');
        return;
    }
    
    const tasksText = card.tasks.map((task, index) => {
        const details = [];
        details.push(`${index + 1}. ${task.description}`);
        if (task.date) details.push(`   Дата: ${task.date}`);
        if (task.startTime && task.endTime) details.push(`   Время: ${task.startTime} - ${task.endTime}`);
        if (task.frequency.length > 0) details.push(`   Частота: ${task.frequency.join(', ')}`);
        if (task.taskComment) details.push(`   Комментарий: ${task.taskComment}`);
        return details.join('\n');
    }).join('\n\n');
    
    const details = `
${card.specialty.toUpperCase()}

📊 ОБЩАЯ ИНФОРМАЦИЯ:
Общее время: ${getTotalTimeText(card.totalTime)}
Дата создания: ${card.date} ${card.time}
${card.comment ? `Комментарий: ${card.comment}` : ''}

📋 ЗАДАЧИ (${card.tasks.length} шт.):
${tasksText}

---
Управление: можно изменить или удалить эту карточку.
    `;
    
    alert(details);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница загружена');
    
    // Загружаем карточки из localStorage
    const savedCards = localStorage.getItem('cards');
    if (savedCards) {
        try {
            cards = JSON.parse(savedCards);
            console.log('Загружено карточек:', cards.length);
            renderCards();
        } catch (e) {
            console.error('Ошибка при загрузке карточек:', e);
            cards = [];
        }
    } else {
        console.log('Нет сохраненных карточек');
    }
});

// Сохранять карточки при изменении
function saveToStorage() {
    try {
        localStorage.setItem('cards', JSON.stringify(cards));
        console.log('Карточки сохранены в localStorage:', cards.length);
    } catch (e) {
        console.error('Ошибка при сохранении в localStorage:', e);
    }
}

// Глобальные функции для вызова из HTML
window.removeTask = removeTask;
window.editCard = editCard;
window.deleteCard = deleteCard;
window.viewDetails = viewDetails;

// Для отладки в консоли
console.log('Файл zavka2.js загружен');