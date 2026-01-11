document.addEventListener('DOMContentLoaded', function() {
    console.log('thanks_relative.js загружен');
    
    if (!isAuthenticated()) {
        window.location.href = '/input';
        return;
    }
    
    if (!isRelative()) {
        alert('Эта страница доступна только родственникам');
        window.location.href = '/';
        return;
    }
    
    loadVolunteersList();
});

async function loadVolunteersList() {
    try {
        // Получаем список волонтеров с которыми работал родственник
        const response = await fetchWithAuth('/api/v1/thanks/volunteers');
        if (!response.ok) {
            throw new Error('Не удалось загрузить список волонтеров');
        }
        const volunteers = await response.json();
        
        console.log('Загруженные волонтеры:', volunteers);
        
        if (volunteers.length === 0) {
            showEmptyState();
            return;
        }
        
        createVolunteerCards(volunteers);
        
    } catch (error) {
        console.error('Ошибка загрузки волонтеров:', error);
        showError('Ошибка загрузки данных');
    }
}

function createVolunteerCards(volunteers) {
    const container = document.querySelector('.container');
    if (!container) return;
    
    // Удаляем существующий контент
    const existingCard = container.querySelector('.volunteer-card');
    if (existingCard) existingCard.remove();
    
    // Добавляем карточки для каждого волонтера
    volunteers.forEach((volunteer, index) => {
        const card = createVolunteerCard(volunteer, index);
        container.appendChild(card);
    });
}

function createVolunteerCard(volunteer, index) {
    const card = document.createElement('div');
    card.className = 'volunteer-card';
    card.dataset.volunteerId = volunteer.id;
    
    // Форматируем телефон
    const phoneFormatted = formatPhoneNumber(volunteer.phone_number);
    
    card.innerHTML = `
        <div class="card-inner">
            <div class="avatar-block">
                <img src="${volunteer.avatar_presigned_url || './img/profile.png'}" 
                     alt="${volunteer.full_name}" 
                     class="volunteer-avatar"
                     onerror="this.src='./img/profile.png'">
            </div>

            <div class="info-block">
                <div class="info-header">
                    <h2 class="volunteer-name">${escapeHtml(volunteer.full_name)}</h2>
                    <span class="help-stats">Помог <span class="count">${volunteer.request_count}</span> ${getTimesWordForm(volunteer.request_count)}</span>
                </div>

                <div class="details">
                    <p><strong>Город:</strong> ${volunteer.city || 'Не указан'}</p>
                    <p><strong>О себе:</strong> ${volunteer.about || 'Не указано'}</p>
                </div>

                <p class="contact-info"><strong>Контактные данные:</strong> ${phoneFormatted}</p>
            </div>
        </div>

        ${volunteer.is_thanked ? 
            `<button class="btn-thanks disabled" disabled>Поблагодарен ✓</button>` :
            `<button class="btn-thanks" 
                     data-volunteer-id="${volunteer.id}" 
                     data-request-id="${volunteer.last_request_id}">
                Поблагодарить
            </button>`
        }
    `;
    
    // Добавляем обработчик для кнопки, если не поблагодарен
    if (!volunteer.is_thanked) {
        const thanksBtn = card.querySelector('.btn-thanks');
        if (thanksBtn) {
            thanksBtn.addEventListener('click', (e) => {
                const btn = e.target;
                const volunteerId = btn.dataset.volunteerId;
                const requestId = btn.dataset.requestId;
                
                thankVolunteer(volunteerId, requestId, btn, volunteer);
            });
        }
    }
    
    return card;
}

async function thankVolunteer(volunteerId, requestId, buttonElement, volunteerData) {
    try {
        // Блокируем кнопку
        buttonElement.disabled = true;
        buttonElement.textContent = 'Отправка...';
        buttonElement.classList.add('disabled');
        
        // Отправляем благодарность
        const response = await fetchWithAuth('/api/v1/thanks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to_user_id: volunteerId,
                request_id: requestId
            })
        });
        
        if (response.ok) {
            // Обновляем кнопку
            buttonElement.textContent = 'Поблагодарен ✓';
            buttonElement.classList.add('disabled');
            buttonElement.style.backgroundColor = '#4CAF50';
            
            // Обновляем счетчик у всех карточек этого волонтера
            updateVolunteerCount(volunteerId, volunteerData.request_count + 1);
            
            showSuccess('Волонтер успешно поблагодарен!');
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось поблагодарить' }));
            showError('Ошибка: ' + (error.detail || 'Не удалось поблагодарить'));
            
            // Разблокируем кнопку
            buttonElement.disabled = false;
            buttonElement.textContent = 'Поблагодарить';
            buttonElement.classList.remove('disabled');
        }
    } catch (error) {
        console.error('Ошибка при отправке благодарности:', error);
        showError('Ошибка соединения с сервером');
        
        // Разблокируем кнопку
        if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.textContent = 'Поблагодарить';
            buttonElement.classList.remove('disabled');
        }
    }
}

function updateVolunteerCount(volunteerId, newCount) {
    // Находим все карточки этого волонтера
    const volunteerCards = document.querySelectorAll(`[data-volunteer-id="${volunteerId}"]`);
    
    volunteerCards.forEach(card => {
        const countElement = card.querySelector('.help-stats .count');
        if (countElement) {
            countElement.textContent = newCount;
            
            // Обновляем форму слова
            const helpStatsElement = card.querySelector('.help-stats');
            if (helpStatsElement) {
                helpStatsElement.innerHTML = `Помог <span class="count">${newCount}</span> ${getTimesWordForm(newCount)}`;
            }
        }
    });
}

// Остальные функции оставляем как были:
function getTimesWordForm(count) {
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
    
    if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
        const countryCode = cleaned.startsWith('7') ? '+7' : '8';
        const rest = cleaned.slice(1);
        
        if (rest.length === 10) {
            return `${countryCode} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 8)} ${rest.slice(8)}`;
        }
    }
    
    return phone;
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

function showEmptyState() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyStyle(emptyState);
    
    emptyState.innerHTML = `
        <h2 class="page-title">Поблагодарить волонтеров</h2>
        <div class="empty-message">
            <p style="font-size: 18px; color: #5A3C1E; margin-bottom: 10px;">У вас еще нет завершенных заявок</p>
            <p style="color: #8B7355;">Как только волонтеры завершат ваши заявки, они появятся здесь</p>
            <a href="requests" class="back-link" style="display: inline-block; margin-top: 20px; color: #A66B3B; text-decoration: none; font-weight: bold;">
                ← Вернуться к заявкам
            </a>
        </div>
    `;
    
    container.appendChild(emptyState);
}

function emptyStyle(element) {
    element.style.cssText = `
        text-align: center;
        padding: 60px 20px;
        background: #FFF9F0;
        border-radius: 20px;
        border: 2px dashed #E8A75D;
        margin-top: 40px;
    `;
}

function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: #4CAF50;
        color: white;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: #f44336;
        color: white;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}