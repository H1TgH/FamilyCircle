let isLoadingElders = false;
let eldersList = null;
let elders = [];
let currentUserRole = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) return;

    const isProfilePage = window.location.pathname.includes('profile');
    if (!isProfilePage) return;

    initializePage();
    setupAvatarUpload();
});

function initializePage() {
    if (!isAuthenticated()) return;
    if (!window.location.pathname.includes('profile')) return;

    loadUserProfile();
    setupEditButton();

    const role = getUserRole();
    currentUserRole = role;

    if (role === 'relative') {
        initRelativeProfile();
        document.getElementById('relativesSection').style.display = 'block';
        document.getElementById('volunteerRequestsSection').style.display = 'none';
    }

    if (role === 'volunteer') {
        loadProfileCssForVolunteer();

        initVolunteerProfile();
        document.getElementById('relativesSection').style.display = 'none';
        document.getElementById('volunteerRequestsSection').style.display = 'block';

        loadVolunteerRequests();
    }
}

function loadProfileCssForVolunteer() {
    const cssFiles = [
        '/css/zaivka.css',
        '/css/style_zaivka.css'
    ];

    cssFiles.forEach(href => {
        if (document.querySelector(`link[href="${href}"]`)) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    });
}

function initRelativeProfile() {
    loadElders();
    setupElderForm();
    setupEventListeners();
}

function initVolunteerProfile() {
    hideRelativeUI();
    loadVolunteerRequests();
}

function hideRelativeUI() {
    const showFormBtn = document.getElementById('showFormBtn');
    const formContainer = document.getElementById('relativeFormContainer');
    const eldersList = document.getElementById('relativesList');
    const emptyState = document.getElementById('emptyState');

    if (showFormBtn) showFormBtn.remove();
    if (formContainer) formContainer.remove();
    if (eldersList) eldersList.remove();
    if (emptyState) emptyState.remove();
}

async function loadVolunteerRequests() {
    const container = document.getElementById('cardsContainer');
    if (!container) return;
    
    try {
        let response;
        if (currentUserRole === 'relative') {
            response = await fetchWithAuth('/api/v1/requests/me?limit=30');
        } else {
            response = await fetchWithAuth('/api/v1/requests/volunteer/me');
        }
        
        if (!response.ok) {
            showNotification('Ошибка загрузки заявок', 'error');
            return;
        }

        const requests = await response.json();
        
        renderVolunteerRequestsForProfile(requests);
        
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        showNotification('Ошибка соединения', 'error');
        if (container) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #f44336;">Ошибка загрузки заявок</p>';
        }
    }
}

