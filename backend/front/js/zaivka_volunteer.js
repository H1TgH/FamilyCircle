// Загрузка доступных заявок при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем авторизацию
    if (!isAuthenticated()) {
        window.location.href = '/input';
        return;
    }
    
    // Проверяем роль
    if (!isVolunteer()) {
        alert('Эта страница доступна только волонтерам');
        window.location.href = '/';
        return;
    }
    
    await loadAvailableRequests();
    setupRespondButtons();
});

// Загрузка доступных заявок
async function loadAvailableRequests() {
    try {
        const response = await fetchWithAuth('/api/v1/requests/available?limit=40');
        if (response.ok) {
            const requests = await response.json();
            renderRequests(requests);
        } else {
            console.error('Ошибка загрузки заявок:', response.status);
        }
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
    }
}

// Отображение заявок
async function renderRequests(requests) {
    const requestsList = document.querySelector('.requests-list');
    if (!requestsList) {
        console.error('Контейнер заявок не найден');
        return;
    }
    
    requestsList.innerHTML = '';
    
    if (!requests || requests.length === 0) {
        requestsList.innerHTML = '<p style="text-align: center; padding: 40px;">Нет доступных заявок</p>';
        return;
    }
    
    // Создаем карточки асинхронно
    for (let index = 0; index < requests.length; index++) {
        const requestRow = await createRequestCard(requests[index], index + 1);
        requestsList.appendChild(requestRow);
    }
    
    // Настраиваем кнопки отклика после рендеринга
    setupRespondButtons();
}

// Создание карточки заявки
async function createRequestCard(request, number) {
    const row = document.createElement('div');
    row.className = 'request-row';
    row.dataset.requestId = request.id;
    
    // Получаем информацию о родственнике и пожилом
    const details = await loadRequestDetails(request.id);
    const relative = details.relative;
    const elder = details.elder;
    
    const scheduledDate = request.scheduled_time ? new Date(request.scheduled_time) : null;
    const dateRange = scheduledDate ? 
        `~ ${scheduledDate.toLocaleDateString('ru-RU')}` : 
        'Дата не указана';
    
    // Формируем список задач из check_list
    const tasksList = request.check_list.map((task, idx) => `
        <div class="task-row-item">
            <div class="task-item">
                ${idx + 1}) ${escapeHtml(task)}
            </div>
            <div class="task-frequency">-</div>
            <div class="task-time">${scheduledDate ? scheduledDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
        </div>
    `).join('');
    
    row.innerHTML = `
        <div class="report-number">${number}.</div>
        
        <div class="relative-card">
            <img src="/img/avatar.png" alt="Родственник">
            <p class="name">${relative ? escapeHtml(`${relative.surname}\n${relative.name}\n${relative.patronymic || ''}`) : 'Не указано'}</p>
            <a href="#" class="details-link" onclick="showRelativeDetails('${request.relative_id}'); return false;">Подробнее →</a>
        </div>
        
        <div class="task-card-wrapper">
            <article class="report-card">
                <div class="report-date">${dateRange}</div>
                <h3 class="report-title">${escapeHtml(request.category)}</h3>
                
                <div class="report-body">
                    <div class="elder-card">
                        <img src="${elder?.avatar_url || '/img/profile.png'}" alt="Пожилой">
                        <p><strong>${elder ? escapeHtml(elder.full_name) : 'Не указано'}</strong></p>
                        <a href="#" class="details-link" onclick="showElderDetails('${request.elder_id}'); return false;">Подробнее →</a>
                    </div>
                    
                    <div class="task-table">
                        <div class="task-header">
                            <div></div>
                            <div>Частота выполнения</div>
                            <div>Расписание</div>
                        </div>
                        ${tasksList}
                    </div>
                </div>
                
                ${request.description ? `<p style="margin: 10px 0; color: #666;">${escapeHtml(request.description)}</p>` : ''}
                ${request.address ? `<p style="margin: 10px 0; color: #666;">📍 ${escapeHtml(request.address)}</p>` : ''}
                
                <p class="status">Статус: <span>${getStatusText(request.status)}</span></p>
            </article>
            <button class="respond-btn" data-request-id="${request.id}" ${request.status !== 'open' ? 'disabled style="opacity: 0.5;"' : ''}>
                ${request.status === 'open' ? 'Откликнуться' : getStatusText(request.status)}
            </button>
        </div>
    `;
    
    return row;
}

