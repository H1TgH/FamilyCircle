let elders = [];

document.addEventListener('DOMContentLoaded', function() {
    loadElders();
    loadRequests();
    
    document.getElementById('createBtn').onclick = function() {
        if (elders.length === 0) {
            alert('Сначала добавьте пожилого человека в профиле');
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
            elders = await response.json();
        }
    } catch (error) {
        console.error('Ошибка загрузки пожилых:', error);
    }
}

async function loadRequests() {
    try {
        const response = await fetchWithAuth('/api/v1/requests/me?limit=50');
        if (response.ok) {
            const requests = await response.json();
            renderCards(requests);
        }
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
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
    document.getElementById('specialty').value = '';
    document.getElementById('comment').value = '';
    document.getElementById('editCardId').value = '';
    document.getElementById('totalHours').value = '0';
    document.getElementById('totalDays').value = '0';
    document.getElementById('totalMonths').value = '0';
    
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
        const specialtyInput = document.getElementById('specialty');
        const selectHtml = `
            <h3>Выберите пожилого человека</h3>
            <select id="elderSelect" required>
                <option value="">Выберите...</option>
                ${elders.map(elder => `
                    <option value="${elder.id}">${escapeHtml(elder.full_name)}</option>
                `).join('')}
            </select>
        `;
        specialtyInput.insertAdjacentHTML('beforebegin', selectHtml);
        elderSelect = document.getElementById('elderSelect');
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
    const specialty = document.getElementById('specialty').value.trim();
    const comment = document.getElementById('comment').value.trim();
    const editCardId = document.getElementById('editCardId').value;
    
    if (!elderId) {
        alert('Пожалуйста, выберите пожилого человека');
        return;
    }
    
    if (!specialty) {
        alert('Пожалуйста, введите название чек-листа');
        document.getElementById('specialty').focus();
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
        alert('Пожалуйста, добавьте хотя бы одну задачу');
        return;
    }
    
    const firstTaskDate = document.querySelector('.task-date')?.value;
    const firstTaskStartTime = document.querySelector('.task-start-time')?.value;
    
    let scheduledTime = null;
    if (firstTaskDate && firstTaskStartTime) {
        scheduledTime = `${firstTaskDate}T${firstTaskStartTime}:00Z`;
    } else if (firstTaskDate) {
        scheduledTime = `${firstTaskDate}T12:00:00Z`;
    } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        scheduledTime = tomorrow.toISOString();
    }
    
    const elder = elders.find(e => e.id === elderId);
    const address = elder ? elder.address : '';
    
    const requestData = {
        elder_id: elderId,
        check_list: checkList,
        category: specialty,
        description: comment || specialty,
        address: address,
        scheduled_time: scheduledTime
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
            alert(editCardId ? 'Заявка обновлена!' : 'Заявка успешно создана!');
            hideForm();
            clearForm();
            loadRequests();
        } else {
            const error = await response.json();
            alert('Ошибка: ' + (error.detail || 'Не удалось сохранить заявку'));
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка соединения с сервером');
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
        container.innerHTML = '<p style="text-align: center; padding: 40px;">Нет созданных заявок</p>';
        return;
    }
    
    requests.forEach(request => {
        const tasksList = request.check_list.map((task, index) => `
            <li class="task-list-item">
                <div class="task-number">${index + 1}.</div>
                <div class="task-details">
                    <div class="task-description">${escapeHtml(task)}</div>
                </div>
            </li>
        `).join('');
        
        const statusText = getStatusText(request.status);
        const scheduledDate = new Date(request.scheduled_time);
        
        const cardHTML = `
            <div class="card" data-id="${request.id}">
                <div class="time">${scheduledDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}<br><small>${scheduledDate.toLocaleDateString('ru-RU')}</small></div>
                <div class="card-header">
                    <img src="/img/avatar.png" alt="Аватар">
                    <div class="card-title">
                        <h3>${escapeHtml(request.category)}</h3>
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
                    
                    ${request.address ? `
                        <div class="card-comment">
                            <strong>📍 Адрес:</strong> ${escapeHtml(request.address)}
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

async function editCard(requestId) {
    try {
        const response = await fetchWithAuth(`/api/v1/requests/${requestId}`);
        if (response.ok) {
            const request = await response.json();
            
            document.getElementById('elderSelect').value = request.elder_id;
            document.getElementById('specialty').value = request.category;
            document.getElementById('comment').value = request.description || '';
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
            alert('Заявка успешно удалена');
            loadRequests();
        } else {
            const error = await response.json();
            alert('Ошибка: ' + (error.detail || 'Не удалось удалить заявку'));
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка соединения с сервером');
    }
}

async function viewDetails(requestId) {
    try {
        const response = await fetchWithAuth(`/api/v1/requests/${requestId}`);
        if (response.ok) {
            const request = await response.json();
            
            const tasksText = request.check_list.map((task, index) => 
                `${index + 1}. ${task}`
            ).join('\n');
            
            const details = `
ЗАЯВКА: ${request.category.toUpperCase()}

Статус: ${getStatusText(request.status)}
Дата создания: ${new Date(request.created_at).toLocaleString('ru-RU')}
Запланировано: ${new Date(request.scheduled_time).toLocaleString('ru-RU')}

📋 ЗАДАЧИ (${request.check_list.length} шт.):
${tasksText}

${request.description ? `📝 ОПИСАНИЕ:\n${request.description}\n` : ''}
${request.address ? `📍 АДРЕС:\n${request.address}` : ''}
            `;
            
            alert(details);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка загрузки деталей');
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

window.removeTask = removeTask;
window.editCard = editCard;
window.deleteCard = deleteCard;
window.viewDetails = viewDetails;

console.log('Файл zaivka.js загружен');