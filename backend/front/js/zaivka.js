let elders = [];

document.addEventListener('DOMContentLoaded', function() {
    loadElders();
    loadRequests();
    
    document.getElementById('createBtn').onclick = function() {
        if (elders.length === 0) {
            showNotification('Сначала добавьте пожилого человека в профиле', 'error');
            return;
        }
        showForm();
    };
    
    document.getElementById('cancelBtn').onclick = function() {
        hideForm();
        clearForm();
    };
    
    document.getElementById('publishBtn').onclick = function() {
        saveCard();
    };
    
    document.getElementById('addTaskBtn').onclick = function() {
        addTaskInput();
    };
});

async function loadElders() {
    try {
        const response = await fetchWithAuth('/api/v1/elders/me');
        if (response.ok) {
            const loadedElders = await response.json();
            // Убираем дубликаты по ID
            elders = loadedElders.filter((elder, index, self) =>
                index === self.findIndex(e => e.id === elder.id)
            );
        }
    } catch (error) {
        console.error('Ошибка загрузки пожилых:', error);
        showNotification('Ошибка загрузки списка пожилых. Попробуйте обновить страницу.', 'error');
    }
}

async function loadRequests() {
    const container = document.getElementById('cardsContainer');
    if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading-spinner"></div><p>Загрузка заявок...</p></div>';
    }
    
    try {
        const response = await fetchWithAuth('/api/v1/requests/me?limit=30');
        if (response.ok) {
            const requests = await response.json();
            // Убираем дубликаты по ID
            const uniqueRequests = requests.filter((request, index, self) =>
                index === self.findIndex(r => r.id === request.id)
            );
            renderCards(uniqueRequests);
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось загрузить заявки' }));
            showNotification('Ошибка загрузки заявок: ' + (error.detail || 'Попробуйте обновить страницу'), 'error');
            if (container) {
                container.innerHTML = '<p style="text-align: center; padding: 40px; color: #f44336;">Ошибка загрузки заявок</p>';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        showNotification('Ошибка соединения с сервером. Проверьте подключение к интернету.', 'error');
        if (container) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #f44336;">Ошибка соединения</p>';
        }
    }
}

function showForm() {
    document.getElementById('formPage').style.display = 'block';
    document.querySelector('.main').style.display = 'none';
    
    populateElderSelect();
    
    const tasksContainer = document.getElementById('tasksContainer');
    if (tasksContainer.children.length === 0) {
        addTaskInput();
    }
}

function hideForm() {
    document.getElementById('formPage').style.display = 'none';
    document.querySelector('.main').style.display = 'flex';
}

function clearForm() {
    document.getElementById('taskName').value = '';
    document.getElementById('comment').value = '';
    document.getElementById('editCardId').value = '';
    document.getElementById('frequency').value = '';
    document.getElementById('scheduledDate').value = '';
    document.getElementById('scheduledTime').value = '';
    document.getElementById('durationValue').value = '0';
    document.getElementById('durationUnit').value = 'hours';
    document.getElementById('isShoppingChecklist').checked = false;
    
    const elderSelect = document.getElementById('elderSelect');
    if (elderSelect) {
        elderSelect.value = '';
    }
    
    const tasksContainer = document.getElementById('tasksContainer');
    tasksContainer.innerHTML = '';
}

function populateElderSelect() {
    let elderSelect = document.getElementById('elderSelect');
    
    if (!elderSelect) {
        return;
    }
    
    updateElderSelectOptions(elderSelect);
}