function renderCards(requests) {
    const container = document.getElementById('cardsContainer');
    if (!container) {
        console.error('Контейнер карточек не найден');
        return;
    }
    
    container.innerHTML = '';
    
    if (requests.length === 0) {
        if (currentUserRole === 'relative') {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px;">
                    <p style="color: #666; font-size: 18px;">У вас пока нет заявок</p>
                    <p style="color: #999; margin-top: 10px;">Нажмите "Создать чек-лист", чтобы создать первую заявку</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px;">
                    <p style="color: #666; font-size: 18px;">Нет доступных заявок</p>
                    <p style="color: #999; margin-top: 10px;">На данный момент нет заявок, на которые вы откликнулись</p>
                </div>
            `;
        }
        return;
    }
    
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
    
    if (doneRequests.length > 0) {
        const doneContainer = document.createElement('div');
        doneContainer.className = 'done-requests-container';
        doneContainer.style.cssText = `
            width: 100%;
            max-width: 1200px;
            margin-top: 40px;
            border-top: 2px solid #eee;
            padding-top: 30px;
        `;
        
        const doneTitle = document.createElement('h3');
        doneTitle.textContent = 'Завершенные заявки';
        doneTitle.style.cssText = 'color: #666; margin-bottom: 20px;';
        doneContainer.appendChild(doneTitle);
        
        doneRequests.forEach(request => {
            createCard(request, doneContainer, true);
        });
        
        container.appendChild(doneContainer);
    }
}

function renderVolunteerRequestsForProfile(requests) {
    renderCards(requests);
}

function renderVolunteerRequests(requests) {
    const container = document.getElementById('volunteerRequests');
    if (!container) return;

    container.innerHTML = '';

    if (!requests.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #666;">
                <p style="font-size: 18px;">У вас пока нет активных заявок</p>
                <p style="color: #999; margin-top: 10px;">Здесь будут отображаться заявки, на которые вы откликнулись</p>
            </div>
        `;
        return;
    }

    const openRequests = requests.filter(r => r.status !== 'done');
    const doneRequests = requests.filter(r => r.status === 'done');

    const activeContainer = document.createElement('div');
    activeContainer.className = 'requests-container';
    activeContainer.style.cssText = 'width: 100%;';

    if (openRequests.length > 0) {
        openRequests.forEach(request => {
            createCard(request, activeContainer, false);
        });
    }

    if (doneRequests.length > 0) {
        const doneContainer = document.createElement('div');
        doneContainer.className = 'done-requests-container';
        doneContainer.style.cssText = `
            width: 100%;
            margin-top: 40px;
            border-top: 2px solid #eee;
            padding-top: 30px;
        `;
        
        const doneTitle = document.createElement('h3');
        doneTitle.textContent = 'Завершенные заявки';
        doneTitle.style.cssText = 'color: #666; margin-bottom: 20px;';
        doneContainer.appendChild(doneTitle);
        
        doneRequests.forEach(request => {
            createCard(request, doneContainer, true);
        });
        
        container.appendChild(activeContainer);
        container.appendChild(doneContainer);
    } else {
        container.appendChild(activeContainer);
    }
}

function setupEditButton() {
    const profileSection = document.querySelector('.profile-section');
    if (!profileSection) return;
    
    if (profileSection.querySelector('.edit-profile-btn')) return;
    
    const editButton = document.createElement('button');
    editButton.className = 'edit-profile-btn';
    editButton.innerHTML = '<img src="./img/edit.svg" alt="Редактировать" style="width:20px;height:20px;">';
    editButton.style.cssText = `
        position: absolute;
        background: #FFFFFF;
        right: 30px;
        border: none;
        bottom: 20px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10;
    `;
    
    editButton.addEventListener('click', showEditProfileForm);
    profileSection.style.position = 'relative';
    profileSection.appendChild(editButton);
}

function getStatusText(status) {
    const statusMap = {
        'open': 'Не в работе',
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

function createCard(request, container, isDoneSection) {
    const card = document.createElement('div');
    card.className = 'request-card';
    if (request.status === 'done' || isDoneSection) {
        card.classList.add('done');
    }
    card.dataset.id = request.id;
    card.dataset.status = request.status;
    
    let elderName = 'Неизвестно';
    let avatarUrl = './img/profile.png';
    let relativeName = 'Неизвестно';
    let relativeAvatarUrl = './img/profile.png';
    let volunteerName = '';
    let volunteerAvatarUrl = './img/profile.png';
    
    if (request.elder) {
        elderName = request.elder.full_name || 'Неизвестно';
        avatarUrl = request.elder.avatar_presigned_url || './img/profile.png';
    }
    
    if (request.relative && currentUserRole === 'volunteer') {
        relativeName = request.relative.full_name || 'Неизвестно';
        relativeAvatarUrl = request.relative.avatar_presigned_url || './img/profile.png';
    }
    
    if (request.volunteer && (currentUserRole === 'relative' || currentUserRole === 'volunteer')) {
        volunteerName = request.volunteer.full_name || '';
        volunteerAvatarUrl = request.volunteer.avatar_presigned_url || './img/profile.png';
    }
    
    const menuContent = currentUserRole === 'relative' 
        ? (request.status === 'done' 
            ? `<button class="action-item" onclick="reopenCard('${request.id}')">Открыть снова</button>`
            : `<button class="action-item" onclick="editCard('${request.id}')">Изменить</button>
               <button class="action-item" onclick="deleteCard('${request.id}')">Удалить</button>
               <button class="action-item" onclick="closeCard('${request.id}')">Закрыть</button>`)
        : '';
    
    const statusText = getStatusText(request.status);
    
    const showRightSection = true;
    
    const durationText = request.duration_value ? 
        `~ ${request.duration_value} ${getDurationUnitText(request.duration_unit)}` : 
        '';
    
    const tasksTableRows = request.tasks.map((task, index) => {
        const frequencyText = task.frequency ? getFrequencyText(task.frequency) : 'Единоразово';
        
        let scheduleText = '';
        if (task.scheduled_date || task.scheduled_time) {
            if (task.scheduled_date) {
                scheduleText += new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString('ru-RU');
            }
            if (task.scheduled_time) {
                const timeParts = task.scheduled_time.split(':');
                const formattedTime = timeParts.slice(0, 2).join(':');
                if (scheduleText) scheduleText += ' ';
                scheduleText += formattedTime;
            }
        } else {
            scheduleText = '-';
        }
        
        return `
            <div class="task-table-row">
                <div class="task-number-cell">
                    <div class="task-number">${index + 1}) ${escapeHtml(task.task_name)}</div>
                    ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
                </div>
                <div class="task-frequency-cell">${frequencyText}</div>
                <div class="task-schedule-cell">${scheduleText}</div>
            </div>
        `;
    }).join('');
    
    let cardContent = '';
    
    if (currentUserRole === 'relative') {
        cardContent = `
            <div class="card-header-section">
                <div class="card-top-row">
                    <h3 class="card-checklist-name">${escapeHtml(request.checklist_name)}</h3>
                    ${durationText ? `
                        <div class="card-duration-badge">
                            ${durationText}
                        </div>
                    ` : ''}
                </div>
                
                <div class="card-content-row">
                    <div class="elder-info-section">
                        <div class="elder-avatar-container">
                            <img src="${avatarUrl}" alt="Аватар пожилого" class="elder-avatar" onerror="this.src='./img/profile.png'">
                        </div>
                        <div class="elder-text-info">
                            <div class="elder-name">${escapeHtml(elderName)}</div>
                            <a href="#" class="view-details-link" onclick="showElderDetails('${request.elder_id}'); return false;">Подробнее</a>
                        </div>
                    </div>
                    
                    <div class="tasks-table-section">
                        <div class="task-table-header">
                            <div class="task-number-header"> </div>
                            <div class="task-frequency-header">Частота выполнения</div>
                            <div class="task-schedule-header">Расписание</div>
                        </div>
                        
                        <div class="task-table-body">
                            ${tasksTableRows}
                        </div>
                    </div>
                </div>
                
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
                        ${request.status === 'in_progress' && volunteerName ? `
                            <div class="volunteer-info" style="margin-top: 12px; border-top: 1px solid #F1CBA8; padding-top: 12px;">
                                <div class="volunteer-avatar-container" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                    <img src="${volunteerAvatarUrl}" alt="Аватар волонтера" style="width: 40px; color: black; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #F1CBA8;" onerror="this.src='./img/profile.png'">
                                    <div style="font-weight: bold; font-size: 14px;">${escapeHtml(volunteerName)}</div>
                                </div>
                                <button class="view-volunteer-details" onclick="showVolunteerDetails('${request.volunteer_id}')" style="background: none; border: none; color: #985D3C; font-size: 12px; cursor: pointer; text-decoration: underline; padding: 0;">
                                    Подробнее
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    ${request.status !== 'done' ? `
                        <button class="responses-btn" onclick="showResponses('${request.id}')">
                            Отклики
                        </button>
                    ` : ''}
                ` : ''}
            </div>
            ${currentUserRole === 'relative' ? `
                <button class="card-actions-gear" onclick="toggleActionMenu(this, '${request.id}', '${request.status}')">
                    <i class="fas fa-cog"></i>
                </button>
                <div class="action-menu">
                    ${menuContent}
                </div>
            ` : ''}
        `;
    } else {
        cardContent = `
            <div class="card-header-section">
                <div class="card-top-row">
                    <h3 class="card-checklist-name">${escapeHtml(request.checklist_name)}</h3>
                    ${durationText ? `
                        <div class="card-duration-badge">
                            ${durationText}
                        </div>
                    ` : ''}
                </div>
                
                <div class="card-content-row volunteer-card-content">
                    <div class="relative-info-section">
                        <div class="relative-avatar-container">
                            <img src="${relativeAvatarUrl}" alt="Аватар родственника" class="relative-avatar" onerror="this.src='./img/profile.png'">
                        </div>
                        <div class="relative-text-info">
                            <div class="relative-name">${escapeHtml(relativeName)}</div>
                            <div class="relative-role">Родственник</div>
                        </div>
                    </div>
                    
                    <div class="elder-info-section volunteer-elder-section">
                        <div class="elder-avatar-container">
                            <img src="${avatarUrl}" alt="Аватар пожилого" class="elder-avatar" onerror="this.src='./img/profile.png'">
                        </div>
                        <div class="elder-text-info">
                            <div class="elder-name">${escapeHtml(elderName)}</div>
                            <a href="#" class="view-details-link" onclick="showElderDetails('${request.elder_id}'); return false;">Подробнее</a>
                        </div>
                    </div>
                    
                    <div class="tasks-table-section volunteer-tasks-section">
                        <div class="task-table-header">
                            <div class="task-frequency-header">Частота</div>
                            <div class="task-schedule-header">Расписание</div>
                        </div>
                        
                        <div class="task-table-body">
                            ${tasksTableRows}
                        </div>
                    </div>
                </div>
                
                <div class="card-bottom-info">
                    ${request.is_shopping_checklist ? `
                        <div class="card-comment shopping-badge">
                            <strong>Чеклист с покупкой</strong>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="card-right-section volunteer-right-section">
                <div class="status-container">
                    <div class="status-text">
                        ${statusText}
                    </div>
                    ${request.status === 'in_progress' && volunteerName && currentUserRole === 'volunteer' ? `
                        <div class="volunteer-info" style="margin-top: 12px; border-top: 1px solid #F1CBA8; padding-top: 12px;">
                            <div class="volunteer-avatar-container" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <img src="${volunteerAvatarUrl}" alt="Аватар волонтера" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #F1CBA8;" onerror="this.src='./img/profile.png'">
                                <div style="font-weight: bold; font-size: 14px;">${escapeHtml(volunteerName)}</div>
                            </div>
                            <div style="font-size: 12px; color: #666;">Назначенный волонтер</div>
                        </div>
                    ` : ''}
                </div>
                ${request.status === 'open' ? `
                    <button class="respond-btn" onclick="respondToRequest('${request.id}')">
                        Откликнуться
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    card.innerHTML = cardContent;
    container.appendChild(card);
}

function getStatusText(status) {
    const statusMap = {
        'open': 'Не в работе',
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

function showEditProfileForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 30px; border-radius: 10px; width: 400px; max-width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="margin-top: 0; margin-bottom: 20px; color: #985D3C;">Редактировать профиль</h3>
            <form id="editProfileForm">
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Фамилия:</label>
                    <input type="text" id="edit-surname" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Имя:</label>
                    <input type="text" id="edit-name" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Отчество:</label>
                    <input type="text" id="edit-patronymic" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Телефон:</label>
                    <input type="tel" id="edit-phone" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Дата рождения:</label>
                    <input type="date" id="edit-birthday" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Город:</label>
                    <input type="text" id="edit-city" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Адрес:</label>
                    <input type="text" id="edit-address" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">О себе:</label>
                    <textarea id="edit-about" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" class="cancel-btn" id="cancelEditBtn" style="padding: 10px 20px; background: #FFF7E6; color: #985D3C; border: 1px solid #AF6425; border-radius: 5px; cursor: pointer; font-weight: 500;">Отмена</button>
                    <button type="submit" class="save-btn" style="padding: 10px 20px; background: #985D3C; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 500;">Сохранить</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    fetchUserDataForEdit();
    
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateUserProfile();
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function fetchUserDataForEdit() {
    try {
        const response = await fetchWithAuth('/api/v1/users/me');
        if (response.ok) {
            const user = await response.json();
            
            document.getElementById('edit-surname').value = user.surname || '';
            document.getElementById('edit-name').value = user.name || '';
            document.getElementById('edit-patronymic').value = user.patronymic || '';
            document.getElementById('edit-phone').value = user.phone_number || '';
            document.getElementById('edit-city').value = user.city || '';
            document.getElementById('edit-address').value = user.address || '';
            document.getElementById('edit-about').value = user.about || '';
            
            if (user.birthday) {
                const date = new Date(user.birthday);
                const formattedDate = date.toISOString().split('T')[0];
                document.getElementById('edit-birthday').value = formattedDate;
            }
        }
    } catch (error) {
        showNotification('Ошибка загрузки данных', 'error');
    }
}

async function updateUserProfile() {
    const formData = new FormData();
    
    const data = {
        surname: document.getElementById('edit-surname').value.trim(),
        name: document.getElementById('edit-name').value.trim(),
        patronymic: document.getElementById('edit-patronymic').value.trim(),
        phone_number: document.getElementById('edit-phone').value.trim(),
        city: document.getElementById('edit-city').value.trim(),
        address: document.getElementById('edit-address').value.trim(),
        about: document.getElementById('edit-about').value.trim(),
    };
    
    for (const [key, value] of Object.entries(data)) {
        if (value && value.trim() !== '') {
            formData.append(key, value);
        }
    }
    
    const birthday = document.getElementById('edit-birthday').value;
    if (birthday && birthday.trim() !== '') {
        formData.append('birthday', birthday);
    }
    
    try {
        const response = await fetchWithAuth('/api/v1/users/me', {
            method: 'PATCH',
            body: formData
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            updateProfileUI(updatedUser);
            showNotification('Профиль обновлен!', 'success');
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Ошибка обновления профиля', 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения', 'error');
    }
}

async function loadUserProfile() {
    const response = await fetchWithAuth('/api/v1/users/me');
    if (response.ok) {
        const user = await response.json();
        updateProfileUI(user);
        
        const userRole = getUserRole();
        if (userRole === 'volunteer') {
            await loadThanksCount(user.id);
        }
    }
}

async function loadThanksCount(userId) {
    const response = await fetchWithAuth(`/api/v1/thanks/user/${userId}/count`);
    if (response.ok) {
        const thanksData = await response.json();
        displayThanksCount(thanksData.thanks_count);
    }
}

function displayThanksCount(count) {
    const profileSection = document.querySelector('.profile-section');
    if (!profileSection) return;
    
    let thanksCounter = profileSection.querySelector('.thanks-counter');
    
    if (!thanksCounter) {
        thanksCounter = document.createElement('div');
        thanksCounter.className = 'thanks-counter';
        thanksCounter.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: #FFE5B4;
            border: 2px solid #AF6425;
            border-radius: 10px;
            padding: 8px 16px;
            font-weight: bold;
            color: #5A3C1E;
            font-size: 16px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        `;
        
        const infoElement = profileSection.querySelector('.info');
        if (infoElement) {
            infoElement.style.position = 'relative';
            infoElement.appendChild(thanksCounter);
        }
    }
    
    thanksCounter.textContent = `Помог ${count} ${getThanksWordForm(count)}`;
}

function getThanksWordForm(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'раз';
    } else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
        return 'раза';
    } else {
        return 'раз';
    }
}

function formatPhoneNumber(phone) {
    if (!phone) return 'Не указан';
    
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11 && cleaned.startsWith('7') || cleaned.startsWith('8')) {
        const countryCode = cleaned.startsWith('7') ? '+7' : '8';
        const rest = cleaned.slice(1);
        
        if (rest.length === 10) {
            return `${countryCode} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 8)} ${rest.slice(8)}`;
        }
    }
    
    return phone;
}

function updateProfileUI(user) {
    const nameElement = document.querySelector('.profile-section .name');
    if (nameElement) {
        const fullName = [user.surname, user.name, user.patronymic]
            .filter(Boolean)
            .join(' ');
        nameElement.textContent = fullName;
    }
    
    const avatarImg = document.querySelector('.profile-section .avatar');
    if (avatarImg && user.avatar_presigned_url) {
        avatarImg.src = user.avatar_presigned_url;
        avatarImg.onerror = function() {
            this.src = './img/profile.png';
        };
    }

    const contactsElement = document.getElementById('userContacts');
    if (contactsElement) {
        let contactsHTML = '';
        
        if (user.phone_number) {
            const formattedPhone = formatPhoneNumber(user.phone_number);
            contactsHTML += `Контактные данные: ${formattedPhone}`;
        }
        
        if (!contactsHTML) {
            contactsHTML = 'Контактные данные не указаны';
        }
        
        contactsElement.innerHTML = contactsHTML;
    }

    const aboutElement = document.getElementById('userAbout');
    if (aboutElement) {
        let aboutHTML = '';
        
        if (user.city) {
            if (aboutHTML) aboutHTML += '<br><br>';
            aboutHTML += `Город: ${user.city}`;
        }
        
        if (user.about) {
            if (aboutHTML) aboutHTML += '<br><br>';
            aboutHTML += `О себе: ${user.about}`;
        }
        
        if (!aboutHTML) {
            aboutHTML += `О себе:`;
        }
        
        aboutElement.innerHTML = aboutHTML;
    }
    
    addLogoutButton();
}

function addLogoutButton() {
    const infoElement = document.querySelector('.profile-section .info');
    if (!infoElement) return;
    
    if (infoElement.querySelector('.logout-profile-btn')) return;
    
    const logoutButton = document.createElement('button');
    logoutButton.className = 'logout-profile-btn';
    logoutButton.innerHTML = `
        <i class="fas fa-sign-out-alt"></i> Выйти
    `;
    logoutButton.style.cssText = `
        margin-top: 20px;
        padding: 10px 20px;
        color: #000000ff;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-family: "Montserrat", sans-serif;
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
    `;
    
    logoutButton.addEventListener('click', function() {
        if (confirm('Вы действительно хотите выйти?')) {
            logout();
        }
    });
    
    infoElement.appendChild(logoutButton);
}

function setupAvatarUpload() {
    const avatarInput = document.getElementById('avatar-upload');
    const avatarLabel = document.querySelector('.profile-section label[for="avatar-upload"]');
    
    if (!avatarInput || !avatarLabel) return;
    
    avatarInput.addEventListener('change', async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showNotification('Пожалуйста, выберите изображение', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Размер файла не должен превышать 5MB', 'error');
            return;
        }
        
        const success = await updateUserAvatar(file);
        if (success) {
            avatarInput.value = '';
        }
    });
    
    avatarLabel.addEventListener('click', function(event) {
        event.preventDefault();
        avatarInput.click();
    });
}

