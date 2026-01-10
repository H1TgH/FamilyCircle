window.authHeader = null;

function getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

let isLoadingElders = false;
let eldersList = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('elderProfile.js загружен');
    
    initializePage();
    setupAvatarUpload();
});

function initializePage() {
    if (!isAuthenticated()) {
        console.log('Пользователь не авторизован');
        return;
    }

    const isProfilePage = window.location.pathname.includes('profile');
    if (!isProfilePage) return;
    
    console.log('Страница профиля обнаружена');
    
    loadUserProfile();
    loadElders();
    setupElderForm();
    setupEventListeners();
}

function isAuthenticated() {
    return !!localStorage.getItem('access_token');
}

async function fetchWithAuth(url, options = {}) {
    const accessToken = localStorage.getItem('access_token');
    
    if (!options.headers) {
        options.headers = {};
    }
    
    if (accessToken) {
        options.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    if (!options.headers['Content-Type'] && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }
    
    let response = await fetch(url, options);
    
    if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            const newAccessToken = localStorage.getItem('access_token');
            options.headers['Authorization'] = `Bearer ${newAccessToken}`;
            response = await fetch(url, options);
        } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/input';
            throw new Error('Требуется повторная авторизация');
        }
    }
    
    return response;
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;
    
    try {
        const response = await fetch('/api/v1/users/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Ошибка обновления токена:', error);
        return false;
    }
}

function setupVolunteerProfile() {
    // Скрываем элементы, специфичные для родственников
    const addButton = document.getElementById('showFormBtn');
    const relativesList = document.getElementById('relativesList');
    const formContainer = document.getElementById('relativeFormContainer');
    
    if (addButton) addButton.style.display = 'none';
    if (relativesList) relativesList.style.display = 'none';
    if (formContainer) formContainer.style.display = 'none';
    
    // Добавляем кнопку редактирования в секцию профиля
    const profileSection = document.querySelector('.profile-section');
    if (profileSection) {
        const editButton = document.createElement('button');
        editButton.className = 'edit-profile-btn';
        editButton.innerHTML = '<img src="./img/edit.svg" alt="Редактировать" style="width:20px;height:20px;">';
        editButton.style.cssText = `
            position: absolute;
            right: 20px;
            bottom: 20px;
            background: #FFF7E6;
            border: 1px solid #AF6425;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        `;
        
        editButton.addEventListener('click', showEditProfileForm);
        profileSection.style.position = 'relative';
        profileSection.appendChild(editButton);
    }
    
    // Обновляем отображение дополнительных полей волонтера
    updateVolunteerProfileUI();
}

function setupRelativeProfile() {
    // Все как было для родственников
    const addButton = document.getElementById('showFormBtn');
    if (addButton) addButton.style.display = 'block';
    
    loadElders();
}