function updateElderSelectOptions(selectElement) {
    if (!selectElement) return;
    
    // Сохраняем текущее значение
    const currentValue = selectElement.value;
    
    // Очищаем все опции кроме первой (пустой)
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }
    
    // Добавляем пожилых, убирая дубликаты
    const uniqueElders = elders.filter((elder, index, self) =>
        index === self.findIndex(e => e.id === elder.id)
    );
    
    uniqueElders.forEach(elder => {
        const option = document.createElement('option');
        option.value = elder.id;
        option.textContent = escapeHtml(elder.full_name);
        selectElement.appendChild(option);
    });
    
    // Восстанавливаем выбранное значение, если оно все еще существует
    if (currentValue && Array.from(selectElement.options).some(opt => opt.value === currentValue)) {
        selectElement.value = currentValue;
    }
}

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
                    value="${taskData ? escapeHtml(taskData.description) : ''}">
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
            <div class="task-comment">
                <label>Комментарий к задаче (необязательно):</label>
                <textarea class="task-comment-input" placeholder="Введите комментарий...">${taskData ? escapeHtml(taskData.taskComment) : ''}</textarea>
            </div>
        </div>
    `;
    
    tasksContainer.appendChild(taskItem);
    
    if (!taskData) {
        setTimeout(() => {
            const input = taskItem.querySelector('.task-input');
            if (input) input.focus();
        }, 100);
    }
}

function removeTask(taskId) {
    const taskItem = document.getElementById(taskId);
    const tasksContainer = document.getElementById('tasksContainer');
    
    if (taskItem && tasksContainer.children.length > 1) {
        taskItem.remove();
    }
}

async function saveCard() {
    const elderId = document.getElementById('elderSelect')?.value;
    const taskName = document.getElementById('taskName').value.trim();
    const comment = document.getElementById('comment').value.trim();
    const editCardId = document.getElementById('editCardId').value;
    const frequency = document.getElementById('frequency').value;
    const scheduledDate = document.getElementById('scheduledDate').value;
    const scheduledTime = document.getElementById('scheduledTime').value;
    const durationValue = parseInt(document.getElementById('durationValue').value) || 0;
    const durationUnit = document.getElementById('durationUnit').value;
    const isShoppingChecklist = document.getElementById('isShoppingChecklist').checked;
    
    if (!elderId) {
        showNotification('Пожалуйста, выберите пожилого человека', 'error');
        return;
    }
    
    if (!taskName) {
        showNotification('Пожалуйста, введите название задачи', 'error');
        document.getElementById('taskName').focus();
        return;
    }
    
    if (!frequency) {
        showNotification('Пожалуйста, выберите частоту проведения', 'error');
        return;
    }

    const taskItems = document.querySelectorAll('.task-item');
    const checkList = [];
    
    taskItems.forEach(item => {
        const description = item.querySelector('.task-input').value.trim();
        
        if (description) {
            checkList.push(description);
        }
    });
    
    if (checkList.length === 0) {
        showNotification('Пожалуйста, добавьте хотя бы одну задачу', 'error');
        return;
    }
    
    const requestData = {
        elder_id: elderId,
        task_name: taskName,
        check_list: checkList,
        description: comment || null,
        frequency: frequency || null,
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime || null,
        duration_value: durationValue > 0 ? durationValue : null,
        duration_unit: durationValue > 0 ? durationUnit : null,
        is_shopping_checklist: isShoppingChecklist
    };
    
    try {
        let response;
        if (editCardId) {
            response = await fetchWithAuth(`/api/v1/requests/${editCardId}`, {
                method: 'PATCH',
                body: JSON.stringify(requestData)
            });
        } else {
            response = await fetchWithAuth('/api/v1/requests', {
                method: 'POST',
                body: JSON.stringify(requestData)
            });
        }
        
        if (response.ok) {
            showNotification(editCardId ? 'Заявка обновлена!' : 'Заявка успешно создана!', 'success');
            hideForm();
            clearForm();
            loadRequests();
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось сохранить заявку' }));
            showNotification('Ошибка: ' + (error.detail || 'Не удалось сохранить заявку'), 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения с сервером. Проверьте подключение к интернету.', 'error');
    }
}

function renderCards(requests) {
    const container = document.getElementById('cardsContainer');
    if (!container) {
        console.error('Контейнер карточек не найден');
        return;
    }
    
    container.innerHTML = '';
    
    if (!requests || requests.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Нет созданных заявок</p>';
        return;
    }
    
    // Убираем дубликаты по ID перед рендерингом
    const uniqueRequests = requests.filter((request, index, self) =>
        index === self.findIndex(r => r.id === request.id)
    );
    
    uniqueRequests.forEach(request => {
        const tasksList = request.check_list.map((task, index) => `
            <li class="task-list-item">
                <div class="task-number">${index + 1}.</div>
                <div class="task-details">
                    <div class="task-description">${escapeHtml(task)}</div>
                </div>
            </li>
        `).join('');
        
        const statusText = getStatusText(request.status);
        const dateStr = request.scheduled_date ? new Date(request.scheduled_date + 'T00:00:00').toLocaleDateString('ru-RU') : 'Не указана';
        const timeStr = request.scheduled_time || 'Не указано';
        
        const cardHTML = `
            <div class="card" data-id="${request.id}">
                <div class="time">${timeStr}<br><small>${dateStr}</small></div>
                <div class="card-header">
                    <img src="/img/avatar.png" alt="Аватар">
                    <div class="card-title">
                        <h3>${escapeHtml(request.task_name)}</h3>
                        <div style="font-size: 14px; color: #666;">Статус: ${statusText}</div>
                    </div>
                </div>
                <div class="card-content">
                    <div class="tasks-section">
                        <h4>Задачи (${request.check_list.length}):</h4>
                        <ul class="tasks-list">
                            ${tasksList}
                        </ul>
                    </div>
                    
                    ${request.description ? `
                        <div class="card-comment">
                            <strong>📝 Описание:</strong> ${escapeHtml(request.description)}
                        </div>
                    ` : ''}
                    
                    ${request.frequency ? `
                        <div class="card-comment">
                            <strong>🔄 Частота:</strong> ${getFrequencyText(request.frequency)}
                        </div>
                    ` : ''}
                    
                    ${request.is_shopping_checklist ? `
                        <div class="card-comment">
                            <strong>🛒 Чеклист с покупкой</strong>
                        </div>
                    ` : ''}
                </div>
                <div class="card-actions">
                    ${request.status === 'open' ? `
                        <button class="edit-btn" onclick="editCard('${request.id}')">Изменить</button>
                        <button class="delete-btn" onclick="deleteCard('${request.id}')">Удалить</button>
                    ` : ''}
                    <button class="details-btn" onclick="viewDetails('${request.id}')">Подробнее</button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function getStatusText(status) {
    const statusMap = {
        'open': 'Открыта',
        'in_progress': 'В работе',
        'done': 'Выполнена'
    };
    return statusMap[status] || status;
}