async function updateUserAvatar(file) {
    if (!file) return false;
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const response = await fetchWithAuth('/api/v1/users/me', {
            method: 'PATCH',
            body: formData
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            showNotification('Аватар обновлен!', 'success');
            
            const avatarImg = document.querySelector('.profile-section .avatar');
            if (avatarImg && updatedUser.avatar_presigned_url) {
                avatarImg.src = updatedUser.avatar_presigned_url + '?t=' + Date.now();
            }
            
            return true;
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Ошибка обновления аватара', 'error');
            return false;
        }
    } catch (error) {
        showNotification('Ошибка соединения', 'error');
        return false;
    }
}

function setupElderForm() {
    const showFormBtn = document.getElementById('showFormBtn');
    const formContainer = document.getElementById('relativeFormContainer');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const elderForm = document.getElementById('relativeForm');
    eldersList = document.getElementById('relativesList');

    if (!showFormBtn || !formContainer || !cancelFormBtn || !elderForm) {
        return;
    }

    elderForm.addEventListener('submit', handleElderFormSubmit);
    showFormBtn.addEventListener('click', showElderForm);
    cancelFormBtn.addEventListener('click', hideElderForm);
}

function setupEventListeners() {
    document.addEventListener('keydown', function(event) {
        const formContainer = document.getElementById('relativeFormContainer');
        if (event.key === 'Escape' && formContainer && formContainer.style.display === 'block') {
            hideElderForm();
        }
    });
}

