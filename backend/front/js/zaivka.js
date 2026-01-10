let elders = [];
let elderDetailsCache = {};

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
    
    setupFrequencyRadioButtons();
});

function toggleActionMenu(button, requestId, status) {
    const menu = button.nextElementSibling;
    const allMenus = document.querySelectorAll('.action-menu');
    
    allMenus.forEach(m => {
        if (m !== menu) {
            m.classList.remove('active');
        }
    });
    
    menu.classList.toggle('active');
    
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target) && !button.contains(e.target)) {
            menu.classList.remove('active');
            document.removeEventListener('click', closeMenu);
        }
    });
}

async function reopenCard(requestId) {
    try {
        const response = await fetchWithAuth(`/api/v1/requests/${requestId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'in_progress' })
        });
        
        if (response.ok) {
            showNotification('Заявка открыта снова', 'success');
            loadRequests();
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось открыть заявку' }));
            showNotification('Ошибка: ' + (error.detail || 'Не удалось открыть заявку'), 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

async function closeCard(requestId) {
    try {
        const response = await fetchWithAuth(`/api/v1/requests/${requestId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'done' })
        });
        
        if (response.ok) {
            showNotification('Заявка закрыта', 'success');
            loadRequests();
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось закрыть заявку' }));
            showNotification('Ошибка: ' + (error.detail || 'Не удалось закрыть заявку'), 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

async function loadElders() {
    try {
        const response = await fetchWithAuth('/api/v1/elders/me');
        if (response.ok) {
            const loadedElders = await response.json();
            elders = loadedElders.filter((elder, index, self) =>
                index === self.findIndex(e => e.id === elder.id)
            );
            
            console.log('Загружены пожилые:', elders);
            console.log('Первый пожилой аватар:', elders[0]?.avatar_presigned_url);
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

async function showElderDetails(elderId) {
    let elder = elders.find(e => e.id === elderId);
    
    if (!elder) {
        try {
            const response = await fetchWithAuth(`/api/v1/elders/${elderId}`);
            if (response.ok) {
                elder = await response.json();
            }
        } catch (error) {
            console.error('Ошибка загрузки данных пожилого:', error);
            showNotification('Не удалось загрузить данные пожилого', 'error');
            return;
        }
    }
    
    if (!elder) {
        showNotification('Данные пожилого не найдены', 'error');
        return;
    }
    
    const avatarUrl = elder.avatar_presigned_url || './img/profile.png';
    
    let detailsHTML = '';
    
    if (elder.birthday) {
        detailsHTML += `
            <div class="detail-item">
                <div class="detail-label">Дата рождения:</div>
                <div class="detail-value">${new Date(elder.birthday).toLocaleDateString('ru-RU')}</div>
            </div>
        `;
    }
    
    if (elder.address) {
        detailsHTML += `
            <div class="detail-item">
                <div class="detail-label">Адрес:</div>
                <div class="detail-value">${escapeHtml(elder.address)}</div>
            </div>
        `;
    }
    
    if (elder.health_status) {
        detailsHTML += `
            <div class="detail-item">
                <div class="detail-label">Состояние здоровья:</div>
                <div class="detail-value">${escapeHtml(elder.health_status)}</div>
            </div>
        `;
    }
    
    if (elder.physical_limitations) {
        detailsHTML += `
            <div class="detail-item">
                <div class="detail-label">Физические ограничения:</div>
                <div class="detail-value">${escapeHtml(elder.physical_limitations)}</div>
            </div>
        `;
    }
    
    if (elder.disease) {
        detailsHTML += `
            <div class="detail-item">
                <div class="detail-label">Заболевания:</div>
                <div class="detail-value">${escapeHtml(elder.disease)}</div>
            </div>
        `;
    }
    
    if (elder.features) {
        detailsHTML += `
            <div class="detail-item">
                <div class="detail-label">Особенности:</div>
                <div class="detail-value">${escapeHtml(elder.features)}</div>
            </div>
        `;
    }
    
    if (elder.hobbies) {
        detailsHTML += `
            <div class="detail-item">
                <div class="detail-label">Хобби:</div>
                <div class="detail-value">${escapeHtml(elder.hobbies)}</div>
            </div>
        `;
    }
    
    if (elder.comments) {
        detailsHTML += `
            <div class="detail-item">
                <div class="detail-label">Комментарии:</div>
                <div class="detail-value">${escapeHtml(elder.comments)}</div>
            </div>
        `;
    }
    
    if (!detailsHTML) {
        detailsHTML = '<p>Дополнительная информация отсутствует</p>';
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            <div class="elder-modal-header">
                <img src="${avatarUrl}" alt="Аватар" class="elder-modal-avatar" onerror="this.src='./img/profile.png'">
                <div class="elder-modal-info">
                    <h3>${escapeHtml(elder.full_name)}</h3>
                    <p>Пожилой человек</p>
                </div>
            </div>
            <div class="elder-details-list">
                ${detailsHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
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

function getFrequencyText(frequency) {
    if (!frequency) return 'Единоразово';
    
    const frequencyMap = {
        'every_few_hours': 'Раз в несколько часов',
        'daily': 'Ежедневно',
        'weekly': 'Еженедельно',
        'monthly': 'Ежемесячно'
    };
    return frequencyMap[frequency] || frequency;
}

function hideForm() {
    document.getElementById('formPage').style.display = 'none';
    document.querySelector('.main').style.display = 'flex';
}

function clearForm() {
    const formFields = [
        'taskName',
        'comment',
        'editCardId',
        'scheduledDate',
        'scheduledTime',
        'durationValue',
        'durationUnit',
        'isShoppingChecklist'
    ];
    
    formFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = false;
            } else {
                element.value = '';
            }
        }
    });
    
    const elderSelect = document.getElementById('elderSelect');
    if (elderSelect) {
        elderSelect.value = '';
    }
    
    const radioButtons = document.querySelectorAll('input[name="frequency"]');
    if (radioButtons.length > 0) {
        radioButtons.forEach(radio => {
            radio.checked = false;
            radio.setAttribute('data-checked', 'false');
        });
    }

    const tasksContainer = document.getElementById('tasksContainer');
    if (tasksContainer) {
        tasksContainer.innerHTML = '';
    }
}

function createCard(request, container, isDoneSection) {
    const card = document.createElement('div');
    card.className = 'request-card';
    if (request.status === 'done' || isDoneSection) {
        card.classList.add('done');
    }
    card.dataset.id = request.id;
    card.dataset.status = request.status;
    
    const elder = elders.find(e => e.id === request.elder_id);
    const elderName = elder ? elder.full_name : 'Неизвестно';
    const avatarUrl = elder && elder.avatar_presigned_url ? elder.avatar_presigned_url : './img/profile.png';
    
    const menuContent = request.status === 'done' 
        ? `<button class="action-item" onclick="reopenCard('${request.id}')">Открыть снова</button>`
        : `<button class="action-item" onclick="editCard('${request.id}')">Изменить</button>
           <button class="action-item" onclick="deleteCard('${request.id}')">Удалить</button>
           <button class="action-item" onclick="closeCard('${request.id}')">Закрыть</button>`;
    
    const statusText = request.status === 'done' 
        ? 'Закрыто' 
        : renderStatus(request.status, request.volunteer);
    
    const showRightSection = true;
    
    // ФОРМИРУЕМ ВЕРХНЮЮ СТРОКУ: название слева, время справа
    const durationText = request.duration_value ? 
        `~ ${request.duration_value} ${getDurationUnitText(request.duration_unit)}` : 
        '';
    
    // Формируем таблицу задач
    const tasksTableRows = request.tasks.map((task, index) => {
        const frequencyText = task.frequency ? getFrequencyText(task.frequency) : 'Единоразово';
        
        let scheduleText = '';
        if (task.scheduled_date || task.scheduled_time) {
            if (task.scheduled_date) {
                scheduleText += new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString('ru-RU');
            }
            if (task.scheduled_time) {
                if (scheduleText) scheduleText += ' ';
                scheduleText += task.scheduled_time;
            }
        } else {
            scheduleText = '-';
        }
        
        return `
            <div class="task-table-row">
                <div class="task-number">${index + 1}.</div>
                <div class="task-frequency-cell">${frequencyText}</div>
                <div class="task-schedule-cell">${scheduleText}</div>
            </div>
        `;
    }).join('');
    
    card.innerHTML = `
        <div class="card-header-section">
            <!-- ПЕРВАЯ СТРОКА: название слева, время справа -->
            <div class="card-top-row">
                <h3 class="card-checklist-name">${escapeHtml(request.checklist_name)}</h3>
                ${durationText ? `
                    <div class="card-duration-badge">
                        ${durationText}
                    </div>
                ` : ''}
            </div>
            
            <!-- ВТОРАЯ СТРОКА: заголовки таблицы справа -->
            <div class="card-content-row">
                <!-- Левая часть: аватар и информация о пожилом -->
                <div class="elder-info-section">
                    <div class="elder-avatar-container">
                        <img src="${avatarUrl}" alt="Аватар пожилого" class="elder-avatar" onerror="this.src='./img/profile.png'">
                    </div>
                    <div class="elder-text-info">
                        <div class="elder-name">${escapeHtml(elderName)}</div>
                        <a href="#" class="view-details-link" onclick="showElderDetails('${request.elder_id}'); return false;">Подробнее</a>
                    </div>
                </div>
                
                <!-- Правая часть: таблица задач -->
                <div class="tasks-table-section">
                    <!-- Заголовки таблицы -->
                    <div class="task-table-header">
                        <div class="task-number-header">№</div>
                        <div class="task-frequency-header">Частота выполнения</div>
                        <div class="task-schedule-header">Расписание</div>
                    </div>
                    
                    <!-- Тело таблицы -->
                    <div class="task-table-body">
                        ${tasksTableRows}
                    </div>
                </div>
            </div>
            
            <!-- Дополнительная информация -->
            <div class="card-bottom-info">
                ${request.is_shopping_checklist ? `
                    <div class="card-comment shopping-badge">
                        <strong>Чеклист с покупкой</strong>
                    </div>
                ` : ''}
            </div>
        </div>
        <div class="card-right-section">
            ${showRightSection ? `
                <div class="status-container">
                    <div class="status-text">
                        ${statusText}
                    </div>
                </div>
                ${request.status !== 'done' ? `
                    <button class="responses-btn" onclick="showResponses('${request.id}')">
                        Отклики (${request.response_count || 0})
                    </button>
                ` : ''}
            ` : ''}
        </div>
        <button class="card-actions-gear" onclick="toggleActionMenu(this, '${request.id}', '${request.status}')">
            <i class="fas fa-cog"></i>
        </button>
        <div class="action-menu">
            ${menuContent}
        </div>
    `;
    
    container.appendChild(card);
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
    
    // Определяем значения для радио-кнопок
    let everyFewHoursChecked = taskData && taskData.frequency === 'every_few_hours' ? 'checked' : '';
    let dailyChecked = taskData && taskData.frequency === 'daily' ? 'checked' : '';
    let weeklyChecked = taskData && taskData.frequency === 'weekly' ? 'checked' : '';
    let monthlyChecked = taskData && taskData.frequency === 'monthly' ? 'checked' : '';
    
    taskItem.innerHTML = `
        <div class="task-header">
            <button type="button" class="remove-task-btn" onclick="removeTask('${taskId}')">×</button>
        </div>
        <div class="task-content">
            <div class="form-group">
                <input type="text" class="task-input" placeholder="Задача" 
                    value="${taskData ? escapeHtml(taskData.description) : ''}">
            </div>
            
            <div class="task-comment">
                <label>Комментарий</label>
                <textarea class="task-comment-input" placeholder="Введите комментарий...">${taskData ? escapeHtml(taskData.taskComment || '') : ''}</textarea>
            </div>
            
            <div class="task-frequency">
                <h4>Как часто повторять эту помощь?</h4>
                <p>(если единоразово, то не нужно выбирать)</p>
                <div class="task-frequency-options">
                    <div class="task-frequency-option">
                        <input type="radio" id="${taskId}_every_few_hours" name="${taskId}_frequency" value="every_few_hours" ${everyFewHoursChecked}>
                        <label for="${taskId}_every_few_hours">Раз в несколько часов</label>
                    </div>
                    <div class="task-frequency-option">
                        <input type="radio" id="${taskId}_daily" name="${taskId}_frequency" value="daily" ${dailyChecked}>
                        <label for="${taskId}_daily">Ежедневно</label>
                    </div>
                    <div class="task-frequency-option">
                        <input type="radio" id="${taskId}_weekly" name="${taskId}_frequency" value="weekly" ${weeklyChecked}>
                        <label for="${taskId}_weekly">Еженедельно</label>
                    </div>
                    <div class="task-frequency-option">
                        <input type="radio" id="${taskId}_monthly" name="${taskId}_frequency" value="monthly" ${monthlyChecked}>
                        <label for="${taskId}_monthly">Ежемесячно</label>
                    </div>
                </div>
            </div>

            <div class="form-row">
                <h4>Расписание помощи</h4>
                <div class="form-group">
                    <label>Выбор даты: </label>
                    <input type="date" class="task-date" 
                        value="${taskData && taskData.date ? taskData.date : ''}">
                </div>
                <div class="form-group">
                    <label>Выбор времени: :</label>
                    <input type="time" class="task-start-time" 
                        value="${taskData && taskData.startTime ? taskData.startTime : ''}">
                </div>
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
    const checklistName = document.getElementById('taskName').value.trim();
    const durationValue = parseInt(document.getElementById('durationValue').value) || 0;
    const durationUnit = document.getElementById('durationUnit').value;
    const isShoppingChecklist = document.getElementById('isShoppingChecklist').checked;
    const editCardId = document.getElementById('editCardId').value;
    
    if (!elderId) {
        showNotification('Пожалуйста, выберите пожилого человека', 'error');
        return;
    }
    
    if (!checklistName) {
        showNotification('Пожалуйста, введите название чек-листа', 'error');
        document.getElementById('taskName').focus();
        return;
    }

    const taskItems = document.querySelectorAll('.task-item');
    const tasks = [];
    
    // Собираем данные для каждой задачи
    taskItems.forEach((item, index) => {
        const taskName = item.querySelector('.task-input').value.trim();
        const comment = item.querySelector('.task-comment-input')?.value.trim() || null;
        
        // Получаем выбранную частоту для задачи
        const frequencyRadio = item.querySelector('input[name^="task_"]:checked');
        const frequency = frequencyRadio ? frequencyRadio.value : null;
        
        const date = item.querySelector('.task-date')?.value || null;
        const time = item.querySelector('.task-start-time')?.value || null;
        
        if (taskName) {
            tasks.push({
                task_name: taskName,
                description: comment,
                frequency: frequency,
                scheduled_date: date,
                scheduled_time: time,
                order_index: index
            });
        }
    });
    
    if (tasks.length === 0) {
        showNotification('Пожалуйста, добавьте хотя бы одну задачу', 'error');
        return;
    }
    
    const requestData = {
        elder_id: elderId,
        checklist_name: checklistName,
        tasks: tasks,
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

function setupFrequencyRadioButtons() {
    const radioButtons = document.querySelectorAll('input[name="frequency"]');
    
    radioButtons.forEach(radio => {
        radio.addEventListener('click', function(e) {
            if (this.checked && this.getAttribute('data-checked') === 'true') {
                this.checked = false;
                this.setAttribute('data-checked', 'false');
                e.preventDefault();
            } else {
                radioButtons.forEach(rb => {
                    rb.setAttribute('data-checked', 'false');
                });
                this.setAttribute('data-checked', 'true');
            }
        });
    });
}

function renderCards(requests) {
    const container = document.getElementById('cardsContainer');
    if (!container) {
        console.error('Контейнер карточек не найден');
        return;
    }
    
    container.innerHTML = '';
    
    const uniqueRequests = requests.filter((request, index, self) =>
        index === self.findIndex(r => r.id === request.id)
    );
    
    const openRequests = uniqueRequests.filter(r => r.status !== 'done');
    const doneRequests = uniqueRequests.filter(r => r.status === 'done');
    
    if (openRequests.length > 0) {
        openRequests.forEach(request => {
            createCard(request, container, false);
        });
    }
    
    const doneContainer = document.createElement('div');
    doneContainer.className = 'done-requests-container';
    doneContainer.style.cssText = `
        width: 100%;
        max-width: 1200px;
        margin-top: 40px;
        border-top: 2px solid #eee;
        padding-top: 30px;
    `;
    
    if (doneRequests.length > 0) {
        const doneTitle = document.createElement('div');
        doneContainer.appendChild(doneTitle);
        
        doneRequests.forEach(request => {
            createCard(request, doneContainer, true);
        });
        
        container.appendChild(doneContainer);
    }
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
    if (!frequency) return 'Единоразово';
    
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

function renderStatus(status, volunteer) {
    switch(status) {
        case 'open':
            return 'Не в работе';
        case 'in_progress':
            if (volunteer) {
                return `
                    <div class="volunteer-assigned">
                        <img src="${volunteer.avatar_presigned_url || './img/profile.png'}" alt="Аватар волонтера" class="volunteer-avatar" onerror="this.src='./img/profile.png'">
                        <div class="volunteer-name">${escapeHtml(volunteer.full_name)}</div>
                    </div>
                `;
            }
            return 'В работе';
        default:
            return status;
    }
}

function showResponses(requestId) {
    showNotification('Функция откликов в разработке', 'info');
}

async function editCard(requestId) {
    try {
        const response = await fetchWithAuth(`/api/v1/requests/${requestId}`);
        if (response.ok) {
            const request = await response.json();
            
            document.getElementById('elderSelect').value = request.elder_id;
            document.getElementById('taskName').value = request.checklist_name || '';
            document.getElementById('durationValue').value = request.duration_value || 0;
            document.getElementById('durationUnit').value = request.duration_unit || 'hours';
            document.getElementById('isShoppingChecklist').checked = request.is_shopping_checklist || false;
            document.getElementById('editCardId').value = request.id;
            
            const tasksContainer = document.getElementById('tasksContainer');
            tasksContainer.innerHTML = '';
            
            // Загружаем задачи из нового формата
            if (request.tasks && Array.isArray(request.tasks)) {
                request.tasks.forEach(task => {
                    addTaskInput({
                        description: task.task_name,
                        taskComment: task.description || '',
                        frequency: task.frequency,
                        date: task.scheduled_date || '',
                        startTime: task.scheduled_time || ''
                    });
                });
            }
            
            showForm();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка загрузки заявки', 'error');
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
                'Название чек-листа': request.checklist_name,
                'Статус': getStatusText(request.status),
                'Дата создания': new Date(request.created_at).toLocaleString('ru-RU'),
                'Количество задач': `${request.tasks.length} шт.`,
                'Длительность': request.duration_value ? `${request.duration_value} ${getDurationUnitText(request.duration_unit)}` : 'Не указана',
                'Чеклист с покупкой': request.is_shopping_checklist ? 'Да' : 'Нет'
            };
            
            // Добавляем детали по задачам
            const tasksDetails = request.tasks.map((task, index) => {
                let taskInfo = `${index + 1}. ${task.task_name}`;
                if (task.description) taskInfo += `\n   Комментарий: ${task.description}`;
                if (task.frequency) taskInfo += `\n   Частота: ${getFrequencyText(task.frequency)}`;
                if (task.scheduled_date || task.scheduled_time) {
                    taskInfo += `\n   Расписание: `;
                    if (task.scheduled_date) {
                        taskInfo += new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString('ru-RU');
                    }
                    if (task.scheduled_time) {
                        if (task.scheduled_date) taskInfo += ' ';
                        taskInfo += task.scheduled_time;
                    }
                }
                return taskInfo;
            }).join('\n\n');
            
            details['Список задач'] = tasksDetails;
            
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
window.showResponses = showResponses;
window.toggleActionMenu = toggleActionMenu;
window.closeCard = closeCard;
window.showElderDetails = showElderDetails;
