document.addEventListener('DOMContentLoaded', async function() {
    if (!isAuthenticated()) {
        window.location.href = '/input';
        return;
    }
    
    if (!isVolunteer()) {
        alert('Эта страница доступна только волонтерам');
        window.location.href = '/';
        return;
    }
    
    await loadAvailableRequests();
    setupRespondButtons();
});

async function loadAvailableRequests() {
    try {
        const response = await fetchWithAuth('/api/v1/requests/available?limit=40');
        if (response.ok) {
            const requests = await response.json();
            renderRequests(requests);
        } else {
            const errorData = await response.json().catch(() => ({ detail: 'Неизвестная ошибка' }));
            showNotification('Ошибка загрузки заявок: ' + (errorData.detail || 'Попробуйте обновить страницу'), 'error');
            console.error('Ошибка загрузки заявок:', response.status);
        }
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        showNotification('Ошибка соединения с сервером. Проверьте подключение к интернету.', 'error');
    }
}

let isRenderingRequests = false;

async function renderRequests(requests) {
    if (isRenderingRequests) {
        console.log('Рендеринг уже выполняется, пропускаем');
        return;
    }
    
    isRenderingRequests = true;
    
    const requestsList = document.querySelector('.requests-list');
    if (!requestsList) {
        console.error('Контейнер заявок не найден');
        isRenderingRequests = false;
        return;
    }
    
    requestsList.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading-spinner"></div><p>Загрузка заявок...</p></div>';
    
    if (!requests || requests.length === 0) {
        requestsList.innerHTML = '<p style="text-align: center; padding: 40px;">Нет доступных заявок</p>';
        isRenderingRequests = false;
        return;
    }
    
    const uniqueRequests = requests.filter((request, index, self) =>
        index === self.findIndex(r => r.id === request.id)
    );
    
    requestsList.innerHTML = '';
    
    const cardPromises = uniqueRequests.map(async (request, index) => {
        const requestRow = await createRequestCard(request, index + 1);
        return requestRow;
    });
    
    const cards = await Promise.all(cardPromises);
    
    cards.forEach(card => {
        requestsList.appendChild(card);
    });
    
    setupRespondButtons();
    
    isRenderingRequests = false;
}