function showElderForm() {
    const formContainer = document.getElementById('relativeFormContainer');
    const showFormBtn = document.getElementById('showFormBtn');
    if (formContainer && showFormBtn) {
        formContainer.style.display = 'block';
        showFormBtn.style.display = 'none';
        document.getElementById('fullName').focus();
    }
}

function hideElderForm() {
    const formContainer = document.getElementById('relativeFormContainer');
    const showFormBtn = document.getElementById('showFormBtn');
    if (formContainer && showFormBtn) {
        formContainer.style.display = 'none';
        showFormBtn.style.display = 'block';
        
        const elderForm = document.getElementById('relativeForm');
        if (elderForm) {
            elderForm.reset();
            delete elderForm.dataset.editId;
        }
    }
}

function validateElderForm(formData) {
    const errors = [];
    
    if (!formData.fullName.trim()) errors.push('ФИО обязательно для заполнения');
    if (!formData.birthYear.trim()) errors.push('Дата рождения обязательна для заполнения');
    if (!formData.diseases.trim()) errors.push('Заболевания обязательны для заполнения');
    if (!formData.address.trim()) errors.push('Адрес проживания обязателен для заполнения');
    if (!formData.features.trim()) errors.push('Особенности обязательны для заполнения');
    if (!formData.hobbies.trim()) errors.push('Увлечения обязательны для заполнения');
    
    return errors;
}

