document.addEventListener('DOMContentLoaded', function() {
    console.log('rating.js загружен');
    
    // Проверяем авторизацию
    if (!isAuthenticated()) {
        window.location.href = '/input';
        return;
    }
    
    loadRatingTable();
});

async function loadRatingTable() {
    try {
        // Получаем информацию о текущем пользователе
        const userResponse = await fetchWithAuth('/api/v1/users/me');
        if (!userResponse.ok) {
            throw new Error('Не удалось загрузить данные пользователя');
        }
        const currentUser = await userResponse.json();
        
        // Получаем рейтинг волонтеров
        const ratingResponse = await fetchWithAuth('/api/v1/rating/volunteers?limit=10');
        if (!ratingResponse.ok) {
            throw new Error('Не удалось загрузить рейтинг');
        }
        const volunteers = await ratingResponse.json();
        
        displayRatingTable(volunteers, currentUser);
        
    } catch (error) {
        console.error('Ошибка загрузки рейтинга:', error);
        showNotification('Ошибка загрузки рейтинга', 'error');
    }
}

function displayRatingTable(volunteers, currentUser) {
    const ratingBody = document.querySelector('.rating-body');
    if (!ratingBody) return;
    
    ratingBody.innerHTML = '';
    
    volunteers.forEach((volunteer, index) => {
        const rank = index + 1;
        const row = createRatingRow(volunteer, rank, currentUser.id);
        ratingBody.appendChild(row);
    });
}

function createRatingRow(volunteer, rank, currentUserId) {
    const row = document.createElement('div');
    row.className = 'rating-row';
    
    // Определяем стиль строки
    if (volunteer.id === currentUserId) {
        row.classList.add('current-user');
        row.style.backgroundColor = '#FFAD5880'; // Прозрачный оранжевый для текущего пользователя
    } else if (rank <= 3) {
        row.style.backgroundColor = '#FFF7E6'; // Кремовый для первых трех
    }
    
    // Формируем полное имя
    const fullName = [volunteer.surname, volunteer.name, volunteer.patronymic]
        .filter(Boolean)
        .join(' ');
    
    // Определяем аватар
    const avatarUrl = volunteer.avatar_presigned_url || './img/profile.png';
    const avatarHtml = `
        <img src="${avatarUrl}" alt="Аватар" class="avatar" onerror="this.src='./img/profile.png'">
    `;
    
    // Формируем текст благодарностей
    const thanksText = `Помог ${volunteer.thanks_count} ${getThanksWordForm(volunteer.thanks_count)}`;
    
    row.innerHTML = `
        <div class="rank-num">${rank}</div>
        <div class="volunteer-info">
            ${avatarHtml}
            <span class="name">${escapeHtml(fullName)}</span>
        </div>
        <div class="thanks-text">${thanksText}</div>
    `;
    
    return row;
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

styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);