async function createRequestCard(request, number) {
    const row = document.createElement('div');
    row.className = 'request-row';
    row.dataset.requestId = request.id;
    
    const details = await loadRequestDetails(request.id);
    const relative = details.relative;
    const elder = details.elder;
    
    const scheduledDate = request.scheduled_date ? new Date(request.scheduled_date + 'T00:00:00') : null;
    const dateRange = scheduledDate ? 
        `~ ${scheduledDate.toLocaleDateString('ru-RU')}` : 
        'Дата не указана';
    const timeStr = request.scheduled_time || '-';
    
    const tasksList = request.check_list.map((task, idx) => `
        <div class="task-row-item">
            <div class="task-item">
                ${idx + 1}) ${escapeHtml(task)}
            </div>
            <div class="task-frequency">${request.frequency ? getFrequencyText(request.frequency) : '-'}</div>
            <div class="task-time">${timeStr}</div>
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
                <h3 class="report-title">${escapeHtml(request.task_name)}</h3>
                
                <div class="report-body">
                    <div class="elder-card">
                        <img src="${elder?.avatar_presigned_url || '/img/profile.png'}" alt="Пожилой">
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
                ${request.frequency ? `<p style="margin: 10px 0; color: #666;">🔄 Частота: ${getFrequencyText(request.frequency)}</p>` : ''}
                ${request.is_shopping_checklist ? `<p style="margin: 10px 0; color: #666;">🛒 Чеклист с покупкой</p>` : ''}
                
                <p class="status">Статус: <span>${getStatusText(request.status)}</span></p>
            </article>
            <button class="respond-btn" data-request-id="${request.id}" ${request.status !== 'open' ? 'disabled style="opacity: 0.5;"' : ''}>
                ${request.status === 'open' ? 'Откликнуться' : getStatusText(request.status)}
            </button>
        </div>
    `;
    
    return row;
}

async function loadRequestDetails(requestId) {
    try {
        const requestResponse = await fetchWithAuth(`/api/v1/requests/${requestId}`);
        if (requestResponse.ok) {
            const request = await requestResponse.json();
            
            let relative = null;
            try {
                const relativeResponse = await fetchWithAuth(`/api/v1/users/${request.relative_id}`);
                if (relativeResponse.ok) {
                    relative = await relativeResponse.json();
                }
            } catch (e) {
                console.error('Ошибка загрузки родственника:', e);
            }
            
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

function setupRespondButtons() {
    const respondButtons = document.querySelectorAll('.respond-btn');
    const headerIcons = document.querySelector('.header-icons');
    
    respondButtons.forEach(btn => {
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
                const userId = getUserId();
                if (!userId) {
                    throw new Error('Не удалось получить ID пользователя');
                }
                
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
                    
                    showBellNotification(headerIcons);
                    showNotification('Отклик успешно отправлен!', 'success');
                    
                    setTimeout(() => {
                        loadAvailableRequests();
                    }, 2000);
                } else {
                    const error = await response.json().catch(() => ({ detail: 'Неизвестная ошибка' }));
                    showNotification('Ошибка: ' + (error.detail || 'Не удалось откликнуться на заявку'), 'error');
                    this.textContent = originalText;
                    this.disabled = false;
                }
            } catch (error) {
                console.error('Ошибка отклика:', error);
                showNotification('Ошибка соединения с сервером. Проверьте подключение к интернету.', 'error');
                this.textContent = originalText;
                this.disabled = false;
            }
        });
    });
}

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

async function showRelativeDetails(userId) {
    try {
        const response = await fetchWithAuth(`/api/v1/users/${userId}`);
        if (response.ok) {
            const user = await response.json();
            const fullName = [user.surname, user.name, user.patronymic].filter(Boolean).join(' ');
            
            showDetailsModal('Родственник', {
                'ФИО': fullName,
                'Email': user.email || 'не указан',
                'Телефон': user.phone_number || 'не указан'
            });
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось загрузить данные' }));
            showNotification('Ошибка: ' + (error.detail || 'Не удалось загрузить информацию о родственнике'), 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки родственника:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

async function showElderDetails(elderId) {
    try {
        const response = await fetchWithAuth(`/api/v1/elders/${elderId}`);
        if (response.ok) {
            const elder = await response.json();
            const birthday = elder.birthday ? new Date(elder.birthday).toLocaleDateString('ru-RU') : 'не указано';
            
            showDetailsModal('Пожилой человек', {
                'ФИО': elder.full_name,
                'Дата рождения': birthday,
                'Состояние здоровья': elder.health_status || 'не указано',
                'Адрес': elder.address || 'не указан',
                'Увлечения': elder.hobbies || 'не указаны',
                'Особенности': elder.features || 'не указаны',
                'Заболевания': elder.disease || 'не указаны'
            });
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось загрузить данные' }));
            showNotification('Ошибка: ' + (error.detail || 'Не удалось загрузить информацию о пожилом'), 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки пожилого:', error);
        showNotification('Ошибка соединения с сервером', 'error');
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
    const frequencyMap = {
        'once': 'Единоразово',
        'every_few_hours': 'Раз в несколько часов',
        'daily': 'Ежедневно',
        'weekly': 'Еженедельно',
        'monthly': 'Ежемесячно'
    };
    return frequencyMap[frequency] || frequency;
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

function showDetailsModal(title, details) {
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
                <span style="color: #333;">${escapeHtml(value)}</span>
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
    
    const closeBtn = modalContent.querySelector('#closeDetailsModal');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
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

window.showRelativeDetails = showRelativeDetails;
window.showElderDetails = showElderDetails;