async function handleElderFormSubmit(event) {
    event.preventDefault();
    
    const elderForm = event.target;
    
    if (elderForm.classList.contains('submitting')) return;
    elderForm.classList.add('submitting');
    
    const formData = {
        fullName: document.getElementById('fullName').value.trim(),
        birthYear: document.getElementById('birthYear').value.trim(),
        physicalLimitations: document.getElementById('physicalLimitations').value.trim(),
        diseases: document.getElementById('diseases').value.trim(),
        address: document.getElementById('address').value.trim(),
        features: document.getElementById('features').value.trim(),
        hobbies: document.getElementById('hobbies').value.trim(),
        comment: document.getElementById('comment').value.trim()
    };
    
    const errors = validateElderForm(formData);
    if (errors.length > 0) {
        showNotification('Пожалуйста, заполните все обязательные поля:\n' + errors.join('\n'), 'error');
        elderForm.classList.remove('submitting');
        return;
    }
    
    const saveBtn = elderForm.querySelector('.save-btn');
    const originalText = saveBtn.textContent;
    const isEditMode = elderForm.dataset.editId;
    
    const avatarInput = document.getElementById('elder-avatar-upload');
    const avatarFile = avatarInput && avatarInput.files.length > 0 ? avatarInput.files[0] : null;
    
    saveBtn.textContent = isEditMode ? 'Обновление...' : 'Сохранение...';
    saveBtn.disabled = true;
    
    try {
        const success = isEditMode 
            ? await updateElder(elderForm.dataset.editId, formData, avatarFile)
            : await createElder(formData, avatarFile);
        
        if (success) {
            await loadElders();
            hideElderForm();
        }
    } catch (error) {
        showNotification('Ошибка: ' + error.message, 'error');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        elderForm.classList.remove('submitting');
    }
}