function getFrequencyText(frequency) {
    const frequencyMap = {
        'once': 'Единоразово',
        'every_few_hours': 'Раз в несколько часов',
        'daily': 'Ежедневно',
        'weekly': 'Еженедельно',
        'monthly': 'Ежемесячно'
    };
    return frequencyMap[frequency] || frequency;
}

function getDurationUnitText(unit) {
    const unitMap = {
        'hours': 'часов',
        'days': 'дней',
        'months': 'месяцев'
    };
    return unitMap[unit] || unit;
}

async function editCard(requestId) {
    try {
        const response = await fetchWithAuth(`/api/v1/requests/${requestId}`);
        if (response.ok) {
            const request = await response.json();
            
            document.getElementById('elderSelect').value = request.elder_id;
            document.getElementById('taskName').value = request.task_name || '';
            document.getElementById('comment').value = request.description || '';
            document.getElementById('frequency').value = request.frequency || '';
            document.getElementById('scheduledDate').value = request.scheduled_date || '';
            document.getElementById('scheduledTime').value = request.scheduled_time || '';
            document.getElementById('durationValue').value = request.duration_value || 0;
            document.getElementById('durationUnit').value = request.duration_unit || 'hours';
            document.getElementById('isShoppingChecklist').checked = request.is_shopping_checklist || false;
            document.getElementById('editCardId').value = request.id;
            
            const tasksContainer = document.getElementById('tasksContainer');
            tasksContainer.innerHTML = '';
            
            request.check_list.forEach(task => {
                addTaskInput({ description: task });
            });
            
            showForm();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка загрузки заявки');
    }
}

async function deleteCard(requestId) {
    if (!confirm('Вы уверены, что хотите удалить эту заявку?')) return;
    
    try {
        const response = await fetchWithAuth(`/api/v1/requests/${requestId}`, {
            method: 'DELETE'
        });
        
        if (response.status === 204) {
            showNotification('Заявка успешно удалена', 'success');
            loadRequests();
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось удалить заявку' }));
            showNotification('Ошибка: ' + (error.detail || 'Не удалось удалить заявку'), 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения с сервером. Проверьте подключение к интернету.', 'error');
    }
}

async function viewDetails(requestId) {
    try {
        const response = await fetchWithAuth(`/api/v1/requests/${requestId}`);
        if (response.ok) {
            const request = await response.json();
            
            const details = {
                'Название задачи': request.task_name,
                'Статус': getStatusText(request.status),
                'Дата создания': new Date(request.created_at).toLocaleString('ru-RU'),
                'Задач': `${request.check_list.length} шт.`,
                'Список задач': request.check_list.map((task, index) => `${index + 1}. ${task}`).join('\n')
            };
            
            if (request.description) {
                details['Описание'] = request.description;
            }
            if (request.frequency) {
                details['Частота'] = getFrequencyText(request.frequency);
            }
            if (request.scheduled_date) {
                details['Дата выполнения'] = new Date(request.scheduled_date + 'T00:00:00').toLocaleDateString('ru-RU');
            }
            if (request.scheduled_time) {
                details['Время выполнения'] = request.scheduled_time;
            }
            if (request.duration_value && request.duration_unit) {
                details['Длительность'] = `${request.duration_value} ${getDurationUnitText(request.duration_unit)}`;
            }
            if (request.is_shopping_checklist) {
                details['Чеклист с покупкой'] = 'Да';
            }
            
            showDetailsModal('Детали заявки', details);
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось загрузить данные' }));
            showNotification('Ошибка: ' + (error.detail || 'Не удалось загрузить детали заявки'), 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

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

// Функция для показа уведомлений
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-size: 14px;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Добавляем стили для анимации, если их еще нет
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 4000);
}

// Функция для показа модального окна с деталями
function showDetailsModal(title, details) {
    // Удаляем существующее модальное окно, если есть
    const existingModal = document.getElementById('detailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'detailsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        animation: fadeIn 0.3s ease-out;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;
    
    let detailsHTML = `<h2 style="margin-top: 0; color: #333;">${escapeHtml(title)}</h2>`;
    detailsHTML += '<div style="display: flex; flex-direction: column; gap: 12px;">';
    
    for (const [key, value] of Object.entries(details)) {
        detailsHTML += `
            <div style="border-bottom: 1px solid #eee; padding-bottom: 8px;">
                <strong style="color: #666; display: block; margin-bottom: 4px;">${escapeHtml(key)}:</strong>
                <span style="color: #333; white-space: pre-line;">${escapeHtml(value)}</span>
            </div>
        `;
    }
    
    detailsHTML += '</div>';
    detailsHTML += `
        <button id="closeDetailsModal" style="
            margin-top: 20px;
            padding: 10px 20px;
            background: #784923;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            width: 100%;
            font-size: 16px;
        ">Закрыть</button>
    `;
    
    modalContent.innerHTML = detailsHTML;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Добавляем стили для анимации
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Обработчик закрытия
    const closeBtn = modalContent.querySelector('#closeDetailsModal');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Закрытие по Escape
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

window.removeTask = removeTask;
window.editCard = editCard;
window.deleteCard = deleteCard;
window.viewDetails = viewDetails;

console.log('Файл zaivka.js загружен');