function updateVolunteerProfileUI() {
    // Поля для отображения города, адреса и информации о себе
    // (это уже частично реализовано в updateProfileUI)
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
        <div class="modal-content" style="background: white; padding: 30px; border-radius: 10px; width: 400px; max-width: 90%;">
            <h3 style="margin-top: 0;">Редактировать профиль</h3>
            <form id="editProfileForm">
                <div class="form-group">
                    <label>Фамилия:</label>
                    <input type="text" id="edit-surname" required>
                </div>
                <div class="form-group">
                    <label>Имя:</label>
                    <input type="text" id="edit-name" required>
                </div>
                <div class="form-group">
                    <label>Отчество:</label>
                    <input type="text" id="edit-patronymic">
                </div>
                <div class="form-group">
                    <label>Телефон:</label>
                    <input type="tel" id="edit-phone" required>
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" id="edit-email" required>
                </div>
                <div class="form-group">
                    <label>Дата рождения:</label>
                    <input type="date" id="edit-birthday">
                </div>
                <div class="form-group">
                    <label>Город:</label>
                    <input type="text" id="edit-city">
                </div>
                <div class="form-group">
                    <label>Адрес:</label>
                    <input type="text" id="edit-address">
                </div>
                <div class="form-group">
                    <label>О себе:</label>
                    <textarea id="edit-about" rows="3"></textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" class="cancel-btn" id="cancelEditBtn">Отмена</button>
                    <button type="submit" class="save-btn">Сохранить</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Заполняем форму текущими данными
    fetchUserDataForEdit();
    
    // Обработчики событий
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateUserProfile();
        modal.remove();
    });
    
    // Закрытие по клику вне модального окна
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
            document.getElementById('edit-email').value = user.email || '';
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
        console.error('Ошибка загрузки данных для редактирования:', error);
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
        email: document.getElementById('edit-email').value.trim(),
        city: document.getElementById('edit-city').value.trim(),
        address: document.getElementById('edit-address').value.trim(),
        about: document.getElementById('edit-about').value.trim()
    };
    
    const birthday = document.getElementById('edit-birthday').value;
    if (birthday) {
        data.birthday = birthday;
    }
    
    // Добавляем данные в formData
    for (const [key, value] of Object.entries(data)) {
        if (value) {
            formData.append(key, value);
        }
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
        console.error('Ошибка обновления профиля:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

async function loadUserProfile() {
    try {
        const response = await fetchWithAuth('/api/v1/users/me');
        if (response.ok) {
            const user = await response.json();
            updateProfileUI(user);
            
            if (user.role === 'volunteer') {
                setupVolunteerProfile();
            } else {
                setupRelativeProfile();
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
}

function formatPhoneNumber(phone) {
    if (!phone) return 'Не указан';
    
    // Убираем все нецифровые символы
    const cleaned = phone.replace(/\D/g, '');
    
    // Форматируем российский номер
    if (cleaned.length === 11 && cleaned.startsWith('7') || cleaned.startsWith('8')) {
        const countryCode = cleaned.startsWith('7') ? '+7' : '8';
        const rest = cleaned.slice(1);
        
        // Формат: +7 912 194 63 65
        if (rest.length === 10) {
            return `${countryCode} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 8)} ${rest.slice(8)}`;
        }
    }
    
    // Если номер не соответствует формату, возвращаем как есть
    return phone;
}

// Обновите функцию updateProfileUI:
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
    
    // Обновляем контактные данные
    const contactsElement = document.getElementById('userContacts');
    if (contactsElement) {
        let contactsHTML = 'Контактные данные:';
        
        if (user.phone_number) {
            const formattedPhone = formatPhoneNumber(user.phone_number);
            contactsHTML += ` ${formattedPhone}`;
        }
        
        contactsElement.innerHTML = contactsHTML;
    }

    const aboutElement = document.getElementById('userAbout');
    if (aboutElement && (user.birthday || user.address || user.about)) {
        let aboutHTML = 'О себе:';
        
        if (user.address) {
            aboutHTML += `<br>Адрес: ${user.address}`;
        }
        
        if (user.about) {
            aboutHTML += `<br>О себе: ${user.about}`;
        }
        
        aboutElement.innerHTML = aboutHTML;
    }
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
        console.error('Ошибка загрузки аватара:', error);
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
        console.error('Не найдены необходимые элементы');
        return;
    }

    elderForm.addEventListener('submit', handleElderFormSubmit);
    showFormBtn.addEventListener('click', showElderForm);
    cancelFormBtn.addEventListener('click', hideElderForm);
    
    const avatarInput = document.getElementById('elder-avatar-upload');
    const avatarPreview = document.getElementById('elderAvatarPreview');
    
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    avatarPreview.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
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
    if (!formData.healthStatus.trim()) errors.push('Состояние здоровья обязательно для заполнения');
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
        healthStatus: document.getElementById('healthStatus').value.trim(),
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
        console.error('Ошибка при работе с пожилым:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        elderForm.classList.remove('submitting');
    }
}

async function loadElders() {
    if (isLoadingElders) {
        console.log('Загрузка уже выполняется, пропускаем');
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
            console.warn('Не авторизован');
            showNotification('Сессия истекла. Пожалуйста, войдите заново.', 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки пожилых:', error);
        showNotification('Ошибка загрузки данных. Попробуйте обновить страницу.', 'error');
        updateEmptyListState();
    } finally {
        isLoadingElders = false;
    }
}

function addElderToList(elderData) {
    if (!eldersList) {
        console.warn('Элемент eldersList не найден');
        return;
    }

    const existingCard = eldersList.querySelector(`.elder-card[data-id="${elderData.id}"]`);
    if (existingCard) {
        console.log('Карточка с ID', elderData.id, 'уже существует, пропускаем');
        return;
    }

    const displayData = {
        id: elderData.id,
        fullName: elderData.full_name || elderData.fullName || 'Не указано',
        birthYear: convertDateToDisplayFormat(elderData.birthday || elderData.birthYear),
        healthStatus: elderData.health_status || elderData.healthStatus || 'Не указано',
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
                <div class="elder-header-left">
                    ${avatarHtml}
                    <h3 class="elder-name">${escapeHtml(displayData.fullName)}</h3>
                </div>
                <div class="elder-actions">
                    <button class="edit-btn" data-id="${displayData.id}">
                        <img class="elder-card-edit" src="./img/edit.svg" alt="Редактировать" id="edit-avatar-preview">
                    </button>
                    <button class="delete-btn" data-id="${displayData.id}">
                        <img class="elder-card-delete" src="./img/trash.svg" alt="Удалить" id="edit-avatar-preview">
                    </button>
                </div>
            </div>
            
            <div class="elder-info-grid">
                <div class="info-row">
                    <span class="info-label">Дата рождения:</span>
                    <span class="info-value">${escapeHtml(displayData.birthYear)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Состояние здоровья:</span>
                    <span class="info-value">${escapeHtml(displayData.healthStatus)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Физические ограничения:</span>
                    <span class="info-value">${escapeHtml(displayData.physicalLimitations)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Заболевания:</span>
                    <span class="info-value">${escapeHtml(displayData.diseases)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Адрес проживания:</span>
                    <span class="info-value">${escapeHtml(displayData.address)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Особенности:</span>
                    <span class="info-value">${escapeHtml(displayData.features)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Увлечения:</span>
                    <span class="info-value">${escapeHtml(displayData.hobbies)}</span>
                </div>
            </div>
            
            ${displayData.comment ? `
            <div class="elder-comment">
                <span class="comment-label">Комментарий:</span>
                <span class="comment-text">${escapeHtml(displayData.comment)}</span>
            </div>
            ` : ''}
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
            healthStatus: elderData.health_status || 'Не указано',
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
            ? `<img class="elder-avatar-edit" src="${escapeHtml(currentData.avatarUrl)}" alt="Аватар" id="edit-avatar-preview" onerror="this.src='./img/profile.png'">`
            : `<img class="elder-avatar-edit" src="./img/profile.png" alt="Аватар" id="edit-avatar-preview">`;
        
        elderCard.innerHTML = `
            <div class="elder-card-content">
                <form class="relative-form editing-form-inline" data-elder-id="${elderId}">
                    <div class="relative-card-content">
                        <div class="avatar_photo small">
                            <label for="edit-elder-avatar-upload">
                                ${avatarHtml}
                            </label>
                            <input id="edit-elder-avatar-upload" type="file" accept="image/*" class="avatar-input" />
                        </div>
                        <div class="form-fields-wrapper">
                            <div class="form-group">
                                <label for="edit-fullName">ФИО:*</label>
                                <input type="text" id="edit-fullName" value="${escapeHtml(currentData.fullName)}" required placeholder="Введите ФИО">
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="edit-birthYear">Дата рождения:*</label>
                                    <input type="text" id="edit-birthYear" value="${escapeHtml(currentData.birthYear)}" required placeholder="16.11.1960">
                                </div>

                                <div class="form-group">
                                    <label for="edit-healthStatus">Состояние здоровья:*</label>
                                    <input type="text" id="edit-healthStatus" value="${escapeHtml(currentData.healthStatus)}" required
                                        placeholder="Например: хорошее">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="edit-physicalLimitations">Физические ограничения:</label>
                                    <input type="text" id="edit-physicalLimitations" value="${escapeHtml(currentData.physicalLimitations)}"
                                        placeholder="Например: нет">
                                </div>

                                <div class="form-group">
                                    <label for="edit-diseases">Заболевания:*</label>
                                    <input type="text" id="edit-diseases" value="${escapeHtml(currentData.diseases)}" required
                                        placeholder="Например: здоровая">
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="edit-address">Адрес проживания:*</label>
                                <input type="text" id="edit-address" value="${escapeHtml(currentData.address)}" required
                                    placeholder="г. Екатеринбург, ул.Бебеля 170, кв 30">
                            </div>

                            <div class="form-group">
                                <label for="edit-features">Особенности:*</label>
                                <input type="text" id="edit-features" value="${escapeHtml(currentData.features)}" required placeholder="-">
                            </div>

                            <div class="form-group">
                                <label for="edit-hobbies">Увлечения:*</label>
                                <input type="text" id="edit-hobbies" value="${escapeHtml(currentData.hobbies)}" required placeholder="вязание">
                            </div>

                            <div class="form-group">
                                <label for="edit-comment">Комментарий:</label>
                                <textarea id="edit-comment" rows="2"
                                    placeholder="Дополнительная информация">${escapeHtml(currentData.comment)}</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="cancel-btn cancel-edit-btn">Отмена</button>
                        <button type="submit" class="save-btn">Сохранить изменения</button>
                    </div>
                </form>
            </div>
        `;
        
        const form = elderCard.querySelector('.relative-form');
        const cancelBtn = elderCard.querySelector('.cancel-edit-btn');
        const avatarInput = elderCard.querySelector('#edit-elder-avatar-upload');
        const avatarPreview = elderCard.querySelector('#edit-avatar-preview');
        
        if (avatarInput && avatarPreview) {
            avatarInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        avatarPreview.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleEditSubmit(elderId);
        });
        
        cancelBtn.addEventListener('click', async function() {
            elderCard.classList.remove('editing');
            await loadElders();
        });
        
    } catch (error) {
        console.error('Ошибка при редактировании:', error);
        showNotification('Ошибка при загрузке данных: ' + error.message, 'error');
    }
}

async function handleEditSubmit(elderId) {
    const formData = {
        fullName: document.getElementById('edit-fullName').value.trim(),
        birthYear: document.getElementById('edit-birthYear').value.trim(),
        healthStatus: document.getElementById('edit-healthStatus').value.trim(),
        physicalLimitations: document.getElementById('edit-physicalLimitations').value.trim(),
        diseases: document.getElementById('edit-diseases').value.trim(),
        address: document.getElementById('edit-address').value.trim(),
        features: document.getElementById('edit-features').value.trim(),
        hobbies: document.getElementById('edit-hobbies').value.trim(),
        comment: document.getElementById('edit-comment').value.trim()
    };
    
    const errors = validateElderForm(formData);
    if (errors.length > 0) {
        showNotification('Пожалуйста, заполните все обязательные поля:\n' + errors.join('\n'), 'error');
        return;
    }
    
    const avatarInput = document.getElementById('edit-elder-avatar-upload');
    const avatarFile = avatarInput && avatarInput.files.length > 0 ? avatarInput.files[0] : null;
    
    try {
        const success = await updateElder(elderId, formData, avatarFile);
        if (success) {
            await loadElders();
        }
    } catch (error) {
        console.error('Ошибка при обновлении:', error);
        showNotification('Ошибка при обновлении данных: ' + error.message, 'error');
        const elderCard = document.querySelector(`.elder-card[data-id="${elderId}"]`);
        if (elderCard) {
            elderCard.classList.remove('editing');
            await loadElders();
        }
    }
}

async function createElder(formData, avatarFile) {
    const formDataToSend = new FormData();
    
    formDataToSend.append('full_name', formData.fullName);
    formDataToSend.append('birthday', convertDateToApiFormat(formData.birthYear));
    formDataToSend.append('health_status', formData.healthStatus);
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
        console.error('Ошибка при создании пожилого:', error);
        throw error;
    }
}

async function updateElder(elderId, formData, avatarFile) {
    const formDataToSend = new FormData();
    
    formDataToSend.append('full_name', formData.fullName);
    formDataToSend.append('birthday', convertDateToApiFormat(formData.birthYear));
    formDataToSend.append('health_status', formData.healthStatus);
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
        console.error('Ошибка при обновлении пожилого:', error);
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
        console.error('Ошибка при удалении:', error);
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