async function loadElders() {
    if (isLoadingElders) {
        return;
    }
    
    isLoadingElders = true;
    
    try {
        const response = await fetchWithAuth('/api/v1/elders/me');
        
        if (response.ok) {
            const elders = await response.json();
            
            if (eldersList) {
                const cards = eldersList.querySelectorAll('.elder-card');
                cards.forEach(card => card.remove());
            }
            
            if (Array.isArray(elders) && elders.length > 0) {
                const uniqueElders = elders.filter((elder, index, self) =>
                    index === self.findIndex(e => e.id === elder.id)
                );
                
                uniqueElders.forEach(elder => {
                    addElderToList(elder);
                });
            } else {
                updateEmptyListState();
            }
            
        } else if (response.status === 401) {
            showNotification('Сессия истекла. Пожалуйста, войдите заново.', 'error');
        }
    } catch (error) {
        showNotification('Ошибка загрузки данных. Попробуйте обновить страницу.', 'error');
        updateEmptyListState();
    } finally {
        isLoadingElders = false;
    }
}

function addElderToList(elderData) {
    if (!eldersList) {
        return;
    }

    const existingCard = eldersList.querySelector(`.elder-card[data-id="${elderData.id}"]`);
    if (existingCard) {
        return;
    }

    const displayData = {
        id: elderData.id,
        fullName: elderData.full_name || elderData.fullName || 'Не указано',
        birthYear: convertDateToDisplayFormat(elderData.birthday || elderData.birthYear),
        physicalLimitations: elderData.physical_limitations || elderData.physicalLimitations || 'нет',
        diseases: elderData.disease || elderData.diseases || 'Не указано',
        address: elderData.address || 'Не указан',
        features: elderData.features || 'Не указано',
        hobbies: elderData.hobbies || 'Не указано',
        comment: elderData.comments || elderData.comment || '',
        avatarUrl: elderData.avatar_presigned_url || null
    };

    const elderCard = document.createElement('div');
    elderCard.className = 'elder-card';
    elderCard.dataset.id = displayData.id;
    
    const avatarHtml = displayData.avatarUrl 
        ? `<img class="elder-avatar" src="${escapeHtml(displayData.avatarUrl)}" alt="Аватар" onerror="this.src='./img/profile.png'">`
        : `<img class="elder-avatar" src="./img/profile.png" alt="Аватар">`;
    
    elderCard.innerHTML = `
        <div class="elder-card-content">
            <div class="elder-header">
                <div class="elder-main-info">
                    <div class="elder-avatar-wrapper">
                        ${avatarHtml}
                    </div>
                    <div class="elder-primary-info">
                        <div class="primary-info-row">
                            <span class="primary-label"></span>
                            <span class="primary-value elder-name">${escapeHtml(displayData.fullName)}</span>
                        </div>
                        <div class="primary-info-row">
                            <span class="primary-label">Дата рождения:</span>
                            <span class="primary-value">${escapeHtml(displayData.birthYear)}</span>
                        </div>
                        <div class="health-details">
                            <div class="health-detail">
                                <span class="primary-label">Состояние здоровья</span>
                                <span class="detail-label">Физические ограничения:</span>
                                <span class="detail-value">${escapeHtml(displayData.physicalLimitations)};</span>
                            </div>
                            <div class="health-detail diseases-container">
                                <span class="detail-label">Заболевания:</span>
                                <span class="detail-value">${escapeHtml(displayData.diseases)}</span>
                            </div>
                        </div>
                        <div class="primary-info-row">
                            <span class="primary-label">Адрес проживания:</span>
                            <span class="primary-value">${escapeHtml(displayData.address)}</span>
                        </div>
                    </div>
                </div>
                <div class="elder-actions">
                    <button class="edit-btn" data-id="${displayData.id}">
                        <img class="elder-card-edit" src="./img/edit.svg" alt="Редактировать">
                    </button>
                    <button class="delete-btn" data-id="${displayData.id}">
                        <img class="elder-card-delete" src="./img/trash.svg" alt="Удалить">
                    </button>
                </div>
            </div>
            
            <div class="elder-secondary-info">
                <div class="secondary-info-row">
                    <span class="secondary-label">Особенности:</span>
                    <span class="secondary-value">${escapeHtml(displayData.features)}</span>
                </div>
                <div class="secondary-info-row">
                    <span class="secondary-label">Увлечения:</span>
                    <span class="secondary-value">${escapeHtml(displayData.hobbies)}</span>
                </div>
                <div class="secondary-info-row comment-row">
                    <span class="secondary-label">Комментарий:</span>
                    <span class="secondary-value">${escapeHtml(displayData.comment)}</span>
                </div>
            </div>
        </div>
    `;
    
    eldersList.appendChild(elderCard);
    attachElderCardEvents(elderCard);
    updateEmptyListState();
}

function attachElderCardEvents(card) {
    const editBtn = card.querySelector('.edit-btn');
    const deleteBtn = card.querySelector('.delete-btn');
    
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            const elderId = this.getAttribute('data-id');
            editElder(elderId);
        });
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            const elderId = this.getAttribute('data-id');
            deleteElder(elderId);
        });
    }
}