// Загрузка деталей заявки (родственник и пожилой)
async function loadRequestDetails(requestId) {
    try {
        const requestResponse = await fetchWithAuth(`/api/v1/requests/${requestId}`);
        if (requestResponse.ok) {
            const request = await requestResponse.json();
            
            // Загружаем информацию о родственнике
            let relative = null;
            try {
                const relativeResponse = await fetchWithAuth(`/api/v1/users/${request.relative_id}`);
                if (relativeResponse.ok) {
                    relative = await relativeResponse.json();
                }
            } catch (e) {
                console.error('Ошибка загрузки родственника:', e);
            }
            
            // Загружаем информацию о пожилом
            let elder = null;
            try {
                const elderResponse = await fetchWithAuth(`/api/v1/elders/${request.elder_id}`);
                if (elderResponse.ok) {
                    elder = await elderResponse.json();
                }
            } catch (e) {
                console.error('Ошибка загрузки пожилого:', e);
            }
            
            return { relative, elder };
        }
    } catch (error) {
        console.error('Ошибка загрузки деталей:', error);
    }
    return { relative: null, elder: null };
}

// Настройка кнопок отклика
function setupRespondButtons() {
    const respondButtons = document.querySelectorAll('.respond-btn');
    const headerIcons = document.querySelector('.header-icons');
    
    respondButtons.forEach(btn => {
        // Удаляем старые обработчики
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const requestId = this.dataset.requestId;
            if (!requestId) return;
            
            if (this.disabled) return;
            
            if (!confirm('Вы уверены, что хотите откликнуться на эту заявку?')) {
                return;
            }
            
            const originalText = this.textContent;
            this.textContent = 'Отправка...';
            this.disabled = true;
            
            try {
                // Получаем ID текущего пользователя
                const userId = getUserId();
                if (!userId) {
                    throw new Error('Не удалось получить ID пользователя');
                }
                
                // Откликаемся на заявку
                const response = await fetchWithAuth(`/api/v1/requests/${requestId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        volunteer_id: userId,
                        status: 'in_progress'
                    })
                });
                
                if (response.ok) {
                    this.textContent = 'Отправлено!';
                    this.style.backgroundColor = '#784923ff';
                    
                    // Показываем уведомление
                    showBellNotification(headerIcons);
                    
                    // Перезагружаем список заявок
                    setTimeout(() => {
                        loadAvailableRequests();
                    }, 2000);
                } else {
                    const error = await response.json();
                    alert('Ошибка: ' + (error.detail || 'Не удалось откликнуться на заявку'));
                    this.textContent = originalText;
                    this.disabled = false;
                }
            } catch (error) {
                console.error('Ошибка отклика:', error);
                alert('Ошибка соединения с сервером');
                this.textContent = originalText;
                this.disabled = false;
            }
        });
    });
}

// Показ уведомления
function showBellNotification(headerIcons) {
    if (!headerIcons) return;
    
    let popup = document.getElementById('response-notification-popup');
    
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'response-notification-popup';
        popup.className = 'bell-notification-popup';
        popup.innerHTML = `
            <div>Вы отправили отклик на заявку, ждите пока с вами свяжутся или свяжитесь сами!</div>
        `;
        headerIcons.appendChild(popup);
    }
    
    popup.style.display = 'block';
    
    setTimeout(() => {
        popup.style.display = 'none';
    }, 7000);
    
    popup.onclick = () => popup.style.display = 'none';
}

// Показ деталей родственника
async function showRelativeDetails(userId) {
    try {
        const response = await fetchWithAuth(`/api/v1/users/${userId}`);
        if (response.ok) {
            const user = await response.json();
            const fullName = [user.surname, user.name, user.patronymic].filter(Boolean).join(' ');
            
            alert(`Родственник:\n\nФИО: ${fullName}\nEmail: ${user.email}\nТелефон: ${user.phone_number}`);
        }
    } catch (error) {
        console.error('Ошибка загрузки родственника:', error);
    }
}

// Показ деталей пожилого
async function showElderDetails(elderId) {
    try {
        const response = await fetchWithAuth(`/api/v1/elders/${elderId}`);
        if (response.ok) {
            const elder = await response.json();
            const birthday = elder.birthday ? new Date(elder.birthday).toLocaleDateString('ru-RU') : 'не указано';
            
            const details = `Пожилой человек:\n\nФИО: ${elder.full_name}\nДата рождения: ${birthday}\nСостояние здоровья: ${elder.health_status}\nАдрес: ${elder.address}\nУвлечения: ${elder.hobbies}`;
            alert(details);
        }
    } catch (error) {
        console.error('Ошибка загрузки пожилого:', error);
    }
}

// Вспомогательные функции
function getStatusText(status) {
    const statusMap = {
        'open': 'Открыта',
        'in_progress': 'В работе',
        'done': 'Выполнена'
    };
    return statusMap[status] || status;
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

// Экспорт функций для использования в HTML
window.showRelativeDetails = showRelativeDetails;
window.showElderDetails = showElderDetails;