function updateEmptyListState() {
    const emptyState = document.getElementById('emptyState');
    if (!eldersList || !emptyState) return;
    
    const hasCards = eldersList.querySelectorAll('.elder-card').length > 0;
    emptyState.style.display = hasCards ? 'none' : 'block';
}

async function editElder(elderId) {
    try {
        const allForms = document.querySelectorAll('.editing-form');
        allForms.forEach(form => {
            const cardId = form.dataset.elderId;
            if (cardId) {
                const card = document.querySelector(`.elder-card[data-id="${cardId}"]`);
                if (card && !card.classList.contains('editing')) {
                    card.style.display = '';
                }
            }
            form.remove();
        });
        
        const elderCard = document.querySelector(`.elder-card[data-id="${elderId}"]`);
        if (!elderCard) {
            throw new Error('Карточка не найдена');
        }
        
        const response = await fetchWithAuth(`/api/v1/elders/${elderId}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить данные');
        }
        const elderData = await response.json();
        
        const currentData = {
            fullName: elderData.full_name || 'Не указано',
            birthYear: convertDateToDisplayFormat(elderData.birthday),
            physicalLimitations: elderData.physical_limitations || 'нет',
            diseases: elderData.disease || 'Не указано',
            address: elderData.address || 'Не указан',
            features: elderData.features || 'Не указано',
            hobbies: elderData.hobbies || 'Не указано',
            comment: elderData.comments || '',
            avatarUrl: elderData.avatar_presigned_url || null
        };
        
        elderCard.classList.add('editing');
        
        const avatarHtml = currentData.avatarUrl 
            ? `<img class="elder-avatar" src="${escapeHtml(currentData.avatarUrl)}" alt="Аватар" onerror="this.src='./img/profile.png'">`
            : `<img class="elder-avatar" src="./img/profile.png" alt="Аватар">`;
        
        elderCard.innerHTML = `
            <div class="elder-card-content editing-form" data-elder-id="${elderId}">
                <div class="elder-header">
                    <div class="elder-main-info">
                        <div class="elder-avatar-wrapper">
                            <label for="edit-elder-avatar-upload">
                                ${avatarHtml}
                            </label>
                            <input id="edit-elder-avatar-upload" type="file" accept="image/*" class="avatar-input" style="display: none;" />
                        </div>
                        <div class="elder-primary-info">
                            <div class="primary-info-row">
                                <span class="primary-label"></span>
                                <input type="text" class="elder-name-input" value="${escapeHtml(currentData.fullName)}" placeholder="ФИО" required>
                            </div>
                            <div class="primary-info-row">
                                <span class="primary-label">Дата рождения:</span>
                                <input type="text" class="primary-value-input" value="${escapeHtml(currentData.birthYear)}" placeholder="16.11.1960" required>
                            </div>
                            <div class="health-details">
                                <div class="health-detail">
                                    <span class="detail-label">Физические ограничения:</span>
                                    <input type="text" class="detail-value-input" value="${escapeHtml(currentData.physicalLimitations)}" placeholder="нет">
                                </div>
                                <div class="health-detail diseases-container">
                                    <span class="detail-label">Заболевания:</span>
                                    <input type="text" class="detail-value-input" value="${escapeHtml(currentData.diseases)}" placeholder="Не указано" required>
                                </div>
                            </div>
                            <div class="primary-info-row">
                                <span class="primary-label">Адрес проживания:</span>
                                <input type="text" class="primary-value-input" value="${escapeHtml(currentData.address)}" placeholder="Не указан" required>
                            </div>
                        </div>
                    </div>
                    <div class="elder-actions">
                        <button type="submit" class="save-edit-btn" data-id="${elderId}">
                            <img src="./img/save.svg" alt="Сохранить">
                        </button>
                        <button type="button" class="cancel-edit-btn" data-id="${elderId}">
                            <img src="./img/cancel.svg" alt="Отмена">
                        </button>
                    </div>
                </div>
                
                <div class="elder-secondary-info">
                    <div class="secondary-info-row">
                        <span class="secondary-label">Особенности:</span>
                        <input type="text" class="secondary-value-input" value="${escapeHtml(currentData.features)}" placeholder="Не указано" required>
                    </div>
                    <div class="secondary-info-row">
                        <span class="secondary-label">Увлечения:</span>
                        <input type="text" class="secondary-value-input" value="${escapeHtml(currentData.hobbies)}" placeholder="Не указано" required>
                    </div>
                    <div class="secondary-info-row comment-row">
                        <span class="secondary-label">Комментарий:</span>
                        <textarea class="secondary-value-textarea" rows="2" placeholder="Дополнительная информация">${escapeHtml(currentData.comment)}</textarea>
                    </div>
                </div>
            </div>
        `;
        
        const saveBtn = elderCard.querySelector('.save-edit-btn');
        const cancelBtn = elderCard.querySelector('.cancel-edit-btn');
        const avatarInput = elderCard.querySelector('#edit-elder-avatar-upload');
        
        saveBtn.addEventListener('click', async function() {
            await handleEditSubmit(elderId);
        });
        
        cancelBtn.addEventListener('click', async function() {
            elderCard.classList.remove('editing');
            await loadElders();
        });
        
        avatarInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const avatarImg = elderCard.querySelector('.elder-avatar');
                    if (avatarImg) {
                        avatarImg.src = e.target.result;
                    }
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
        
        const avatarLabel = elderCard.querySelector('.elder-avatar-wrapper label');
        if (avatarLabel) {
            avatarLabel.addEventListener('click', function(e) {
                e.preventDefault();
                avatarInput.click();
            });
        }
        
    } catch (error) {
        showNotification('Ошибка при загрузке данных: ' + error.message, 'error');
    }
}

async function respondToRequest(requestId) {
    try {
        const response = await fetchWithAuth('/api/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                request_id: requestId
            })
        });
        
        if (response.ok) {
            showNotification('Вы успешно откликнулись на заявку!', 'success');
            loadVolunteerRequests();
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось откликнуться' }));
            showNotification('Ошибка: ' + (error.detail || 'Не удалось откликнуться'), 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

async function handleEditSubmit(elderId) {
    const elderCard = document.querySelector(`.elder-card[data-id="${elderId}"]`);
    if (!elderCard) return;
    
    const formData = {
        fullName: elderCard.querySelector('.elder-name-input').value.trim(),
        birthYear: elderCard.querySelector('.primary-value-input').value.trim(),
        physicalLimitations: elderCard.querySelector('.health-detail:first-child .detail-value-input').value.trim(),
        diseases: elderCard.querySelector('.diseases-container .detail-value-input').value.trim(),
        address: elderCard.querySelector('.primary-info-row:last-child .primary-value-input').value.trim(),
        features: elderCard.querySelector('.secondary-info-row:first-child .secondary-value-input').value.trim(),
        hobbies: elderCard.querySelector('.secondary-info-row:nth-child(2) .secondary-value-input').value.trim(),
        comment: elderCard.querySelector('.secondary-value-textarea').value.trim()
    };
    
    const errors = validateElderForm(formData);
    if (errors.length > 0) {
        showNotification('Пожалуйста, заполните все обязательные поля:\n' + errors.join('\n'), 'error');
        return;
    }
    
    const avatarInput = elderCard.querySelector('#edit-elder-avatar-upload');
    const avatarFile = avatarInput && avatarInput.files.length > 0 ? avatarInput.files[0] : null;
    
    try {
        const success = await updateElder(elderId, formData, avatarFile);
        if (success) {
            await loadElders();
        }
    } catch (error) {
        showNotification('Ошибка при обновлении данных: ' + error.message, 'error');
        elderCard.classList.remove('editing');
        await loadElders();
    }
}

async function createElder(formData, avatarFile) {
    const formDataToSend = new FormData();
    
    formDataToSend.append('full_name', formData.fullName);
    formDataToSend.append('birthday', convertDateToApiFormat(formData.birthYear));
    formDataToSend.append('health_status', 'хорошее');
    formDataToSend.append('physical_limitations', formData.physicalLimitations);
    formDataToSend.append('disease', formData.diseases);
    formDataToSend.append('address', formData.address);
    formDataToSend.append('features', formData.features);
    formDataToSend.append('hobbies', formData.hobbies);
    formDataToSend.append('comments', formData.comment);
    
    if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
    }
    
    try {
        const response = await fetchWithAuth('/api/v1/elders', {
            method: 'POST',
            body: formDataToSend
        });
        
        if (response.ok) {
            showNotification('Пожилой успешно добавлен!', 'success');
            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        throw error;
    }
}

async function updateElder(elderId, formData, avatarFile) {
    const formDataToSend = new FormData();
    
    formDataToSend.append('full_name', formData.fullName);
    formDataToSend.append('birthday', convertDateToApiFormat(formData.birthYear));
    formDataToSend.append('health_status', 'хорошее');
    formDataToSend.append('physical_limitations', formData.physicalLimitations);
    formDataToSend.append('disease', formData.diseases);
    formDataToSend.append('address', formData.address);
    formDataToSend.append('features', formData.features);
    formDataToSend.append('hobbies', formData.hobbies);
    formDataToSend.append('comments', formData.comment);
    
    if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
    }
    
    try {
        const response = await fetchWithAuth(`/api/v1/elders/${elderId}`, {
            method: 'PATCH',
            body: formDataToSend
        });
        
        if (response.ok) {
            showNotification('Пожилой успешно обновлен!', 'success');
            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        throw error;
    }
}

async function deleteElder(elderId) {
    if (!confirm('Вы уверены, что хотите удалить этого пожилого?')) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`/api/v1/elders/${elderId}`, {
            method: 'DELETE'
        });
        
        if (response.ok || response.status === 204) {
            const card = eldersList.querySelector(`.elder-card[data-id="${elderId}"]`);
            if (card) card.remove();
            showNotification('Пожилой успешно удален!', 'success');
            updateEmptyListState();
        } else if (response.status === 400) {
            const errorData = await response.json();
            
            if (errorData.detail?.includes("existing requests")) {
                showNotification('Невозможно удалить пожилого с активными заявками', 'error');
            } else {
                throw new Error(errorData.detail || 'Не удалось удалить пожилого');
            }
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        showNotification('Ошибка при удалении: ' + error.message, 'error');
    }
}

function convertDateToDisplayFormat(dateString) {
    if (dateString && dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return `${parts[2]}.${parts[1]}.${parts[0]}`;
        }
    }
    return dateString || 'не указана';
}

function convertDateToApiFormat(dateString) {
    if (dateString.includes('.')) {
        const parts = dateString.split('.');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
    }
    return dateString;
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
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

window.respondToRequest = respondToRequest;
window.showElderDetails = showElderDetails;
